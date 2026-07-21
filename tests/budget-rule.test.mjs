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

for (const p of BUDGET_BEARERS) {
  test(`budget rule (27k) present in ${p}`, () => {
    assert.ok(read(p).includes('27k'), `missing 27k budget rule in ${p}`);
  });
}
