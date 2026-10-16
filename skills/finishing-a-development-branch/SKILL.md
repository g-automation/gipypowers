---
name: finishing-a-development-branch
description: Use when implementation is complete and ready to integrate; honor an explicit target, and present options only when the target is undecided
---

# Finishing a Development Branch

## Overview

Complete the requested integration path. Present options only when the user has
not specified whether to create a PR, merge, keep, or discard the work.

**Core principle:** Verify → detect environment → follow the explicit target or present options → preserve user-owned work.

Before integration, verify that the implementation has one implementation commit. Later corrections amend that commit; do not create a second implementation commit.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**

```
Tests failing (<N> failures). Must fix before completing:
[Show failures]
Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Detect Environment

Inspect the repository, branch, and worktree owner. Use detectable state to
choose options and cleanup; do not ask questions the repository can answer.

### Step 3: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Infer the base from `git merge-base` and repository history. Ask only if the
base cannot be determined and the PR target materially changes the result.

### Step 4: Present Options

If the user already requested a specific integration outcome, skip the menu
and execute that outcome after verification. Do not merge or discard unless
the user explicitly requested it.

When the outcome is undecided, a normal repo and named-branch worktree can
present these 4 options:

```
Implementation complete. What would you like to do?
1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
Which option?
```

When the outcome is undecided on a detached HEAD, present these 3 options:

```
Implementation complete. You're on a detached HEAD (externally managed workspace).
1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
3. Discard this work
Which option?
```

Keep undecided-work options concise. Do not ask again when the user already
specified the target.

### Step 5: Execute Choice

#### Option 1: Merge Locally

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>   # Verify tests on merged result
# Only after merge succeeds: cleanup worktree (Step 6), then delete branch
```

Then: Cleanup worktree (Step 6), then `git branch -d <feature-branch>`.

#### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
```

**Do NOT clean up worktree** — user needs it alive to iterate on PR feedback.

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>." **Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>
Type 'discard' to confirm.
```

Wait for exact confirmation. If confirmed:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then: Cleanup worktree (Step 6), then force-delete branch: `git branch -D <feature-branch>`.

### Step 6: Cleanup Workspace

**Only runs for Options 1 and 4.** Options 2 and 3 always preserve the worktree.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**If `GIT_DIR == GIT_COMMON`:** Normal repo, no worktree to clean up. Done.

**If worktree path is under `.worktrees/` or `worktrees/`:** Superpowers created this worktree — we own cleanup.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**Otherwise:** The host environment (harness) owns this workspace. Do NOT remove it. If your platform provides a workspace-exit tool, use it. Otherwise, leave the workspace in place.

## Quick Reference

| Option           | Merge | Push | Keep Worktree | Cleanup Branch |
| ---------------- | ----- | ---- | ------------- | -------------- |
| 1. Merge locally | yes   | -    | -             | yes            |
| 2. Create PR     | -     | yes  | yes           | -              |
| 3. Keep as-is    | -     | -    | yes           | -              |
| 4. Discard       | -     | -    | -             | yes (force)    |

## Common Mistakes

- **Skipping test verification** — merge broken code, create failing PR. Fix: always verify tests before offering options.
- **Open-ended questions** — "What should I do next?" is ambiguous. Fix: present exactly 4 structured options (or 3 for detached HEAD).
- **Cleaning up worktree for Option 2** — removes worktree user needs for PR iteration. Fix: only cleanup for Options 1 and 4.
- **Deleting branch before removing worktree** — `git branch -d` fails because worktree still references the branch. Fix: merge first, remove worktree, then delete branch.
- **Running `git worktree remove` from inside the worktree** — fails silently when CWD is inside the worktree being removed. Fix: always `cd` to main repo root before `git worktree remove`.
- **Cleaning up harness-owned worktrees** — causes phantom state. Fix: only clean up worktrees under `.worktrees/` or `worktrees/`.
- **No confirmation for discard** — accidentally delete work. Fix: require typed "discard" confirmation.

## Red Flags

**Never:** proceed with failing tests · merge without verifying tests on result · delete work without confirmation · force-push without explicit request · remove a worktree before confirming merge success · clean up worktrees you didn't create (provenance check) · run `git worktree remove` from inside the worktree.

**Always:** verify tests before offering options · detect environment before presenting menu · present exactly 4 options (or 3 for detached HEAD) · get typed confirmation for Option 4 · clean up worktree for Options 1 & 4 only · `cd` to main repo root before worktree removal · run `git worktree prune` after removal.
