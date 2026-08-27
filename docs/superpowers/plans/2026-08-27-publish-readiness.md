# Publish Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a versioned gipypowers release whose update notice works for existing Claude and Codex installations and whose README documents every user-facing capability.

**Architecture:** Keep updates passive and safe: the SessionStart hook performs a bounded, throttled version check, while the check-for-updates skill chooses `git pull` for checkouts and marketplace refresh for Claude-managed caches. Keep Claude and Codex manifests pointed at the same skills and host-specific hook manifests; document the shared automatic layers and on-demand Superpowers boundary in one concise README.

**Tech Stack:** Node.js CommonJS hooks, `node:test`, JSON manifests, Markdown documentation, npm scripts.

## Global Constraints

- Preserve existing uncommitted self-update files; do not overwrite user changes.
- Automatic capabilities remain always on; only Superpowers skills are user-selected.
- Update checks are best-effort, silent on failure, throttled to 24 hours, and never mutate a Claude cache.
- Keep the always-on payload below the repository's tested budget and support both Claude Code and Codex manifests.

---

### Task 1: Version and update-check release contract

**Files:**

- Modify: `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`
- Modify: `hooks/lib/update-check.js`, `skills/check-for-updates/SKILL.md`
- Test: `tests/update-check.test.mjs`

- [ ] Write tests for release-version consistency, malformed/failed remote responses, and actionable notices for both checkout and cache installs.
- [ ] Run `node --test tests/update-check.test.mjs` and confirm the new assertions fail before implementation.
- [ ] Bump the release version consistently (minor feature release), make the remote endpoint configurable without changing its GitHub default, validate HTTP status and semver, and keep the notice actionable without silent writes.
- [ ] Update the skill's commands and wording for both Claude marketplace caches and Codex/manual Git checkouts.
- [ ] Run the focused test and `npm test`; commit as `chore: prepare publish release`.

### Task 2: Claude/Codex manifest parity checks

**Files:**

- Modify: `tests/manifest.test.mjs`, `tests/hook.test.mjs` if needed
- Inspect: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `hooks/hooks.json`, `hooks/hooks-codex.json`

- [ ] Add assertions that both manifests expose the same plugin version, skills directory, automatic-capability markers, and the correct host hook files.
- [ ] Run `node --test tests/manifest.test.mjs tests/hook.test.mjs` and fix only parity or publication regressions.
- [ ] Run `npm run lint` and commit as `test: cover host manifest parity`.

### Task 3: Complete publication README

**Files:**

- Modify: `README.md`

- [ ] Document installation for Claude Code marketplace and Codex/manual checkout, automatic layer behavior, helper triggers, Superpowers selection, subagent behavior, update flow, configuration/opt-out, compatibility, and troubleshooting.
- [ ] Include concrete commands and paths (`npm test`, `/plugin`, `git pull`, `GIPYPOWERS_NO_UPDATE_CHECK=1`) without duplicating internal implementation prose.
- [ ] Keep the guide within 200–400 words where possible, then run `git diff --check` and the full test/lint suite.
- [ ] Commit as `docs: document publish workflow`.

### Task 4: Release verification

**Files:**

- Inspect: all changed manifests, hooks, tests, README, and `NOTICE`

- [ ] Run `npm test`, `npm run lint`, and `git diff --check` from a clean release candidate state.
- [ ] Manually smoke-check SessionStart payload generation with Claude and Codex environment variables and verify the update notice remains bounded/offline-safe.
- [ ] Report exact version, commands, and any remaining publish action; do not claim release readiness without command output.
