import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routePrompt } from '../core/skill-router.js';

test('routes feature work to planning, TDD, and verification', () => {
  assert.deepEqual(
    routePrompt('Add a feature to export project reports').skills,
    [
      'writing-plans',
      'test-driven-development',
      'verification-before-completion',
    ],
  );
});

test('routes failures to debugging, regression tests, and verification', () => {
  assert.deepEqual(
    routePrompt('Fix this failing test and diagnose the error').skills,
    [
      'systematic-debugging',
      'test-driven-development',
      'verification-before-completion',
    ],
  );
});

test('routes reviews, memory operations, and release work without subagent defaults', () => {
  assert.ok(
    routePrompt('Review this pull request').skills.includes(
      'requesting-code-review',
    ),
  );
  assert.deepEqual(
    routePrompt('Search project memory for auth decisions').skills,
    ['gipypowers-memory'],
  );
  assert.ok(
    routePrompt('Prepare the v1.0.0 release').skills.includes(
      'verification-before-completion',
    ),
  );
  assert.ok(routePrompt('Review this pull request').skills.length <= 3);
  assert.ok(
    !routePrompt('Review this pull request').instructions.includes(
      'spawn a subagent',
    ),
  );
});

test('familiar non-engineering prompts do not load workflows', () => {
  assert.deepEqual(routePrompt('What time is sunset?').skills, []);
});
