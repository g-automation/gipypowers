import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isNewerVersion } = require('../hooks/lib/update-check.js');

test('isNewerVersion detects patch/minor/major bumps', () => {
  assert.equal(isNewerVersion('0.2.0', '0.1.0'), true);
  assert.equal(isNewerVersion('0.1.1', '0.1.0'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
});

test('isNewerVersion returns false when equal or local is already newer', () => {
  assert.equal(isNewerVersion('0.2.0', '0.2.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.2.0'), false);
});

test('isNewerVersion returns false for malformed input', () => {
  assert.equal(isNewerVersion('not-a-version', '0.1.0'), false);
  assert.equal(isNewerVersion('0.2.0', 'not-a-version'), false);
  assert.equal(isNewerVersion(null, '0.1.0'), false);
  assert.equal(isNewerVersion('1.2', '0.1.0'), false);
});
