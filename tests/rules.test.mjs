import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('caveman-full keeps its load-bearing rules', () => {
  const t = read('rules/caveman-full.md');
  for (const marker of [
    'Auto-Clarity', 'Security warnings', 'Boundaries',
    'Fragments OK', 'Preserve user', 'never invent abbreviations',
  ]) assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/wenyan/i.test(t), 'wenyan must be dropped');
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});

test('ponytail-full keeps the ladder and safety rails', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'YAGNI', 'root cause', 'When NOT to be lazy',
    'input validation', 'ponytail:', 'ONE runnable check',
  ]) assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});
