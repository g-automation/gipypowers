import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (env) =>
  execFileSync('node', [join(ROOT, 'hooks/gipypowers-activate.js')], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });

test('Claude envelope is nested and carries all three layers', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: ROOT }));
  const text = obj.hookSpecificOutput.additionalContext;
  for (const m of ['EXTREMELY_IMPORTANT', 'CAVEMAN', 'PONYTAIL', 'SUPERPOWERS'])
    assert.ok(text.includes(m), `missing: ${m}`);
});

test('Codex/SDK envelope is top-level additionalContext', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: '', PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additionalContext, 'string');
  assert.ok(obj.additionalContext.includes('CAVEMAN'));
});

test('Cursor envelope is snake_case additional_context', () => {
  const obj = JSON.parse(run({ CURSOR_PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additional_context, 'string');
});

test('always-on rule layers stay under the word budget', () => {
  // Gate the two always-resident rule files (~2500-token target ≈ 1875 words).
  // The compressed using-superpowers bootstrap is added in Task 7 and is
  // re-checked by the aggregate gate in Task 9.
  const words = (p) =>
    readFileSync(join(ROOT, p), 'utf8').split(/\s+/).filter(Boolean).length;
  const total =
    words('rules/caveman-full.md') + words('rules/ponytail-full.md');
  assert.ok(total < 900, `rule layers too large: ${total} words`);
});
