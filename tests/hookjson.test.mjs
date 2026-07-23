import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('claude hooks.json registers SessionStart + SubagentStart with CLAUDE_PLUGIN_ROOT', () => {
  const h = j('hooks/hooks.json').hooks;
  assert.ok(
    h.SessionStart[0].hooks[0].command.includes('${CLAUDE_PLUGIN_ROOT}'),
  );
  assert.ok(
    h.SessionStart[0].hooks[0].command.includes('gipypowers-activate.js'),
  );
  assert.ok(
    h.SubagentStart[0].hooks[0].command.includes('gipypowers-subagent.js'),
  );
});

test('codex hooks.json uses PLUGIN_ROOT and startup|resume|clear matcher', () => {
  const h = j('hooks/hooks-codex.json').hooks;
  assert.equal(h.SessionStart[0].matcher, 'startup|resume|clear');
  assert.ok(h.SessionStart[0].hooks[0].command.includes('${PLUGIN_ROOT}'));
  assert.ok(!h.SessionStart[0].hooks[0].command.includes('CLAUDE_PLUGIN_ROOT'));
});
