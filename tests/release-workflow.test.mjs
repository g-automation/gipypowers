import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(
  join(ROOT, '.github/workflows/release.yml'),
  'utf8',
);

test('main-branch version metadata changes publish the matching GitHub release', () => {
  assert.match(workflow, /branches:\s*\n\s+- main/);
  assert.match(workflow, /package\.json/);
  assert.match(workflow, /package-lock\.json/);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /TAG="v\$\{VERSION\}"/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /gh release view/);
  assert.match(workflow, /\$\{TAG_COMMIT\}.*\$\{GITHUB_SHA\}/);
});
