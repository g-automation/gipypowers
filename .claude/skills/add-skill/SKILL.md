---
name: add-skill
description: Checklist for adding a new skill to the gipypowers plugin under skills/ — correct file shape, budget-rule bookkeeping, and NOTICE attribution. Use when creating a new skill in this repo (not when using skills in general).
---

Adding a skill to `skills/<name>/` in this repo. Follow in order:

1. **Shape**: create `skills/<name>/SKILL.md` (YAML frontmatter with `name` + `description`, then body) and `skills/<name>/agents/openai.yaml` (Codex-facing `display_name`/`short_description`). `tests/manifest.test.mjs` enforces both exist for every skill — a skill missing either will fail `npm test`.

2. **Budget rule**: if the new skill spawns subagents or does heavy brainstorming/planning (i.e. it's budget-bearing like `brainstorming`, `writing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-superpowers`), its `SKILL.md` body must include the literal `27k` token-budget rule, and its path must be added to `BUDGET_BEARERS` in `tests/budget-rule.test.mjs`. Skipping this means the budget guarantee silently doesn't cover the new skill.

3. **Content invariants**: keep the session-start-facing content compressed — `tests/bootstrap.test.mjs` / `tests/rules.test.mjs` guard total word counts and disallow `@`-path force-loads inside skill bodies. Check those tests before adding large reference docs inline; put bulk reference material in a separate file the skill reads on demand instead.

4. **Attribution**: if the skill's content is adapted or compressed from one of the three upstream projects (caveman, ponytail, superpowers), add or update the corresponding entry in `NOTICE`.

5. **Manifests**: if the skill needs to be reachable from both harnesses, no manifest edit is needed — `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` both point at `./skills/` as a directory, so new subdirectories are picked up automatically. Only touch the manifests if you're changing hook wiring, not for a plain new skill.

6. **Verify**: run `npm test` from repo root. All 24+ tests must pass before considering the skill done.
