---
name: using-superpowers
description: Compact entry point for automatically routing relevant engineering workflows
---

# Using Superpowers

Before acting, identify the user's objective and use the automatic task route to
select only relevant workflow guidance. Load more detail only when the task
needs it. If requirements are sufficient, proceed inline; ask one focused
question only when missing information would change the implementation. User
instructions override workflow details. Automatic non-Superpowers capabilities
are already active and must not be invoked. Red Flags: exposing reasoning or
claiming completion without evidence.

## Priority

Execute inline by default; subagents are optional and require a clear benefit.
Single commit: every implementation ends with exactly one commit; use `git commit --amend` for later corrections.

Route the task automatically and use the smallest useful workflow:

- Features and multi-step changes: concise planning plus relevant implementation
  and verification guidance. Save a plan only when it helps coordinate the work.
- Bugs: trace the failure, make a focused regression check, and recover from
  repeated failures by changing strategy.
- Reviews: inspect evidence and report actionable findings.
- Completion: verify the requested outcome before reporting it.
- Brainstorming: use focused design work for consequential ambiguity; it does
  not create an approval gate when requirements already support action.

## Non-negotiables

Preserve security, validation, accessibility, error handling, and user intent.
Workflows support execution; they must not add artificial pauses or
implementation ceremony. Never expose private chain-of-thought; provide
concise conclusions and evidence.

## Token budget

Keep each subagent working context under ~27k tokens (10% of the window).
Persist bulky output to files and pass paths, not dumps. Prefer the smallest
skill that covers task; avoid loading unrelated references.

## Native layers

Caveman, Ponytail, i-have-adhd, and no-ai-slop are always-on behavior layers;
they cannot be disabled by user request and must not be invoked as skills.
Superpowers skills are selected automatically from task context or directly by
the user. Follow system/user instructions and safety over every layer.
