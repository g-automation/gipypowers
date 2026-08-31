# Inline Execution and Token Efficiency

## Goal

Release gipypowers `0.4.0` with inline execution enforced by default and a
smaller always-resident instruction footprint, without removing existing
skills or changing Claude/Codex hook contracts.

## Behavior

- Session bootstrap states that work executes inline by default and must not
  present inline versus sub-agent as a choice.
- Existing sub-agent skills remain installed and available, but this release
  does not change their explicit-invocation model or add new sub-agent
  behavior.
- Automatic capabilities remain automatic, ordered by
  `rules/automatic-capabilities.json`, and cannot be invoked as skills.
- Superpowers remains user-selected and task-matched.

## Token strategy

- Compact duplicated guidance in the bootstrap, hook payload, and subagent
  reminder while retaining action-first output, anti-slop language, YAGNI,
  validation/security/test safeguards, and the literal `27k` budget invariant.
- Replace choice-oriented workflow wording with direct inline recipes where
  the current text suggests dispatching as a default.
- Keep progressive disclosure: detailed skills remain available on demand and
  are not copied into the SessionStart payload.
- Add measured ceilings for the always-resident payload and changed skills;
  existing ceiling tests remain authoritative for all untouched skills.

## Compatibility and versioning

- Preserve hook output envelopes for Claude, Codex, Cursor, and SDK fallback.
- Preserve all 14 skills, metadata files, automatic-capability markers, hook
  registrations, and update-check behavior.
- Synchronize `package.json`, `.claude-plugin/plugin.json`, and
  `.codex-plugin/plugin.json` at version `0.4.0`.
- Update user-facing README text to describe inline-default behavior and the
  token-efficiency focus.

## Tests

- Add regression assertions that bootstrap and session payload enforce inline
  execution and contain no inline/sub-agent choice prompt.
- Add assertions for compact payload/skill ceilings and preserved `27k` rule.
- Keep existing manifest, hook-envelope, capability-index, integration, and
  update-check tests passing.
- Run `npm test`, `npm run lint`, and `git diff --check` before completion.
