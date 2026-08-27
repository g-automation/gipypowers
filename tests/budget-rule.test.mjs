import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// The 27k / 10% budget rule must stay present in the bootstrap and in every
// session/subagent-spawning skill. A future edit that drops it would silently
// remove the only guard on the 10%-of-context requirement.
const BUDGET_BEARERS = [
  'skills/using-superpowers/SKILL.md',
  'skills/brainstorming/SKILL.md',
  'skills/writing-plans/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'skills/dispatching-parallel-agents/SKILL.md',
];

const WORD_CEILINGS = {
  'skills/using-superpowers/SKILL.md': 450,
  'skills/brainstorming/SKILL.md': 1540,
  'skills/writing-plans/SKILL.md': 1120,
  'skills/executing-plans/SKILL.md': 500,
  'skills/subagent-driven-development/SKILL.md': 2600,
  'skills/dispatching-parallel-agents/SKILL.md': 940,
  'skills/test-driven-development/SKILL.md': 1110,
  'skills/systematic-debugging/SKILL.md': 1360,
  'skills/verification-before-completion/SKILL.md': 670,
  'skills/requesting-code-review/SKILL.md': 370,
  'skills/receiving-code-review/SKILL.md': 920,
  'skills/finishing-a-development-branch/SKILL.md': 1030,
  'skills/using-git-worktrees/SKILL.md': 1150,
  'skills/writing-skills/SKILL.md': 3500,
};

for (const p of BUDGET_BEARERS) {
  test(`budget rule (27k) present in ${p}`, () => {
    assert.ok(read(p).includes('27k'), `missing 27k budget rule in ${p}`);
  });
}

for (const [p, ceiling] of Object.entries(WORD_CEILINGS)) {
  test(`skill stays under compact word ceiling: ${p}`, () => {
    const words = read(p).split(/\s+/).filter(Boolean).length;
    assert.ok(words <= ceiling, `${p}: ${words} words exceeds ${ceiling}`);
  });
}
