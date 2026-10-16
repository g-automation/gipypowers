---
name: using-superpowers
description: Use when starting any conversation; check for and load matching Superpowers skills before responding
---

# Using Superpowers

Check for a matching Superpowers skill before every response or action, including
clarifying questions and file inspection. If one applies, load it; if not, keep
the response direct. User instructions override workflow details. Automatic
non-Superpowers capabilities are already active and must not be invoked.
Do this BEFORE any response; when ambiguity remains, ask the human partner one
focused question. Red Flags: skipping a matching skill, exposing reasoning, or
claiming completion without evidence. These are not workflows, they're always-on
rules for using the available layers.

## Priority

Execute inline by default; do not ask whether to use inline or sub-agent.
Single commit: every implementation ends with exactly one commit; use `git commit --amend` for later corrections.

Use process skills first, then implementation skills:

- Creative or behavior change: `brainstorming` first.
- Feature or bugfix: `test-driven-development` before code; use
  `systematic-debugging` for failures or unexpected behavior.
- Written requirements: `writing-plans` before implementation.
- Plan execution: `executing-plans` inline; use sub-agent skills only when explicitly invoked.
- Completion claim: `verification-before-completion` first.
- Review feedback: `receiving-code-review`; requesting review:
  `requesting-code-review`.

## Non-negotiables

Do not skip a matching skill because task looks simple. Do not create code,
plans, or artifacts before required brainstorming/approval gates. Preserve
security, validation, accessibility, error handling, and user intent. Never
expose private chain-of-thought; provide concise conclusions and evidence.

## Token budget

Keep each subagent working context under ~27k tokens (10% of the window).
Persist bulky output to files and pass paths, not dumps. Prefer the smallest
skill that covers task; avoid loading unrelated references.

## Native layers

Caveman, Ponytail, i-have-adhd, and no-ai-slop are always-on behavior layers;
they cannot be disabled by user request and must not be invoked as skills. Only
Superpowers skill choice is user-selected. Follow system/user instructions and
safety over every layer.
