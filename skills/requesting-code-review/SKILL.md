---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:** after each task in subagent-driven development, after completing major feature, before merging to main.

**Optional but valuable:** when stuck (fresh perspective), before refactoring (baseline check), after fixing complex bug.

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code reviewer subagent:** Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md).

**Placeholders:**
- `{DESCRIPTION}` — brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` — what it should do
- `{BASE_SHA}` — starting commit
- `{HEAD_SHA}` — ending commit

**3. Act on feedback:** fix Critical issues immediately, fix Important issues before proceeding, note Minor issues for later, push back if reviewer is wrong (with reasoning).

## Example

```
[Just completed Task 2: Add verification function]
You: Let me request code review before proceeding.
BASE_SHA=... HEAD_SHA=...
[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues: Important: Missing progress indicators. Minor: Magic number (100) for reporting interval.
  Assessment: Ready to proceed
You: [Fix progress indicators] [Continue to Task 3]
```

## Integration with Workflows

- **Subagent-Driven Development:** review after EACH task, catch issues before they compound, fix before moving to next task.
- **Executing Plans:** review after each task or at natural checkpoints, get feedback, apply, continue.
- **Ad-Hoc Development:** review before merge, review when stuck.

## Red Flags

**Never:** skip review because "it's simple," ignore Critical issues, proceed with unfixed Important issues, argue with valid technical feedback.

**If reviewer wrong:** push back with technical reasoning, show code/tests that prove it works, request clarification.

See template at: [code-reviewer.md](code-reviewer.md)
