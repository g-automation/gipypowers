---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute an approved plan with a fresh implementer per task, a two-stage review
after each task, and one final whole-branch review. Keep work continuous; stop
only for a blocker, real ambiguity, or completion.

## Budget and selection

Keep each subagent's working context under ~27k tokens (10% of the window).
Persist bulky research to files and pass paths plus concise requirements.
Choose model by task: fast/light for bounded edits, medium for ordinary coding,
strongest available for architecture or review. Never expose private reasoning.

## Pre-flight

1. Read the plan and inspect relevant files, tests, and repository instructions.
2. List files each task owns; flag overlaps, missing dependencies, or conflicts
   before dispatching.
3. Create one task brief per independent task with goal, exact files, constraints,
   verification command, and expected result.
4. Confirm baseline tests pass; stop and report failures before implementation.

## Task loop

For each task, in order:

1. Dispatch one implementer with only task-relevant context and the 27k budget.
2. Inspect its diff and run the task's tests yourself.
3. Dispatch a spec-compliance reviewer with the plan, diff, and test output.
4. Dispatch a code-quality reviewer for correctness, security, regressions, and
   unnecessary complexity. Fix every Critical/Important finding, then rerun
   tests; ask the human only when scope or architecture is genuinely unclear.
5. Record completed task, commit hash, tests, and remaining work in the ledger.

Never trust a status report without checking the diff and commands. Do not let
agents modify files owned by another active task. Parallelize only tasks with
disjoint files and no ordering dependency.

## Handoffs

Pass exact paths, symbols, interfaces, decisions, and failing output. Avoid
full chat history and duplicate source dumps. Persist long output under the
repository's scratch ledger and pass a pointer. Keep prompts action-oriented;
ask for code and evidence, not a narrative.

## Completion

After all tasks, run the full suite, lint, formatting/whitespace checks, and a
whole-branch review. Confirm every plan requirement, manifest, attribution, and
generated artifact. Use `finishing-a-development-branch` for merge/PR/cleanup.

## Stop conditions

Stop dispatching when tests fail unexpectedly, a security/data-loss risk appears,
the plan conflicts with repository instructions, or an agent lacks required
context. Report exact evidence and ask one focused question. Do not paper over a
failure with retries or speculative changes.
