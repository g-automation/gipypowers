# Gipypowers

Gipypowers v1.0.0 adds a shared, project-local memory and workflow orchestration layer to its existing concise communication rules and Superpowers library. It runs inside the host agent: Codex, Claude Code, and Hermes keep their native model, tools, permissions, and execution loop.

## Capabilities

- **Always-on rules:** Caveman, Ponytail, i-have-adhd, no-ai-slop, and contextual helpers. `rules/automatic-capabilities.json` controls rule order.
- **Automatic skill routing:** each submitted prompt is classified with deterministic rules. The host receives only matching skill excerpts and relevant project memory; longer workflow files remain available for progressive loading.
- **Persistent memory:** durable Markdown pages under `.gipypowers/memory/`, with provenance, confidence, optimistic versions, revision history, a rebuildable index, deduplication, retrieval, export, archive, and delete operations.
- **Task recovery:** compact checkpoints live under `.gipypowers/state/`, which Gipypowers adds to `.gipypowers/.gitignore`. Identical failures allow two retries before the guidance tells the agent to change strategy.
- **Autonomous execution guidance:** work runs inline by default with the host's native tools. Planning scales with task size; no custom model loop, background service, permission bypass, or subagent dependency is added.
- **Release checks:** stable GitHub release metadata is checked at most once per 24 hours. Updates remain under each host's package manager; Gipypowers does not rewrite plugin caches or run downloaded scripts.

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

`GIPYPOWERS_NO_UPDATE_CHECK=1` disables release checks. Set `GIPYPOWERS_VERSION_PIN` or `.gipypowers/config.json`'s `versionPin` to prevent upgrades beyond a chosen stable version. `node "$PLUGIN_ROOT/core/cli.js" update check` prints update status and the host's safe next step.

Gipypowers validates stable release tags and GitHub release metadata. Claude's native plugin update command, Hermes's plugin manager, and Codex's marketplace and Plugins manager own update application. If the host does not offer a safe targeted update path, Gipypowers reports the host command and next step. It never overwrites local plugin modifications, changes host config, mutates managed caches, or executes remote installation scripts.

## Development and verification

```sh
npm test
npm run lint
```

The automated suite covers memory, routing, recovery, host hook envelopes, update policy, manifest wiring, and mocked Hermes registration. This release was also installed or validated with the native Codex, Claude Code, and Hermes CLIs; no interactive LLM coding session is claimed.

## Architecture and attribution

`core/` is the shared dependency-free CommonJS layer. `hooks/lib/activation.js` adapts it to Codex and Claude Code. Root `__init__.py` adapts it to Hermes without replacing any host runtime. Design notes are in `docs/superpowers/specs/` and the implementation sequence in `docs/superpowers/plans/`.

The project retains the original Gipypowers style and adapts Caveman, Ponytail, i-have-adhd, no-ai-slop, and Superpowers under their existing MIT attributions. OpenHands and brain.md informed architecture patterns only; no upstream code was copied. See [NOTICE](NOTICE) for licensing and attribution.
