# Insightful, Concise Code Comments

## Goal

Make Claude and Codex produce code comments that add technical insight without
verbose or lexical narration. The rule applies to comments in source code and
repository artifacts, not to the agent's general response style.

## Design

Update `rules/ponytail-full.md`, the shared always-on rule source, to require
comments only when they explain a non-obvious reason: an invariant, contract,
constraint, or deliberate trade-off. Each comment should be direct and no longer
than one line. Comments must explain why the code or constraint exists, not
paraphrase code, narrate work history, or add vague/adjectival context.

Do not change hooks or manifests. Claude and Codex already receive this rule
through the existing session-start payload, so a single source avoids drift and
keeps payload growth minimal.

## Verification

Extend `tests/rules.test.mjs` with content assertions for the new comment
guidance. Assertions should check stable policy phrases (non-obvious reason,
why, one line, and prohibited paraphrase/history) rather than attempt to score
natural-language quality. Run `npm test` and `npm run lint` after the change.

## Scope

No new skill, hook, manifest, dependency, or comment-format syntax. Existing
`ponytail:` comments remain valid because they document deliberate constraints.
