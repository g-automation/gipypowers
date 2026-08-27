# Automatic ADHD-Friendly and Anti-Slop Layers

## Goal

Make `gipypowers` automatically apply the useful output guidance from
`i-have-adhd` and `no-ai-slop` in both Claude and Codex. Superpowers remains the
only user-selected workflow layer.

## Architecture

Add two self-contained rule files under `rules/`: `i-have-adhd-full.md` and
`no-ai-slop-full.md`. Adapt only their always-useful response guidance:
action-first structure, bounded numbered steps, state/progress visibility,
concrete language, active voice, minimum effective edits, and removal of
generic AI phrasing. Do not carry over opt-in commands, draft-editor commands,
or mandatory `What changed` output.

Update `hooks/gipypowers-activate.js` to read and inject both files in the
existing SessionStart payload. Update `hooks/gipypowers-subagent.js` with a
compact reminder; subagents do not receive full duplicate rules. Keep all
runtime inputs inside this repository so packaged/cache installs work without
sibling plugin directories.

Apply precedence in the payload: system/user instructions and safety, ADHD
clarity/action structure, anti-slop precision, Caveman concision, Ponytail
engineering constraints, then Superpowers workflow selection. Existing hook
envelopes and silent-failure behavior remain unchanged.

## Documentation and Attribution

Update README, CLAUDE.md, AGENTS.md, and both plugin descriptions to describe
five automatic layers and Superpowers as on-demand workflow skills. Extend
`NOTICE` with attribution for `i-have-adhd` (Ayghri) and `no-ai-slop` (Peter
Yang), preserving their MIT notices and source URLs.

## Verification

Extend content, hook, integration, and payload-size tests with stable markers
for both new layers, precedence, and subagent reminders. Keep the existing
payload budget; condense copied guidance if needed. Run `npm test`,
`npm run lint`, and `git diff --check`.

## Scope

No external runtime reads, new dependencies, new activation flags, or changes
to Superpowers skill invocation semantics.
