# Gipypowers

Gipypowers v1.0.0 adds a shared, project-local memory and workflow orchestration layer to its existing concise communication rules and Superpowers library. It runs inside the host agent: Codex, Claude Code, and Hermes keep their native model, tools, permissions, and execution loop.

## Capabilities

- **Always-on rules:** Caveman, Ponytail, i-have-adhd, no-ai-slop, and contextual helpers. `rules/automatic-capabilities.json` controls rule order.
- **Automatic skill routing:** each submitted prompt is classified with deterministic rules. The host receives only matching skill excerpts and relevant project memory; longer workflow files remain available for progressive loading.
- **Persistent memory:** durable Markdown pages under `.gipypowers/memory/`, with provenance, confidence, optimistic versions, revision history, a rebuildable index, deduplication, retrieval, export, archive, and delete operations.
- **Task recovery:** compact checkpoints live under `.gipypowers/state/`, which Gipypowers adds to `.gipypowers/.gitignore`. Identical failures allow two retries before the guidance tells the agent to change strategy.
- **Autonomous execution guidance:** work runs inline by default with the host's native tools. Planning scales with task size; no custom model loop, background service, permission bypass, or subagent dependency is added.
- **Release updates:** stable GitHub release metadata is checked at most once per 24 hours. Codex receives a bounded, targeted marketplace refresh at session start; Claude Code and Hermes use their native automatic-update settings.

## Install and enable

### Codex

The repository includes `.agents/plugins/marketplace.json` and the required `.codex-plugin/plugin.json`. Install its GitHub marketplace:

```sh
codex plugin marketplace add g-automation/gipypowers
codex plugin add gipypowers@gipypowers
```

For a local checkout, use `codex plugin marketplace add .` from the repository root.

Review and trust the bundled hooks in `/hooks`; Codex does not run untrusted plugin hooks. Both `SessionStart` and `UserPromptSubmit` adapters use Codex's event-specific `additionalContext` output.

### Claude Code

Add the repository marketplace and install Gipypowers with Claude Code's `/plugin` manager:

```text
/plugin marketplace add g-automation/gipypowers
/plugin install gipypowers@gipypowers
```

Claude Code loads the standard `hooks/hooks.json` and plugin skills. Its native marketplace updater remains responsible for plugin files.

### Hermes Agent

Install and enable this repository as a Hermes plugin using Hermes's native plugin manager:

```sh
hermes plugins install g-automation/gipypowers
hermes plugins enable gipypowers
```

The root `plugin.yaml` and `__init__.py` adapter registers the shared skill directories and uses Hermes `pre_llm_call` plus its bounded system-prompt section when supported. Hermes project plugins are disabled by default; install or enable only in repositories you trust. Node.js is required for the shared core. The adapter does not change Hermes configuration or trust settings.

Host setup and consent remain host-owned. Where a host requires hook review or explicit plugin enablement, automatic routing begins after that native step.

## Project memory

Memory is portable, human-readable, and intended for Git. It stores durable decisions, requirements, conventions, and validated lessons. It rejects common secret patterns, raw logs, oversized pages, and exact duplicate content. Review pages in `.gipypowers/memory/`; the CLI provides version-aware edits and export.

```sh
node "$PLUGIN_ROOT/core/cli.js" memory search --query "authentication sessions"
node "$PLUGIN_ROOT/core/cli.js" memory list
node "$PLUGIN_ROOT/core/cli.js" memory export
```

To create a page, provide explicit type, title, and provenance:

```sh
node "$PLUGIN_ROOT/core/cli.js" memory add \
  --id auth-session-policy --type decision \
  --title "Session authentication policy" \
  --source "validated security review" --tags auth,security \
  --content "Revoke sessions server-side when an account is disabled."
```

Revise with `--expected-version` so stale writes fail instead of overwriting newer knowledge. Use `memory archive --id ID --summary REASON` for superseded decisions, `memory delete --id ID` to remove incorrect or sensitive material, and `memory reindex` to rebuild the index from Markdown.

## Updates

At session startup, Gipypowers checks the latest stable release. Codex has no marketplace auto-update preference, so Gipypowers asks Codex to refresh only the named Gipypowers marketplace when a stable release is newer and no tracked task is active. Codex refreshes installed files from configured marketplace entries ([Codex docs](https://developers.openai.com/plugins/build/plugins)); Gipypowers then confirms the installed version with the Codex plugin list. Attempts are limited to once per release per 24 hours.

Claude Code and Hermes control automatic application through their own settings, which Gipypowers does not override. For Claude Code, use `/plugin` → **Marketplaces** → **gipypowers** → **Enable auto-update**; third-party marketplaces default to auto-update off. Claude Code refreshes the marketplace after session start and the next session loads the updated files ([Claude plugin update docs](https://code.claude.com/docs/en/plugins/install)). For Hermes Agent, run `hermes config set plugins.auto_apply true`; its native Gateway scheduler checks tracked Git plugins at the configured interval (24 hours by default, only while the Gateway is active) and keeps the host's update security scan ([Hermes plugin update docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)). Both hosts continue to own update installation and activation.

Set `GIPYPOWERS_AUTO_UPDATE=0` or `.gipypowers/config.json`'s `autoUpdate` to `false` to disable Gipypowers' Codex refresh. `GIPYPOWERS_NO_UPDATE_CHECK=1` disables Gipypowers release checks and its Codex updater; it does not change Claude or Hermes settings. Set `GIPYPOWERS_VERSION_PIN` or `.gipypowers/config.json`'s `versionPin` to cap Gipypowers-managed updates. `node "$PLUGIN_ROOT/core/cli.js" update check` is read-only. `update startup --host HOST` runs the host-specific startup policy. Gipypowers never runs `git pull`, edits host-managed caches, auto-accepts marketplace commands, or executes a downloaded installer.

**One-time migration:** installations from before this updater integration (including v1.0.0) do not contain its updater code, so they cannot update themselves. Update that installed copy once with its host manager. Afterward, Codex refreshes on startup; Claude Code and Hermes follow the host settings above:

```sh
# Codex
codex plugin marketplace upgrade gipypowers

# Claude Code
claude plugin marketplace update gipypowers
claude plugin update gipypowers@gipypowers
# Then enable auto-update once in /plugin → Marketplaces → gipypowers.

# Hermes Agent
hermes plugins update gipypowers
# For future unattended updates, run once:
hermes config set plugins.auto_apply true
```

Then verify the installed plugin version in the host's plugin list. Existing releases cannot change an old installation until that one-time host update happens.

## Development and verification

```sh
npm test
npm run lint
```

The automated suite covers memory, routing, recovery, host hook envelopes, update policy, manifest wiring, and mocked host manager outputs. Native Codex and Claude Code install/update commands were smoke-tested for the v1.0.0 baseline. A live Hermes install was blocked by Hermes's security scanner, so Hermes updater behavior is covered by mocks rather than a live install. No interactive LLM coding session is claimed.

## Releases

Every version bump merged to `main` triggers `.github/workflows/release.yml`. The workflow verifies synchronized manifests, runs tests and lint, then creates the matching `vX.Y.Z` GitHub Release from that main-branch commit. A release is never published from an unmerged pull request; an existing release is left unchanged, and a conflicting tag stops the workflow for review.

## Architecture and attribution

`core/` is the shared dependency-free CommonJS layer. `hooks/lib/activation.js` adapts it to Codex and Claude Code. Root `__init__.py` adapts it to Hermes without replacing any host runtime. Design notes are in `docs/superpowers/specs/` and the implementation sequence in `docs/superpowers/plans/`.

The project retains the original Gipypowers style and adapts Caveman, Ponytail, i-have-adhd, no-ai-slop, and Superpowers under their existing MIT attributions. OpenHands and brain.md informed architecture patterns only; no upstream code was copied. See [NOTICE](NOTICE) for licensing and attribution.
