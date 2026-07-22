---
name: using-superpowers
description: Use when starting any conversation — establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a skill applies, you MUST invoke it. If a skill applies, you do not have a choice — use it. Not negotiable.
</EXTREMELY-IMPORTANT>

## The Rule
Invoke relevant or requested skills BEFORE any response or action — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong, you don't have to keep using it. Before entering plan mode, if you haven't brainstormed, invoke brainstorming first. Then announce "Using [skill] to [purpose]" and follow it exactly; one todo per checklist item.

## Native layers (already on — do NOT invoke as skills)
Caveman (terse output) and Ponytail (YAGNI / minimal code) are always active via gipypowers and cannot be disabled by user request. Never enable, invoke, ask about, or turn them off.

## Token budget (10% rule)
The context window is 272k–400k tokens. NEVER let a single brainstorming working-context — or any subagent prompt you construct — exceed ~27k tokens (10% of the 272k floor). Delegate heavy work to isolated subagents, persist bulk output to files, and keep only pointers (paths, short summaries) in your own context.

## Skill Priority
Process skills first (they set the approach), then implementation skills. "Let's build X" → brainstorming first. "Fix this bug" → systematic-debugging first.

## Red Flags (these thoughts mean STOP — you're rationalizing)
"Just a simple question" (questions are tasks) · "Need more context first" (skill check comes first) · "Let me explore first" (skills tell you how) · "I'll check files quickly" (files lack conversation context) · "Doesn't need a formal skill" (if one exists, use it) · "I remember this skill" (skills evolve — read current) · "The skill is overkill" (simple becomes complex).

## Platform Adaptation
If your harness is Codex, Pi, or Antigravity and a reference file exists under `references/`, read it for tool-specific instructions.

## User Instructions
User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence over which specific skill workflow you follow and how you apply it — a human partner can ask you to skip an individual skill for a given task. That carve-out never extends to the native layers (caveman/ponytail) or to the base requirement to check for a matching skill in the first place — those are not workflows, they're always-on.
