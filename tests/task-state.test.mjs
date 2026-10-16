import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  beginTask,
  checkpointTask,
  completeTask,
  readTaskState,
  recordTaskFailure,
} from '../core/task-state.js';

test('task checkpoints restore compact progress and completion clears it', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-task-'));
  try {
    beginTask(root, { id: 'session-1', route: 'feature' });
    checkpointTask(root, {
      status: 'implementing',
      summary: 'Added validation for account IDs.',
      next: 'Run the focused account tests.',
      files: ['src/account.js', 'tests/account.test.js'],
    });
    assert.equal(readTaskState(root).status, 'implementing');
    assert.equal(readTaskState(root).next, 'Run the focused account tests.');
    completeTask(root);
    assert.equal(readTaskState(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task state permits at most two retries for an identical failure', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-recovery-'));
  try {
    beginTask(root, { id: 'session-2', route: 'bug' });
    const first = recordTaskFailure(root, {
      signature: 'AssertionError: expected 2 results',
      summary: 'Focused regression assertion still fails.',
    });
    const second = recordTaskFailure(root, {
      signature: 'AssertionError: expected 2 results',
      summary: 'Adjusted implementation; assertion still fails.',
    });
    const third = recordTaskFailure(root, {
      signature: 'AssertionError: expected 2 results',
      summary: 'Second recovery attempt did not change the result.',
    });
    assert.equal(first.shouldRetry, true);
    assert.equal(second.shouldRetry, true);
    assert.equal(third.shouldRetry, false);
    assert.equal(third.changeStrategy, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task checkpoints reject credentials and raw logs', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-task-safety-'));
  try {
    beginTask(root, { id: 'session-safe', route: 'feature' });
    assert.throws(
      () =>
        checkpointTask(root, {
          status: 'implementing',
          summary: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456',
          next: 'Continue',
        }),
      /sensitive value/i,
    );
    assert.throws(
      () =>
        checkpointTask(root, {
          status: 'implementing',
          summary:
            'Traceback (most recent call last):\n  at module.load (/tmp/a.js)',
          next: 'Continue',
        }),
      /raw log/i,
    );
    assert.equal(readTaskState(root).summary, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('restoration drops credential-bearing or oversized project task state', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-task-restore-'));
  try {
    const file = join(root, '.gipypowers', 'state', 'current.json');
    mkdirSync(join(root, '.gipypowers', 'state'), { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: 1,
        id: 'task-1',
        status: 'implementing',
        summary: 'Bearer abcdefghijklmnopqrstuvwxyz123456',
        next: 'Continue',
      }),
    );
    assert.equal(readTaskState(root), null);
    writeFileSync(file, ' '.repeat(32 * 1024 + 1));
    assert.equal(readTaskState(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('task persistence refuses symlinked state directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-task-link-'));
  const outside = mkdtempSync(join(tmpdir(), 'gipypowers-task-outside-'));
  try {
    mkdirSync(join(root, '.gipypowers'));
    symlinkSync(outside, join(root, '.gipypowers', 'state'), 'dir');
    assert.throws(
      () => beginTask(root, { id: 'session-safe', route: 'feature' }),
      /symlink/i,
    );
    assert.equal(existsSync(join(outside, 'current.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
