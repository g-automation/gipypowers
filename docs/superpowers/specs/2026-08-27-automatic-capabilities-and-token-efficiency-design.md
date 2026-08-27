# Automatic Capabilities and Token-Efficient Superpowers

## Goal

Make every non-Superpowers capability from Caveman, Ponytail, i-have-adhd, and
no-ai-slop automatic after `gipypowers` activation. Keep Superpowers skills
user-selected while making their shared workflow precise, compact, and portable
across Claude and Codex models.

## Automatic Capability Model

Create compact local rule files and an index under `rules/`. The index declares
capability name, purpose, precedence, and payload marker. Consolidate contextual
behavior from Caveman helpers (`caveman-commit`, `caveman-review`, `cavecrew`,
`caveman-help`, `caveman-compress`, `caveman-stats`) and Ponytail helpers
(`ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`,
`ponytail-help`) instead of injecting their full upstream `SKILL.md` files.
ADHD and No-AI-Slop rules remain automatic. Interactive commands become
contextual behavior; metrics remain user-requested, and no Superpowers skill is
auto-invoked.

## Hook and Model Protocol

`SessionStart` loads the indexed local rules in declared order and then the
Superpowers bootstrap. `SubagentStart` emits only a compact summary and the
`27k` budget. Claude and Codex receive identical content with their existing
platform-specific JSON envelopes. Silent-fail behavior remains intact.

Precedence is explicit: system/user instructions and safety, task request,
ADHD clarity, No-AI-Slop precision, Caveman concision, Ponytail engineering,
contextual helper capabilities, then invoked Superpowers workflow. Use literal,
short instructions and examples; do not branch prompts by model name. Target
Sonnet 5 Medium, Opus 5 Medium, GPT-5.6 Terra Light, and GPT-5.6 Luna Medium
through the common protocol and budget contracts.

## Quality and Verification

Automatic reviews produce only evidence-backed, actionable findings in
`location — problem — correction` form. Automatic compression removes filler,
tangents, and recaps without dropping facts, code, uncertainty, or decisions.
Validation, error handling, minimal tests for non-trivial logic, and
verification-before-completion remain mandatory. `stats` and full help output
stay opt-in to avoid unsolicited token cost.

Tests cover index completeness, marker presence, precedence, missing-file
fallback, both hook envelopes, subagent reminders, no Superpowers auto-
invocation, and aggregate payload size. Documentation and `NOTICE` record the
expanded capability set and upstream attributions. No runtime reads outside
this repository or new dependencies.
