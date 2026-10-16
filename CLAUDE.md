# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`gipypowers` is the canonical gipyware plugin — a shared intelligence layer for Codex, Claude Code, and Hermes Agent:

- **Caveman** (terse output) and **Ponytail** (YAGNI/smallest-diff) — always-on, injected via a `SessionStart` hook.
- **i-have-adhd** (action-first, scannable output) and **no-ai-slop** (concrete, direct writing) — always-on, injected via the same hook.
- **Superpowers** — 15 skills under `skills/`; prompt hooks route relevant guidance automatically and load only bounded excerpts.
- **Project memory and task recovery** — shared Node.js core stores versioned Markdown under `.gipypowers/memory/` and ignored checkpoints under `.gipypowers/state/`.
- **Host adapters** — Claude and Codex use lifecycle command hooks; Hermes uses `plugin.yaml`, `__init__.py`, and native hooks. Keep execution and permissions inside each host.

It's a derivative/combination of five separate upstream MIT projects (caveman, ponytail, i-have-adhd, no-ai-slop, superpowers — see NOTICE), tuned for a ~10%-of-context (27k token) budget per subagent spawn. This repo is the _compiler/consumer_ of those projects, not one of the upstreams itself — it has its own remote (`g-automation/gipypowers`).

Host manifests describe the same plugin and **must stay in sync** when shared skill, hook, or release wiring changes:

- `.claude-plugin/plugin.json` → `hooks/hooks.json` (Claude Code)
- `.codex-plugin/plugin.json` → `hooks/hooks-codex.json` (OpenAI Codex)
- `plugin.yaml` → `__init__.py` (Hermes Agent)

## Testing

- Run all tests: `npm test` (`node --test tests/*.test.mjs`) — no framework beyond Node's built-in `node:test`.
- Run a single file: `node --test tests/<name>.test.mjs`.
- Tests are content-invariant guards — they read the actual markdown/JSON/JS source and assert on substrings/word counts (e.g. session-start payload stays under ~2500 words, every skill has both `SKILL.md` and `agents/openai.yaml`). Treat test failures here as "the content drifted from a guaranteed shape," not flaky tests.
- Lint: `npm run lint` (ESLint, flat config in `eslint.config.js`). Catch blocks that silently ignore an error (`catch (e) {}` / `catch (_) {}`) are this repo's deliberate convention, not lint violations — the config allows them intentionally.

## Gotchas

- **The 27k-token budget rule is a tested invariant.** It must remain present (literal string `27k`) in `skills/using-superpowers/SKILL.md` and 4 other subagent-spawning skills, listed by name in `tests/budget-rule.test.mjs`'s `BUDGET_BEARERS`. Any new skill that spawns subagents or does heavy brainstorming should carry this rule and be added to that list.
- **`hooks/package.json` pins `"type": "commonjs"` deliberately** — do not convert hook scripts to ESM.
- **Every skill needs `SKILL.md` + `agents/openai.yaml`** (Codex-facing display metadata) at minimum — a test enforces this across all skills under `skills/`.
- **Hook scripts branch on env vars to stay platform-agnostic** (`CLAUDE_PLUGIN_ROOT` vs `PLUGIN_ROOT`/`CURSOR_PLUGIN_ROOT`/`COPILOT_CLI`) — preserve this when editing `hooks/*.js`.
- **NOTICE attributes each derived layer to its upstream author** (caveman → Julius Brussee, ponytail → Dietrich Gebert, i-have-adhd → Ayghri, no-ai-slop → Peter Yang, superpowers → Jesse Vincent/obra). Update it if new content is adapted from one of those projects.
- **`.superpowers/` is gitignored** — it holds a local SDD scratch ledger for this repo's own build-out, not distributed with the plugin.
- This repo is a sibling of `caveman/`, `ponytail/`, `superpowers/` under `plugins/`, but see `../CLAUDE.md` — those are separate upstream clones with their own git repos; never cross-commit between them and this one.
