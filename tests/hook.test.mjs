import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const run = (env) =>
  execFileSync('node', [join(ROOT, 'hooks/gipypowers-activate.js')], {
    env: { ...process.env, GIPYPOWERS_NO_UPDATE_CHECK: '1', ...env },
    encoding: 'utf8',
  });

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

test('Codex/SDK envelope is top-level additionalContext', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: '', PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additionalContext, 'string');
  assert.ok(obj.additionalContext.includes('CAVEMAN'));
  assert.ok(obj.additionalContext.includes('I-HAVE-ADHD'));
  assert.ok(obj.additionalContext.includes('NO-AI-SLOP'));
});

test('Cursor envelope is snake_case additional_context', () => {
  const obj = JSON.parse(run({ CURSOR_PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additional_context, 'string');
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
