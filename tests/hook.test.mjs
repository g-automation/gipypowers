import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const run = (env, hookEventName = 'SessionStart', extra = {}) => {
  const cwd = mkdtempSync(
    join(process.env.TMPDIR || '/tmp', 'gipypowers-hook-'),
  );
  try {
    return execFileSync('node', [join(ROOT, 'hooks/gipypowers-activate.js')], {
      env: { ...process.env, GIPYPOWERS_NO_UPDATE_CHECK: '1', ...env },
      input: JSON.stringify({
        hook_event_name: hookEventName,
        source: 'startup',
        cwd,
        ...extra,
      }),
      encoding: 'utf8',
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
};

test('Claude envelope is nested and carries all automatic layers', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: ROOT }));
  const text = obj.hookSpecificOutput.additionalContext;
  for (const m of [
    'EXTREMELY_IMPORTANT',
    'CAVEMAN',
    'PONYTAIL',
    'I-HAVE-ADHD',
    'NO-AI-SLOP',
    'SUPERPOWERS',
  ])
    assert.ok(text.includes(m), `missing: ${m}`);
});

test('SessionStart emits indexed capabilities before Superpowers', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: ROOT }));
  const text = obj.hookSpecificOutput.additionalContext;
  const entries = JSON.parse(read('rules/automatic-capabilities.json'));
  let previous = -1;
  for (const entry of entries) {
    const position = text.indexOf(entry.marker);
    assert.ok(position > previous, `out of order or missing: ${entry.name}`);
    previous = position;
  }
  assert.ok(text.indexOf('SUPERPOWERS') > previous);
  assert.ok(!text.includes('invoke /caveman'));
  assert.ok(!text.includes('invoke /ponytail'));
});

test('Codex envelope is nested and event-specific', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: '', PLUGIN_ROOT: ROOT }));
  assert.equal(obj.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(typeof obj.hookSpecificOutput.additionalContext, 'string');
  assert.ok(obj.hookSpecificOutput.additionalContext.includes('CAVEMAN'));
  assert.ok(obj.hookSpecificOutput.additionalContext.includes('I-HAVE-ADHD'));
  assert.ok(obj.hookSpecificOutput.additionalContext.includes('NO-AI-SLOP'));
});

test('Cursor envelope is snake_case additional_context', () => {
  const obj = JSON.parse(run({ CURSOR_PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additional_context, 'string');
});

test('UserPromptSubmit returns automatic workflow and memory context', () => {
  const obj = JSON.parse(
    run({ CLAUDE_PLUGIN_ROOT: ROOT }, 'UserPromptSubmit', {
      prompt: 'Fix the failing auth token revocation test',
      session_id: 'session-1',
    }),
  );
  const context = obj.hookSpecificOutput.additionalContext;
  assert.equal(obj.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(context, /systematic-debugging/);
  assert.match(context, /test-driven-development/);
  assert.match(context, /Memory CLI:/);
});

test('always-on rule layers stay under the word budget', () => {
  // Gate all four always-resident rule files (~2500-token target ≈ 1875 words).
  const words = (p) =>
    readFileSync(join(ROOT, p), 'utf8').split(/\s+/).filter(Boolean).length;
  const entries = JSON.parse(read('rules/automatic-capabilities.json'));
  const total = [...new Set(entries.map((entry) => entry.file))].reduce(
    (sum, file) => sum + words(file),
    0,
  );
  assert.ok(total < 1400, `rule layers too large: ${total} words`);
});
