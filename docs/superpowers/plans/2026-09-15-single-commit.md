# Single-Commit Workflow Rule Implementation Plan

> **For agentic workers:** Execute inline by default with superpowers:executing-plans. Use sub-agent workflows only when the user explicitly invokes a sub-agent skill. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every gipypowers implementation produce one commit, with all later corrections applied through `git commit --amend`.

**Architecture:** Keep enforcement declarative and progressive: put one compact invariant in SessionStart, repeat it at planning/execution/finishing boundaries, and test source contracts. Do not add automatic git mutation or change explicit sub-agent capabilities.

**Tech Stack:** CommonJS Node.js hooks, Markdown skills, `node:test`, ESLint, Prettier, Git.

## Global Constraints

- Every gipypowers implementation ends with exactly one implementation commit.
- After the implementation commit exists, corrections use `git commit --amend`.
- Existing history is not rewritten implicitly.
- Execute inline by default; sub-agent workflows require explicit invocation.
- Bump and synchronize release version to `0.5.0`; preserve host-specific hook envelopes, automatic capabilities, and the literal `27k` rule.
- This execution produces one commit total; do not create per-task or design-doc commits.

---

### Task 1: Add failing single-commit contract tests

**Files:**

- Modify: `tests/bootstrap.test.mjs`
- Modify: `tests/integration.test.mjs`

**Interfaces:**

- Consumes: existing hook and workflow source files.
- Produces: assertions requiring the single-commit invariant and amend path.

- [ ] **Step 1: Write the failing assertions**

Add a bootstrap test requiring `single commit`, `commit --amend`, and `exactly one`.
Extend workflow-doc tests to read `skills/using-superpowers/SKILL.md`,
`skills/writing-plans/SKILL.md`, `skills/executing-plans/SKILL.md`, and
`skills/finishing-a-development-branch/SKILL.md`; require the first three to
contain `single commit` and `commit --amend`, require finishing guidance to
contain `one implementation commit`, and reject `frequent commits` and
`one commit per task` in planning/execution docs.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs`

Expected: FAIL because current sources do not state the single-commit rule.

### Task 2: Enforce policy at runtime and workflow boundaries

**Files:**

- Modify: `hooks/gipypowers-activate.js`
- Modify: `skills/using-superpowers/SKILL.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`

**Interfaces:**

- Consumes: contract assertions from Task 1.
- Produces: compact guidance: create one commit when none exists; amend that
  commit for later corrections; never create a second implementation commit.

- [ ] **Step 1: Add compact SessionStart policy**

Append to the existing SessionStart preamble:
`SINGLE COMMIT: each implementation ends with exactly one commit; amend it with git commit --amend for later corrections; never create a second implementation commit.`

- [ ] **Step 2: Add policy to workflow skills**

Add the same rule, in shorter local wording, to `using-superpowers`,
`writing-plans`, and `executing-plans`. Replace any plan instruction that
encourages frequent commits or commits after each task with one final commit
instruction. In `finishing-a-development-branch`, require checking the
implementation commit count before integration and state that corrections to
the implementation use amend.

- [ ] **Step 3: Run focused tests**

Run: `node --test tests/bootstrap.test.mjs tests/integration.test.mjs`

Expected: PASS, including the existing inline, capability, and payload-size
contracts.

### Task 3: Preserve documentation and repository contracts

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-15-single-commit-design.md`
- Modify: `docs/superpowers/plans/2026-09-15-single-commit.md`

**Interfaces:**

- Consumes: runtime wording from Task 2.
- Produces: user-facing documentation that states one commit per
  implementation without changing feature availability or release version.

- [ ] **Step 1: Document public behavior**

Add one concise README sentence under `Superpowers Workflow`: implementations
use one commit, and follow-up fixes amend that commit. Keep existing inline,
sub-agent, capability, and `27k` descriptions.

- [ ] **Step 2: Check for contradictory guidance**

Run: `rg -n -i 'frequent commits|one commit per task|commit after each task' skills README.md`

Expected: no matches in ordinary planning/execution guidance; matches inside
explicit sub-agent reference material, if any, must not be changed unless they
select a multi-commit default for ordinary work.

### Task 4: Verify and create one final commit

**Files:**

- Test: `tests/*.test.mjs`

**Interfaces:**

- Consumes: all changes from Tasks 1–3.
- Produces: verified branch with one new implementation commit, or one amend of
  the current implementation commit when the base commit belongs to this work.

- [ ] **Step 1: Run full verification**

Run: `npm test`, `npm run lint`,
`npx prettier --check README.md hooks/gipypowers-activate.js skills/using-superpowers/SKILL.md skills/writing-plans/SKILL.md skills/executing-plans/SKILL.md skills/finishing-a-development-branch/SKILL.md tests/bootstrap.test.mjs tests/integration.test.mjs`, and `git diff --check`.

Expected: all tests pass, lint and formatting pass, and diff check is clean.

- [ ] **Step 2: Confirm commit scope before writing history**

Run: `git status --short` and `git diff --stat`.

Expected: only files listed in this plan are staged; pre-existing user changes
remain untouched.

- [ ] **Step 3: Create exactly one commit**

If no commit for this implementation exists, run:
`git add hooks/gipypowers-activate.js skills/using-superpowers/SKILL.md skills/writing-plans/SKILL.md skills/executing-plans/SKILL.md skills/finishing-a-development-branch/SKILL.md README.md tests/bootstrap.test.mjs tests/integration.test.mjs docs/superpowers/specs/2026-09-15-single-commit-design.md docs/superpowers/plans/2026-09-15-single-commit.md && git commit -m 'feat: enforce single-commit workflow'`.

If this implementation already has its base commit, stage the same scoped
files and run `git commit --amend --no-edit`. Do not create another commit.

- [ ] **Step 4: Verify history**

Run: `git show --stat --oneline HEAD` and `git status --short`.

Expected: one commit contains the implementation; unrelated pre-existing user
changes are still unstaged and untouched.
