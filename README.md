# gipypowers

gipypowers is a cross-host Claude Code/Codex plugin that combines concise communication with disciplined engineering. Install once; the non-Superpowers layers activate automatically on every session.

## What Runs Automatically

- **Caveman:** terse, high-signal responses; no filler or lexical commentary.
- **Ponytail:** YAGNI, standard-library-first choices, smallest safe diff, and performance/safety guardrails.
- **i-have-adhd:** action-first, scannable output with visible state and next steps.
- **no-ai-slop:** concrete, direct language that removes generic AI phrasing.
- **Helpers:** contextual review, commit-message, compression, help, stats, audit, debt, and gain guidance. Metrics and full help run only when requested.

These layers execute together and cannot be disabled by a user request. The indexed source of truth is `rules/automatic-capabilities.json`.

## Superpowers Workflow

Superpowers is the only user-selected layer. When a task matches, the bootstrap requires the relevant skill: brainstorming, writing/executing plans, TDD, systematic debugging, worktrees, parallel/subagent development, requesting/receiving review, verification, finishing branches, writing skills, and update checks. Work executes inline by default; use sub-agent workflows only when explicitly invoked. Subagents receive the same concise reminders and the literal `27k` context-budget rule.

## Install

- **Claude Code:** add the marketplace entry in `.claude-plugin/marketplace.json`, then install or refresh `gipypowers` from `/plugin`.
- **Codex:** install this repository as a plugin; `.codex-plugin/plugin.json` registers `skills/` and `hooks/hooks-codex.json`.
- **Local development:** `npm install` installs lint/test tools.

Both hosts load the same capabilities; only the hook envelope differs.

## Updates

SessionStart checks GitHub at most once per 24 hours, with a 1.5-second timeout and silent failure. A newer release produces an actionable notice—never a silent file mutation. Set `GIPYPOWERS_NO_UPDATE_CHECK=1` to opt out, or `GIPYPOWERS_UPDATE_URL` to point at a compatible `package.json` mirror.

- Git checkout (Codex/manual): run `git -C "$PLUGIN_ROOT" pull` after reviewing a clean worktree.
- Claude marketplace cache: open `/plugin`, refresh the marketplace, and update there; never edit the cache directly.

Ask the agent to use `check-for-updates` for detection and the correct host-specific command.

## Development

`npm test` runs all Node tests; `npm run lint` checks hooks; `git diff --check` catches whitespace errors. Keep manifests synchronized and update `NOTICE` when adapting upstream MIT work.

## Credits

Adapted from caveman, ponytail, i-have-adhd, no-ai-slop, and superpowers. See `NOTICE` for attribution and licenses.
