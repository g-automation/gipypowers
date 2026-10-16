import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  archiveMemoryEntry,
  createMemoryEntry,
  deleteMemoryEntry,
  exportMemory,
  initializeMemory,
  listMemoryEntries,
  reindexMemory,
  readMemoryEntry,
  reviseMemoryEntry,
  searchMemory,
} from '../core/memory.js';

function project() {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-memory-'));
  initializeMemory(root);
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('memory stores Markdown pages with provenance and generated index', () => {
  const p = project();
  try {
    const entry = createMemoryEntry(
      p.root,
      {
        id: 'postgres-over-sqlite',
        type: 'decision',
        title: 'Use Postgres for shared state',
        source: 'user-approved requirement',
        confidence: 'user-approved',
        tags: ['database', 'deployment'],
      },
      'Use Postgres because deployments already provide it.',
    );
    assert.equal(entry.version, 1);
    assert.equal(entry.status, 'active');
    assert.equal(listMemoryEntries(p.root).length, 1);
    assert.match(
      readMemoryEntry(p.root, entry.id).body,
      /deployments already provide it/,
    );
  } finally {
    p.cleanup();
  }
});

test('memory search returns relevant pages within count and character bounds', () => {
  const p = project();
  try {
    createMemoryEntry(
      p.root,
      {
        id: 'postgres-deployment',
        type: 'decision',
        title: 'Postgres deployment',
        source: 'validated deployment review',
        tags: ['database'],
      },
      'Production uses Postgres in the deployment environment.',
    );
    createMemoryEntry(
      p.root,
      {
        id: 'typescript-style',
        type: 'preference',
        title: 'TypeScript style',
        source: 'user-approved preference',
        tags: ['typescript'],
      },
      'Prefer narrow types and explicit return values.',
    );

    const results = searchMemory(p.root, 'Postgres deployment', {
      limit: 1,
      maxChars: 240,
    });
    assert.equal(results.entries.length, 1);
    assert.equal(results.entries[0].id, 'postgres-deployment');
    assert.ok(results.context.length <= 240);
  } finally {
    p.cleanup();
  }
});

test('memory revisions use optimistic versions and preserve revision history', () => {
  const p = project();
  try {
    const entry = createMemoryEntry(
      p.root,
      {
        id: 'auth-session-policy',
        type: 'decision',
        title: 'Session authentication policy',
        source: 'validated design review',
      },
      'Use signed session cookies.',
    );
    const revised = reviseMemoryEntry(
      p.root,
      entry.id,
      1,
      'Use short-lived signed cookies with server-side revocation.',
      'security review',
    );
    assert.equal(revised.version, 2);
    assert.throws(
      () => reviseMemoryEntry(p.root, entry.id, 1, 'stale rewrite', 'old task'),
      /conflict.*current version is 2/i,
    );
    assert.match(readMemoryEntry(p.root, entry.id).history, /version 1/i);
  } finally {
    p.cleanup();
  }
});

test('memory rejects secret-like values and raw logs before writing', () => {
  const p = project();
  try {
    assert.throws(
      () =>
        createMemoryEntry(
          p.root,
          {
            id: 'credential',
            type: 'lesson',
            title: 'Credential result',
            source: 'debugging',
          },
          'Use token=ghp_abcdefghijklmnopqrstuvwxyz0123456789 in production.',
        ),
      /sensitive value/i,
    );
    assert.throws(
      () =>
        createMemoryEntry(
          p.root,
          {
            id: 'raw-stack',
            type: 'failure',
            title: 'Raw error output',
            source: 'test log',
          },
          'x'.repeat(9000),
        ),
      /character limit/i,
    );
    assert.equal(listMemoryEntries(p.root).length, 0);
  } finally {
    p.cleanup();
  }
});

test('memory initialization refuses symlinked project storage directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-memory-link-'));
  const outside = mkdtempSync(join(tmpdir(), 'gipypowers-memory-outside-'));
  try {
    mkdirSync(join(root, '.gipypowers'));
    symlinkSync(outside, join(root, '.gipypowers', 'memory'), 'dir');
    assert.throws(() => initializeMemory(root), /symlink/i);
    assert.equal(existsSync(join(outside, 'entries')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('memory archives, deletes, and exports Markdown pages', () => {
  const p = project();
  try {
    const entry = createMemoryEntry(
      p.root,
      {
        id: 'old-cache-choice',
        type: 'decision',
        title: 'Old cache choice',
        source: 'architecture decision',
      },
      'Keep the cache in process memory.',
    );
    archiveMemoryEntry(p.root, entry.id, 'Replaced by persistent storage.');
    assert.equal(searchMemory(p.root, 'cache', {}).entries.length, 0);
    assert.equal(
      listMemoryEntries(p.root, { includeArchived: true })[0].status,
      'archived',
    );
    assert.match(exportMemory(p.root), /Old cache choice/);
    deleteMemoryEntry(p.root, entry.id);
    assert.equal(
      listMemoryEntries(p.root, { includeArchived: true }).length,
      0,
    );
  } finally {
    p.cleanup();
  }
});

test('reindex rebuilds portable metadata and exact duplicate facts are rejected', () => {
  const p = project();
  try {
    createMemoryEntry(
      p.root,
      {
        id: 'shared-test-command',
        type: 'decision',
        title: 'Shared test command',
        source: 'validated repository workflow',
      },
      'Run node --test to execute the repository tests.',
    );
    assert.throws(
      () =>
        createMemoryEntry(
          p.root,
          {
            id: 'test-command-copy',
            type: 'lesson',
            title: 'Test command duplicate',
            source: 'completed task',
          },
          'Run node --test to execute the repository tests.',
        ),
      /duplicate memory content.*shared-test-command/i,
    );
    assert.equal(reindexMemory(p.root).length, 1);
    assert.equal(listMemoryEntries(p.root)[0].id, 'shared-test-command');
    writeFileSync(
      join(p.root, '.gipypowers', 'memory', 'index.json'),
      JSON.stringify({
        schemaVersion: 1,
        entries: [{ id: '../../outside', status: 'active' }],
      }),
    );
    assert.equal(listMemoryEntries(p.root)[0].id, 'shared-test-command');
    assert.match(exportMemory(p.root), /Run node --test/);
  } finally {
    p.cleanup();
  }
});

test('revisions deduplicate facts and retrieval omits manually added secrets', () => {
  const p = project();
  try {
    createMemoryEntry(
      p.root,
      {
        id: 'validated-decision',
        type: 'decision',
        title: 'Validated decision',
        source: 'reviewed design',
      },
      'Use server-side session revocation.',
    );
    const second = createMemoryEntry(
      p.root,
      {
        id: 'related-decision',
        type: 'decision',
        title: 'Related decision',
        source: 'implementation review',
      },
      'Use client-side expiration only.',
    );
    assert.throws(
      () =>
        reviseMemoryEntry(
          p.root,
          second.id,
          1,
          'Use server-side session revocation.',
          'follow-up review',
        ),
      /duplicate memory content/i,
    );

    const file = join(
      p.root,
      '.gipypowers',
      'memory',
      'entries',
      'validated-decision.md',
    );
    const page = readFileSync(file, 'utf8').replace(
      'Use server-side session revocation.',
      'Use Bearer abcdefghijklmnopqrstuvwxyz123456 for server-side revocation.',
    );
    writeFileSync(file, page);
    assert.equal(
      searchMemory(p.root, 'server-side revocation').entries.length,
      0,
    );
  } finally {
    p.cleanup();
  }
});
