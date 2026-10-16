---
name: executing-plans
description: Use when a reviewed implementation plan spans multiple dependent steps
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

Execute inline by default. Use sub-agent workflows only when the user explicitly invokes a sub-agent skill.
Single commit: keep all implementation changes in one commit; amend it with `git commit --amend` after it exists.

## The Process

### Step 1: Load and Review Plan

1. Read the plan and compare it with the user's current request and repository.
2. Resolve gaps using existing constraints and implementation evidence.
3. Ask only when a missing decision materially changes the outcome or blocks safe progress.
4. Track the remaining work compactly and proceed.

### Step 2: Execute Tasks

For each task:

1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified:

- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests and complete the branch.

## When to Stop and Ask for Help

When a command or test fails, diagnose the cause and make up to two bounded
recovery attempts for the same failure. Then change strategy, revisit the plan,
or report the concrete blocker. Ask only when required information is missing
and cannot be inferred safely.

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:** partner updates the plan based on your feedback, fundamental approach needs rethinking.

Work around ordinary implementation failures. Pause only for a genuine blocker.

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**

- **superpowers:using-git-worktrees** - Use when isolation materially benefits the change
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:finishing-a-development-branch** - Complete development after all tasks
