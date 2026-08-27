# Insightful Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make always-on Claude/Codex guidance produce concise code comments that explain non-obvious technical reasons.

**Architecture:** Keep one source of truth in `rules/ponytail-full.md`; existing Claude and Codex session-start hooks already inject it. Extend the source-content contract in `tests/rules.test.mjs` so policy cannot regress.

**Tech Stack:** Markdown rules, Node.js built-in `node:test`, ESLint.

## Global Constraints

- Comments explain only non-obvious invariants, contracts, constraints, or deliberate trade-offs.
- Comments explain why, not what; no code paraphrase, work-history narration, or vague/adjectival context.
- Comments stay direct and no longer than one line.
- Do not add hooks, manifests, dependencies, or comment-format syntax.

---

### Task 1: Lock comment policy with a regression test

**Files:**

- Modify: `tests/rules.test.mjs` after the existing Ponytail test

**Interfaces:**

- Consumes: `rules/ponytail-full.md` through existing `read()` helper.
- Produces: assertions requiring the concise, reason-focused comment policy.

- [ ] **Step 1: Add the failing assertions**

Add this test:

```js
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
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `node --test tests/rules.test.mjs`

Expected: FAIL because `rules/ponytail-full.md` does not yet contain all five exact policy phrases.

### Task 2: Update shared Ponytail guidance

**Files:**

- Modify: `rules/ponytail-full.md` comment rules under `## Rules`

**Interfaces:**

- Consumes: existing one-line technical-comment rule and `ponytail:` constraint convention.
- Produces: shared policy consumed unchanged by Claude and Codex hooks.

- [ ] **Step 1: Replace the existing comment bullets**

Replace the current two comment bullets with:

```markdown
- Comments add insight only when they explain a non-obvious reason: an invariant, contract, constraint, or deliberate trade-off. Explain why the code or constraint exists, not what the code already does.
- Keep each comment direct and no longer than one line. Never paraphrase the code, narrate work history, or add vague/adjectival context.
```

- [ ] **Step 2: Run focused tests and lint**

Run: `node --test tests/rules.test.mjs`

Expected: PASS with all tests passing.

Run: `npm run lint`

Expected: ESLint exits 0 with no errors.

- [ ] **Step 3: Review diff and commit implementation**

Run: `git diff --check && git diff -- rules/ponytail-full.md tests/rules.test.mjs`

Expected: no whitespace errors; diff contains only policy and regression-test changes.

```bash
git add rules/ponytail-full.md tests/rules.test.mjs
git commit -m "feat: require insightful concise comments"
```

### Task 3: Verify repository contracts

**Files:**

- Test: `tests/*.test.mjs`

**Interfaces:**

- Consumes: completed rule and test changes.
- Produces: verified repository state with no hook or manifest drift.

- [ ] **Step 1: Run complete test suite**

Run: `npm test`

Expected: all Node tests pass with zero failures.

- [ ] **Step 2: Confirm final diff scope**

Run: `git status --short && git diff HEAD^ --stat`

Expected: implementation commit lists only `rules/ponytail-full.md` and `tests/rules.test.mjs`; pre-existing unrelated working-tree changes remain untouched.
