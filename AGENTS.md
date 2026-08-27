# Repository Guidelines

## Project Structure & Module Organization

`skills/` contains each distributable workflow, with its `SKILL.md`, optional
scripts/references, and required `agents/openai.yaml` metadata. `hooks/` holds
CommonJS lifecycle hooks plus Claude and Codex hook manifests. `rules/` contains
the always-on Caveman and Ponytail instructions. Tests live in `tests/` as Node
test files; design notes and plans belong in `docs/superpowers/`.

Keep `.claude-plugin/plugin.json` with `hooks/hooks.json`, and
`.codex-plugin/plugin.json` with `hooks/hooks-codex.json`, synchronized whenever
plugin wiring changes.

## Build, Test, and Development Commands

- `npm test` runs all `node:test` checks in `tests/*.test.mjs`.
- `node --test tests/manifest.test.mjs` runs one focused test file.
- `npm run lint` checks JavaScript with ESLint.
- `npm run format` applies Prettier to repository files; review its diff before
  committing.

Tests inspect source content and manifests. Treat failures as an intentional
contract mismatch, not flaky behavior.

## Coding Style & Naming Conventions

Use Prettier formatting: two-space indentation and single quotes in JavaScript.
Write hook code as CommonJS; `hooks/package.json` intentionally pins it. Name
tests `<topic>.test.mjs`, skills with kebab-case directories (for example,
`skills/check-for-updates/`), and metadata files `agents/openai.yaml`.

Do not remove deliberate empty catch blocks in hooks: ESLint permits them for
best-effort, silent failures. Preserve platform-neutral environment-variable
handling in hook scripts.

## Testing Guidelines

Run `npm test` and `npm run lint` before opening a pull request. Add or update a
focused `node:test` assertion for changed hook, manifest, or skill invariants.
Every new skill requires both `SKILL.md` and `agents/openai.yaml`. Skills that
spawn subagents must retain the literal `27k` budget rule and update
`tests/budget-rule.test.mjs` when applicable.

## Commit & Pull Request Guidelines

Recent history uses concise imperative subjects, commonly conventional prefixes:
`feat: add update check`, `chore: format tooling`, or `fix: preserve hook path`.
Keep commits scoped. Pull requests should explain behavior and manifest changes,
link the issue when one exists, and include test/lint results. Include screenshots
only for user-visible UI or rendered-document changes.

## Attribution & Configuration

This plugin adapts MIT-licensed upstream work. Update `NOTICE` when adding
adapted content. The update check is best-effort; set
`GIPYPOWERS_NO_UPDATE_CHECK=1` to disable it locally.
