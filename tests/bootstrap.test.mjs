import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('bootstrap keeps load-bearing invariants + adds budget note', () => {
  const t = read('skills/using-superpowers/SKILL.md');
  for (const m of [
    'BEFORE any response', 'brainstorming', 'human partner',
    'Red Flags', '27k', 'caveman', 'ponytail',
    'cannot be disabled by user request', 'not workflows, they\'re always-on',
  ]) assert.ok(t.toLowerCase().includes(m.toLowerCase()), `missing: ${m}`);
});

test('bootstrap stays tight (always-resident cost)', () => {
  const words = read('skills/using-superpowers/SKILL.md').split(/\s+/).filter(Boolean).length;
  assert.ok(words < 550, `bootstrap too large: ${words} words`);
});
