import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('all 14 skills exist with SKILL.md + openai.yaml', () => {
  const expected = [
    'using-superpowers','brainstorming','writing-plans','executing-plans',
    'subagent-driven-development','dispatching-parallel-agents',
    'test-driven-development','systematic-debugging','verification-before-completion',
    'requesting-code-review','receiving-code-review','finishing-a-development-branch',
    'using-git-worktrees','writing-skills',
  ];
  const present = readdirSync(join(ROOT, 'skills'));
  for (const s of expected) {
    assert.ok(present.includes(s), `missing skill: ${s}`);
    assert.ok(existsSync(join(ROOT, 'skills', s, 'SKILL.md')), `no SKILL.md: ${s}`);
    assert.ok(existsSync(join(ROOT, 'skills', s, 'agents', 'openai.yaml')), `no openai.yaml: ${s}`);
  }
});

test('no @-path force-loads in any skill body', () => {
  for (const s of readdirSync(join(ROOT, 'skills'))) {
    const p = join(ROOT, 'skills', s, 'SKILL.md');
    if (!existsSync(p)) continue;
    const body = readFileSync(p, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
    assert.ok(!/(^|\s)@[\w./-]+\.md/.test(body), `@ force-load in ${s}`);
  }
});

test('full SessionStart payload contains all three layers', () => {
  const out = execFileSync('node', [join(ROOT, 'hooks/gipypowers-activate.js')],
    { env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT }, encoding: 'utf8' });
  const text = JSON.parse(out).hookSpecificOutput.additionalContext;
  for (const m of ['CAVEMAN', 'PONYTAIL', 'invoke', 'human partner', '27k'])
    assert.ok(text.toLowerCase().includes(m.toLowerCase()), `missing: ${m}`);
});

test('always-resident payload under ~2500 tokens (1875 words)', () => {
  const out = execFileSync('node', [join(ROOT, 'hooks/gipypowers-activate.js')],
    { env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT }, encoding: 'utf8' });
  const text = JSON.parse(out).hookSpecificOutput.additionalContext;
  const words = text.split(/\s+/).filter(Boolean).length;
  assert.ok(words < 1875, `always-on payload too large: ${words} words`);
});
