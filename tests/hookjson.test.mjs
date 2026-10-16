import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('claude hooks.json registers SessionStart, UserPromptSubmit, and SubagentStart', () => {
  const h = j('hooks/hooks.json').hooks;
  assert.ok(
    h.SessionStart[0].hooks[0].command.includes('${CLAUDE_PLUGIN_ROOT}'),
  );
  assert.ok(
    h.SessionStart[0].hooks[0].command.includes('gipypowers-activate.js'),
  );
  assert.equal(h.SessionStart[0].hooks[0].timeout, 15);
  assert.ok(
    h.SubagentStart[0].hooks[0].command.includes('gipypowers-subagent.js'),
  );
  assert.ok(
    h.UserPromptSubmit[0].hooks[0].command.includes('gipypowers-activate.js'),
  );
  assert.equal(h.UserPromptSubmit[0].hooks[0].timeout, 5);
});

test('codex hooks.json uses PLUGIN_ROOT for startup and prompt activation', () => {
  const h = j('hooks/hooks-codex.json').hooks;
  assert.equal(h.SessionStart[0].matcher, 'startup|resume|clear|compact');
  assert.equal(h.SessionStart[0].hooks[0].timeout, 15);
  assert.ok(h.SessionStart[0].hooks[0].command.includes('${PLUGIN_ROOT}'));
  assert.ok(!h.SessionStart[0].hooks[0].command.includes('CLAUDE_PLUGIN_ROOT'));
  assert.ok(h.UserPromptSubmit[0].hooks[0].command.includes('${PLUGIN_ROOT}'));
  assert.equal(h.UserPromptSubmit[0].hooks[0].timeout, 5);
});
