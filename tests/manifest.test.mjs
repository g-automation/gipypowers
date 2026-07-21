import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('claude manifest names the plugin and points at hooks.json', () => {
  const m = j('.claude-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(m.hooks, './hooks/hooks.json');
});

test('codex manifest declares skills + a REAL hook path (not {})', () => {
  const m = j('.codex-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(m.skills, './skills/');
  assert.equal(m.hooks, './hooks/hooks-codex.json');
  assert.notDeepEqual(m.hooks, {});
  assert.equal(m.interface.displayName, 'gipypowers');
});

test('marketplace lists the gipypowers plugin', () => {
  const m = j('.claude-plugin/marketplace.json');
  assert.equal(m.plugins[0].name, 'gipypowers');
});
