---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plans inline by default. Use this optional workflow only when independent
tasks offer a clear, measured benefit over token and coordination cost. Keep
work continuous; stop only for a blocker, real ambiguity, or completion.

## Budget and selection

Keep each subagent's working context under ~27k tokens (10% of the window).
Persist bulky research to files and pass paths plus concise requirements.
Use the smallest capable model and number of agents; do not delegate work that
is faster or cheaper to complete inline. Never expose private reasoning.

## Pre-flight

1. Read the plan and inspect relevant files, tests, and repository instructions.
2. List files each task owns; flag overlaps, missing dependencies, or conflicts
   before dispatching.
3. Create one task brief per independent task with goal, exact files, constraints,
   verification command, and expected result.
4. Run relevant baseline checks. Record pre-existing failures and continue when
   they do not block the planned change.

## Task loop

For each task, in order:

1. Dispatch one implementer with only task-relevant context and the 27k budget.
2. Inspect its diff and run focused verification yourself.
3. Add an independent review only when risk or scope makes its value exceed
   its token and coordination cost. Fix material findings and re-verify.
4. Record completed task, commit hash, tests, and remaining work in the ledger.

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

Stop dispatching when a security/data-loss risk appears, the plan conflicts with
repository instructions, or an agent lacks required context. Diagnose new test
failures and recover inline; ask only when critical information is genuinely
missing. Do not paper over a failure with unbounded retries or speculative changes.
