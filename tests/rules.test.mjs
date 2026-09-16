import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

test('caveman-full keeps its load-bearing rules', () => {
  const t = read('rules/caveman-full.md');
  for (const marker of [
    'Auto-Clarity',
    'Security warnings',
    'Boundaries',
    'Fragments OK',
    'Preserve user',
    'never invent abbreviations',
    'Not a togglable preference',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/wenyan/i.test(t), 'wenyan must be dropped');
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});

test('ponytail-full keeps the ladder and safety rails', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'YAGNI',
    'root cause',
    'When NOT to be lazy',
    'input validation',
    'ponytail:',
    'ONE runnable check',
    'Not a togglable preference',
    'document technical facts only',
    'never the sloppiest',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});

test('ponytail-full requires insightful concise comments', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'non-obvious reason',
    'explain why',
    'no longer than one line',
    'paraphrase the code',
    'narrate work history',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
});

test('automatic output layers contain action and anti-slop guidance', () => {
  const adhd = read('rules/i-have-adhd-full.md');
  const slop = read('rules/no-ai-slop-full.md');
  for (const marker of [
    'action first',
    'numbered steps',
    'state',
    'lists at five',
  ])
    assert.ok(
      adhd.toLowerCase().includes(marker),
      `missing ADHD marker: ${marker}`,
    );
  for (const marker of [
    'preserve intent',
    'minimum effective edit',
    'concrete',
    'active voice',
    'AI slop',
  ])
    assert.ok(
      slop.toLowerCase().includes(marker.toLowerCase()),
      `missing anti-slop marker: ${marker}`,
    );
});

test('automatic capability index is complete and typed', () => {
  const entries = readJson('rules/automatic-capabilities.json');
  const expected = [
    'i-have-adhd',
    'no-ai-slop',
    'caveman',
    'caveman-review',
    'caveman-commit',
    'caveman-compress',
    'caveman-help',
    'caveman-stats',
    'ponytail',
    'ponytail-review',
    'ponytail-audit',
    'ponytail-debt',
    'ponytail-gain',
    'ponytail-help',
  ];
  assert.deepEqual(
    entries.map((entry) => entry.name),
    expected,
    'capabilities must stay in declared precedence order',
  );
  for (const entry of entries) {
    assert.equal(typeof entry.file, 'string', `${entry.name}: file`);
    assert.equal(typeof entry.marker, 'string', `${entry.name}: marker`);
    assert.equal(typeof entry.priority, 'number', `${entry.name}: priority`);
  }
});
