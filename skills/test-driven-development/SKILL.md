---
name: test-driven-development
description: Use as a test-first default for behavior changes and bug fixes; scale verification to task size
---

# Test-Driven Development (TDD)

## Overview

Prefer a focused test-first cycle for behavior changes, then implement the
smallest change and run relevant regressions.

**Core principle:** A focused failing regression check gives strong evidence that the test catches the behavior being changed.

## When to Use

Use test-first for behavior changes, bug fixes, and refactors when a focused
automated check is practical. For documentation, metadata, and simple
configuration, use the smallest relevant validation instead of inventing a
test. Keep implementation moving; do not ask permission to make this routine
verification choice.

## Test-First Default

Write a focused failing check before implementation when practical. Confirm it
fails for the expected reason, implement the smallest change, then run the
check and relevant regressions. If implementation already exists, add a
targeted regression check before changing it; do not discard correct work just
to restart the sequence. If a check is infeasible, use the strongest practical
verification and state the limitation.

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen. One behavior, clear name, real code (no mocks unless unavoidable).

<Good>`test('retries failed operations 3 times', ...)` — clear name, tests real behavior, one thing</Good>
<Bad>`test('retry works', ...)` with a fully mocked function — vague name, tests mock not code</Bad>

### Verify RED — Watch It Fail

When practical, run the test and confirm it fails for the expected reason, not because of a typo or setup error.

- **Test passes?** You're testing existing behavior. Fix test.
- **Test errors?** Fix error, re-run until it fails correctly.

### GREEN — Minimal Code

Write the simplest code to pass the test. Don't add features, refactor other code, or "improve" beyond the test (e.g. don't add unrequested options/config — YAGNI).

### Verify GREEN — Watch It Pass

Run the focused test and relevant regression checks before reporting the change complete.

- **Test fails?** Fix code, not test.
- **Other tests fail?** Fix now.

### REFACTOR — Clean Up

After green only: remove duplication, improve names, extract helpers. Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Good Tests

| Quality          | Good                                | Bad                                                 |
| ---------------- | ----------------------------------- | --------------------------------------------------- |
| **Minimal**      | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear**        | Name describes behavior             | `test('test1')`                                     |
| **Shows intent** | Demonstrates desired API            | Obscures what code should do                        |

## Why Order Matters

A focused failing regression check shows that a test covers the behavior being
changed and keeps verification repeatable. Use proportionate checks for
documentation, configuration, and other non-behavior changes. Do not discard
correct work to recreate a red phase.

## Common Pitfalls

- Tests added after implementation can inherit implementation bias; add a
  targeted regression check before the next behavior change.
- Do not invent tests for docs, metadata, or simple configuration.
- When a test fails repeatedly, change the hypothesis or implementation
  strategy instead of restarting code to satisfy a ritual.

## Example: Bug Fix

**Bug:** Empty email accepted.

**RED:** `test('rejects empty email', ...)` expecting `result.error === 'Email required'`.
**Verify RED:** `npm test` → `FAIL: expected 'Email required', got undefined`.
**GREEN:** add `if (!data.email?.trim()) return { error: 'Email required' };`
**Verify GREEN:** `npm test` → `PASS`.
**REFACTOR:** extract validation for multiple fields if needed.

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem                | Solution                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Don't know how to test | Find the smallest observable behavior and use the simplest practical check. Ask only if missing information blocks progress. |
| Test too complicated   | Design too complicated. Simplify interface.                                                                                  |
| Must mock everything   | Code too coupled. Use dependency injection.                                                                                  |
| Test setup huge        | Extract helpers. Still complex? Simplify design.                                                                             |

## Debugging Integration

Bug found? Add a focused regression test when practical, then fix and verify the behavior.

## Testing Anti-Patterns

When adding mocks or test utilities, read [testing-anti-patterns.md](testing-anti-patterns.md) to avoid common pitfalls: testing mock behavior instead of real behavior, adding test-only methods to production classes, mocking without understanding dependencies.

## Final Rule

Prefer test-first for behavior changes. For other work, run the strongest
relevant verification that keeps the task moving. No approval is needed for
routine verification choices.
