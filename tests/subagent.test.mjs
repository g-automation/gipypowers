import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (env) =>
  execFileSync('node', [join(ROOT, 'hooks/gipypowers-subagent.js')], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });

test('subagent hook emits valid JSON with the reminder', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: ROOT }));
  const text = obj.hookSpecificOutput.additionalContext;
  assert.ok(text.includes('CAVEMAN'));
  assert.ok(text.includes('PONYTAIL'));
  assert.ok(text.includes('27k'));
});

test('subagent hook uses top-level field for Codex/SDK', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: '', PLUGIN_ROOT: ROOT }));
  assert.equal(typeof obj.additionalContext, 'string');
});
