import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('version matches across package.json and both plugin manifests', () => {
  const pkg = j('package.json');
  const claudeManifest = j('.claude-plugin/plugin.json');
  const codexManifest = j('.codex-plugin/plugin.json');
  assert.equal(
    claudeManifest.version,
    pkg.version,
    `.claude-plugin/plugin.json version (${claudeManifest.version}) must match package.json (${pkg.version})`,
  );
  assert.equal(
    codexManifest.version,
    pkg.version,
    `.codex-plugin/plugin.json version (${codexManifest.version}) must match package.json (${pkg.version})`,
  );
});
