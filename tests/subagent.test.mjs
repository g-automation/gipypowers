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
  assert.ok(text.includes('ADHD'));
  assert.ok(text.includes('ANTI-SLOP'));
  assert.ok(text.includes('AUTO-CAPABILITIES'));
  assert.ok(text.includes('Superpowers skills are selected automatically'));
  assert.ok(text.includes('27k'));
  assert.ok(
    text.includes(
      'use subagents only when independent parallel work has a clear benefit',
    ),
  );
});

test('subagent hook uses Codex event-specific output', () => {
  const obj = JSON.parse(run({ CLAUDE_PLUGIN_ROOT: '', PLUGIN_ROOT: ROOT }));
  assert.equal(obj.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.equal(typeof obj.hookSpecificOutput.additionalContext, 'string');
});
