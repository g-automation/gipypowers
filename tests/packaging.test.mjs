import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('npm package allowlist contains runtime, host manifests, and release docs', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.files, [
    '.agents/plugins',
    '.claude-plugin',
    '.codex-plugin',
    'core',
    'docs/superpowers',
    'hooks',
    'rules',
    'skills',
    '__init__.py',
    'plugin.yaml',
    'NOTICE',
    'CHANGELOG.md',
  ]);
});
