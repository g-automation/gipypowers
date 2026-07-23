# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`gipypowers` is the canonical gipyware plugin — a single install giving a coding agent three layers:

- **Caveman** (terse output) and **Ponytail** (YAGNI/smallest-diff) — always-on, injected via a `SessionStart` hook.
- **Superpowers** (brainstorming/planning/TDD/debugging/review) — 14 skills under `skills/`, loaded on demand.

It's a derivative/combination of three separate upstream MIT projects (caveman, ponytail, superpowers — see NOTICE), tuned for a ~10%-of-context (27k token) budget per subagent spawn. This repo is the _compiler/consumer_ of those three projects, not one of the upstreams itself — it has its own remote (`g-automation/gipypowers`).

Two parallel harness manifests describe the same plugin and **must be kept in sync** when hook or skill wiring changes:

- `.claude-plugin/plugin.json` → `hooks/hooks.json` (Claude Code)
- `.codex-plugin/plugin.json` → `hooks/hooks-codex.json` (OpenAI Codex)

## Testing

- Run all tests: `npm test` (`node --test tests/*.test.mjs`) — 24 tests, ~650ms, no framework beyond Node's built-in `node:test`.
- Run a single file: `node --test tests/<name>.test.mjs`.
- Tests are content-invariant guards — they read the actual markdown/JSON/JS source and assert on substrings/word counts (e.g. session-start payload stays under ~2500 words, every skill has both `SKILL.md` and `agents/openai.yaml`). Treat test failures here as "the content drifted from a guaranteed shape," not flaky tests.
- Lint: `npm run lint` (ESLint, flat config in `eslint.config.js`). Catch blocks that silently ignore an error (`catch (e) {}` / `catch (_) {}`) are this repo's deliberate convention, not lint violations — the config allows them intentionally.

## Gotchas

- **The 27k-token budget rule is a tested invariant.** It must remain present (literal string `27k`) in `skills/using-superpowers/SKILL.md` and 4 other subagent-spawning skills, listed by name in `tests/budget-rule.test.mjs`'s `BUDGET_BEARERS`. Any new skill that spawns subagents or does heavy brainstorming should carry this rule and be added to that list.
- **`hooks/package.json` pins `"type": "commonjs"` deliberately** — do not convert hook scripts to ESM.
- **Every skill needs `SKILL.md` + `agents/openai.yaml`** (Codex-facing display metadata) at minimum — a test enforces this across all skills under `skills/`.
- **Hook scripts branch on env vars to stay platform-agnostic** (`CLAUDE_PLUGIN_ROOT` vs `PLUGIN_ROOT`/`CURSOR_PLUGIN_ROOT`/`COPILOT_CLI`) — preserve this when editing `hooks/*.js`.
- **NOTICE attributes each derived layer to its upstream author** (caveman → Julius Brussee, ponytail → Dietrich Gebert, superpowers → Jesse Vincent/obra). Update it if new content is adapted from one of those projects.
- **`.superpowers/` is gitignored** — it holds a local SDD scratch ledger for this repo's own build-out, not distributed with the plugin.
- This repo is a sibling of `caveman/`, `ponytail/`, `superpowers/` under `plugins/`, but see `../CLAUDE.md` — those are separate upstream clones with their own git repos; never cross-commit between them and this one.
