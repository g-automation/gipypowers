# Inline Execution and Token Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release gipypowers `0.4.0` with inline execution enforced and a smaller always-resident token footprint.

**Architecture:** Keep the existing hook assembly and capability index. Replace duplicated prose with compact, direct policy text in the bootstrap and subagent reminder, and update only workflow guidance that presents dispatch as a default choice. Preserve all skill files and host-specific envelopes.

**Tech Stack:** Node.js CommonJS hooks, Markdown skills, JSON manifests, `node:test`, ESLint, Prettier.

## Global Constraints

- Work executes inline by default and must not present inline versus sub-agent as a choice.
- Existing sub-agent skills remain installed and available; this release does not add new sub-agent behavior.
- Preserve all 14 skills, metadata files, automatic-capability markers, hook registrations, and update-check behavior.
- Preserve Claude, Codex, Cursor, and SDK hook envelopes.
- Preserve the literal `27k` budget invariant.
- Synchronize all release manifests at version `0.4.0`.

---

### Task 1: Lock inline behavior and compact payload contracts

**Files:**

- Modify: `tests/bootstrap.test.mjs`
- Modify: `tests/integration.test.mjs`
- Modify: `tests/subagent.test.mjs`
- Modify: `hooks/gipypowers-activate.js`
- Modify: `hooks/gipypowers-subagent.js`

**Interfaces:**

- Produces SessionStart and SubagentStart text that explicitly enforces inline execution, retains required automatic-layer markers, and stays below existing payload ceilings.

- [ ] **Step 1: Write failing assertions**

  Add assertions for `INLINE: execute work in this session by default; do not ask whether to use inline or sub-agent`, and assert that the exact choice wording `choose between inline and sub-agent` is absent from bootstrap/session output. Add a SubagentStart assertion for `INLINE: continue inline unless user explicitly invokes a sub-agent skill`.

- [ ] **Step 2: Run focused tests and verify they fail**

  Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs tests/subagent.test.mjs`

  Expected: FAIL because current hooks do not emit the new inline policy.

- [ ] **Step 3: Implement smallest hook change**

  Add one compact inline policy sentence to the SessionStart preamble and one compact reminder to the SubagentStart string. Remove duplicated wording that repeats automatic-layer and Superpowers boundaries, but retain markers needed by tests and users. Keep JSON envelope branches unchanged.

- [ ] **Step 4: Run focused tests and verify they pass**

  Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs tests/subagent.test.mjs`

  Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

  Run: `git add tests/bootstrap.test.mjs tests/integration.test.mjs tests/subagent.test.mjs hooks/gipypowers-activate.js hooks/gipypowers-subagent.js && git commit -m 'fix: enforce inline execution in hooks'`

### Task 2: Remove choice-oriented workflow prose and preserve progressive disclosure

**Files:**

- Modify: `skills/using-superpowers/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `README.md`
- Modify: `tests/bootstrap.test.mjs`
- Modify: `tests/integration.test.mjs`

**Interfaces:**

- Consumes inline policy from Task 1.
- Produces workflow documentation that routes ordinary work inline and keeps sub-agent workflows available only when explicitly invoked.

- [ ] **Step 1: Write failing documentation assertions**

  Add tests that bootstrap text contains `execute inline by default`, workflow text contains `explicitly invoke`, and README documents inline-default behavior. Assert no changed workflow file contains `Which approach?` or equivalent inline/sub-agent selection prompt.

- [ ] **Step 2: Run focused tests and verify they fail**

  Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs`

  Expected: FAIL because current planning and execution handoffs offer a sub-agent/inline choice.

- [ ] **Step 3: Edit prose with compact direct recipes**

  Replace choice prompts with: `Execute inline in this session. Use sub-agent workflows only when the user explicitly invokes one.` Keep the `27k` rule in every budget bearer and retain all safety, testing, review, and verification requirements. Shorten repeated explanations instead of deleting capabilities.

- [ ] **Step 4: Run focused tests and word ceilings**

  Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs tests/budget-rule.test.mjs`

  Expected: PASS with zero failures and no compact-word-ceiling failures.

- [ ] **Step 5: Commit**

  Run: `git add README.md skills/using-superpowers/SKILL.md skills/dispatching-parallel-agents/SKILL.md skills/subagent-driven-development/SKILL.md skills/executing-plans/SKILL.md skills/writing-plans/SKILL.md tests/bootstrap.test.mjs tests/integration.test.mjs && git commit -m 'docs: make inline workflow default'`

### Task 3: Bump and synchronize release metadata

**Files:**

- Modify: `package.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `tests/version-sync.test.mjs`
- Modify: `tests/manifest.test.mjs`

- [ ] **Step 1: Write failing version assertion**

  Add `assert.equal(pkg.version, '0.4.0')` to the release-version test.

- [ ] **Step 2: Run focused test and verify it fails**

  Run: `node --test tests/version-sync.test.mjs tests/manifest.test.mjs`

  Expected: FAIL because manifests currently report `0.3.0`.

- [ ] **Step 3: Update all three version fields and descriptions**

  Set every version field to `0.4.0`. Describe the release as inline-first and token-efficient while retaining existing capability claims.

- [ ] **Step 4: Run focused test and verify it passes**

  Run: `node --test tests/version-sync.test.mjs tests/manifest.test.mjs`

  Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

  Run: `git add package.json .claude-plugin/plugin.json .codex-plugin/plugin.json tests/version-sync.test.mjs tests/manifest.test.mjs && git commit -m 'chore: bump gipypowers to 0.4.0'`

### Task 4: Full regression and release verification

**Files:**

- Verify: all tracked files changed by Tasks 1–3

- [ ] **Step 1: Run full test suite**

  Run: `npm test`

  Expected: all Node tests pass with zero failures.

- [ ] **Step 2: Run lint**

  Run: `npm run lint`

  Expected: ESLint exits `0` with no errors.

- [ ] **Step 3: Check formatting and whitespace**

  Run: `npx prettier --check README.md package.json .claude-plugin/plugin.json .codex-plugin/plugin.json hooks/gipypowers-activate.js hooks/gipypowers-subagent.js tests/bootstrap.test.mjs tests/integration.test.mjs tests/subagent.test.mjs tests/version-sync.test.mjs tests/manifest.test.mjs` and `git diff --check`.

  Expected: Prettier reports all files formatted and Git reports no whitespace errors.

- [ ] **Step 4: Inspect final diff and status**

  Run: `git diff HEAD~3..HEAD --stat; git status --short`

  Expected: only scoped release changes are committed; pre-existing user modifications to the two `2026-07-23` documents remain untouched.
