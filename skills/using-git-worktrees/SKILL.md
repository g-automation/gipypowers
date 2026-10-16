---
name: using-git-worktrees
description: Use when isolation materially benefits feature work; prefer native host worktrees
---

# Using Git Worktrees

## Overview

Use isolation when it protects concurrent work or simplifies integration.
Prefer the host's native worktree tools and use a Git worktree when no native
tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 2 (Project Setup). Do NOT create another worktree.

Report with branch state:

- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

Honor the user's workspace preference. If none is stated, use judgment: isolation
is a reversible implementation choice, so proceed when it materially helps.

## Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

### 1a. Native Worktree Tools (preferred)

Do you already have a way to create a worktree? It might be a tool with a name like `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag. If you do, use it and skip to Step 2.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Only proceed to Step 1b if you have no native worktree tool available.

### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

#### Directory Selection

Follow this priority order. Explicit user preference always beats observed filesystem state.

1. **Check your instructions for a declared worktree directory preference.** If the user has already specified one, use it without asking.
2. **Check for an existing project-local worktree directory:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.
3. **If there is no other guidance available**, default to `.worktrees/` at the project root.

#### Safety Verification (project-local directories only)

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit the change, then proceed.

**Why critical:** Prevents accidentally committing worktree contents to repository.

#### Create the Worktree

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), tell the user the sandbox blocked worktree creation and you're working in the current directory instead. Then run setup and baseline tests in place.

## Step 2: Project Setup

Auto-detect and run appropriate setup:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
npm test / cargo test / pytest / go test ./...
```

If baseline tests fail, record the existing failures, diagnose what they cover,
and proceed when the implementation can still be safely isolated.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation                      | Action                                             |
| ------------------------------ | -------------------------------------------------- |
| Already in linked worktree     | Skip creation (Step 0)                             |
| In a submodule                 | Treat as normal repo (Step 0 guard)                |
| Native worktree tool available | Use it (Step 1a)                                   |
| No native tool                 | Git worktree fallback (Step 1b)                    |
| `.worktrees/` exists           | Use it (verify ignored)                            |
| `worktrees/` exists            | Use it (verify ignored)                            |
| Both exist                     | Use `.worktrees/`                                  |
| Neither exists                 | Check instruction file, then default `.worktrees/` |
| Directory not ignored          | Add to .gitignore + commit                         |
| Permission error on create     | Sandbox fallback, work in place                    |
| Tests fail during baseline     | Record, diagnose, proceed when separable           |
| No package.json/Cargo.toml     | Skip dependency install                            |

## Common Mistakes

- **Fighting the harness** — using `git worktree add` when the platform already provides isolation. Fix: Step 0 detects existing isolation. Step 1a defers to native tools.
- **Skipping detection** — creating a nested worktree inside an existing one. Fix: always run Step 0 before creating anything.
- **Skipping ignore verification** — worktree contents get tracked, pollute git status. Fix: always use `git check-ignore` before creating project-local worktree.
- **Assuming directory location** — creates inconsistency, violates project conventions. Fix: follow priority: explicit instructions > existing project-local directory > default.
- **Proceeding without diagnosing failing baseline tests** — record the baseline and separate existing failures from new regressions.

## Red Flags

**Never:** create a worktree when Step 0 detects existing isolation · use `git worktree add` when you have a native worktree tool (e.g., `EnterWorktree`) — this is the #1 mistake, if you have it, use it · skip Step 1a by jumping straight to Step 1b's git commands · create worktree without verifying it's ignored (project-local) · skip baseline test verification · ignore failing baseline tests without recording their cause.

**Always:** run Step 0 detection first · prefer native tools over git fallback · follow directory priority: explicit instructions > existing project-local directory > default · verify directory is ignored for project-local · auto-detect and run project setup · verify clean test baseline.
