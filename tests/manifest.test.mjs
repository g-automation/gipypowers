import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('claude manifest does not redeclare the standard hooks.json path', () => {
  const m = j('.claude-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(
    m.hooks,
    undefined,
    'hooks/hooks.json is auto-loaded by Claude Code from the standard path; declaring it in the manifest causes a duplicate-load error at install',
  );
});

test('codex manifest declares skills + a REAL hook path (not {})', () => {
  const m = j('.codex-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(m.skills, './skills/');
  assert.equal(m.hooks, './hooks/hooks-codex.json');
  assert.notDeepEqual(m.hooks, {});
  assert.equal(m.interface.displayName, 'gipypowers');
});

test('Claude and Codex manifests publish the same release version', () => {
  const claude = j('.claude-plugin/plugin.json');
  const codex = j('.codex-plugin/plugin.json');
  const packageJson = j('package.json');
  assert.equal(claude.version, packageJson.version);
  assert.equal(codex.version, packageJson.version);
  assert.equal(claude.name, codex.name);
});

test('marketplace lists the gipypowers plugin', () => {
  const m = j('.claude-plugin/marketplace.json');
  assert.equal(m.plugins[0].name, 'gipypowers');
});
