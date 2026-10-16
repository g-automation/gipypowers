import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'core/cli.js');

function run(project, ...args) {
  return execFileSync('node', [CLI, ...args, '--root', project], {
    cwd: project,
    encoding: 'utf8',
  }).trim();
}

test('CLI persists searchable memory, restores task state, and reports its version', () => {
  const project = mkdtempSync(join(tmpdir(), 'gipypowers-cli-'));
  try {
    run(project, 'memory', 'init');
    const added = JSON.parse(
      run(
        project,
        'memory',
        'add',
        '--id',
        'session-revocation',
        '--type',
        'decision',
        '--title',
        'Session revocation',
        '--source',
        'validated auth review',
        '--tags',
        'auth,security',
        '--content',
        'Revoke sessions after account deactivation.',
      ),
    );
    assert.equal(added.id, 'session-revocation');
    assert.match(
      run(project, 'memory', 'search', '--query', 'session revocation'),
      /Revoke sessions/,
    );

    run(project, 'task', 'begin', '--id', 'cli-task', '--route', 'feature');
    run(
      project,
      'task',
      'checkpoint',
      '--status',
      'implementing',
      '--summary',
      'Added session policy',
      '--next',
      'Run focused tests',
    );
    const state = JSON.parse(run(project, 'task', 'show'));
    assert.equal(state.status, 'implementing');
    assert.equal(state.next, 'Run focused tests');
    assert.equal(run(project, 'task', 'complete'), '{\n  "cleared": true\n}');
    assert.equal(run(project, 'version'), '1.0.1');
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('CLI update command reaches the shared host-aware checker', () => {
  const project = mkdtempSync(join(tmpdir(), 'gipypowers-cli-update-'));
  try {
    const output = execFileSync(
      'node',
      [CLI, 'update', 'check', '--root', project, '--plugin-root', ROOT],
      {
        cwd: project,
        env: { ...process.env, GIPYPOWERS_NO_UPDATE_CHECK: '1' },
        encoding: 'utf8',
      },
    );
    assert.equal(JSON.parse(output).status, 'disabled');
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('CLI startup updater exits without host calls when release checks are disabled', () => {
  const project = mkdtempSync(join(tmpdir(), 'gipypowers-cli-update-startup-'));
  try {
    const output = execFileSync(
      'node',
      [
        CLI,
        'update',
        'startup',
        '--host',
        'codex',
        '--root',
        project,
        '--plugin-root',
        ROOT,
      ],
      {
        cwd: project,
        env: { ...process.env, GIPYPOWERS_NO_UPDATE_CHECK: '1' },
        encoding: 'utf8',
      },
    );
    assert.deepEqual(JSON.parse(output), {
      status: 'disabled',
      notice: '',
    });
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
