# Gipypowers v1.0.0: Shared Memory and Native Orchestration

## Goal

Evolve Gipypowers from a Claude Code/Codex behavior plugin into a shared,
portable intelligence layer for Codex, Claude Code, and Hermes Agent. Keep
execution, permissions, and model calls inside each host. Add durable project
memory, bounded task recovery, automatic task-to-skill routing, and safe
host-aware update handling without an always-running service or runtime
dependency.

## Baseline

- Checked-out release: `0.5.0`, commit `40ad6c6`.
- Baseline: `npm test` passes 53 tests; `npm run lint` passes.
- Current architecture: 14 on-demand skills; six rule source files with 14
  always-on capability entries indexed by `rules/automatic-capabilities.json`; CommonJS session and
  subagent hooks; Claude and Codex compatibility manifests; a 24-hour,
  best-effort update notice.
- Baseline SessionStart output measured 11,565 characters / 1,708 words. The
  hook checks GitHub synchronously for up to 1.5 seconds.
- Existing specs explicitly chose user-selected Superpowers and notification-
  only updates. v1 intentionally replaces those behaviors because automatic
  skill routing and safe host-managed updates are now requirements.

## Architecture

### Shared core

Add a zero-dependency CommonJS core and `gipypowers` CLI. It owns project-root
detection, automatic capability context, deterministic task routing, durable
memory, temporary task checkpoints, stable release discovery, semver, and
update diagnostics. It never calls an LLM or executes project tools.

Each recognized repository gets `.gipypowers/memory/` with human-readable
Markdown pages and a generated lightweight index. Pages carry category, title,
version, source, confidence, tags, timestamps, and revision history. Updates
require the expected current version; stale writes fail with a conflict and
must be reconciled. Durable memory is committed with the project. Temporary
task state is kept under `.gipypowers/state/` and ignored by Git. Retrieval is
lexical, bounded by result count and characters, and never loads the full store.
The CLI supports init, list, search, read, create, revise, archive, delete, and
Markdown export. Secret-like values and oversized raw logs are rejected.

Hooks initialize memory only in a detected project. Session-start recovery
loads a compact task checkpoint and memory contract. Prompt-submit routing
matches task type to no more than three existing skills and retrieves only
relevant memory. The model uses its host-native tools to read and write code,
run validation, and checkpoint progress. Repeated identical failures are
bounded; after two changed recovery attempts the agent changes strategy or
reports a concrete blocker. Completion clears temporary task state and stores
only validated, reusable lessons.

### Host adapters

- **Codex:** retain `.codex-plugin/plugin.json`; add the current portable
  `plugin.json`. Use plugin `SessionStart` and `UserPromptSubmit` commands with
  Codex's top-level hook output format. Hooks remain subject to Codex hook trust
  and local-client availability.
- **Claude Code:** retain `.claude-plugin/plugin.json`; register
  `SessionStart` and `UserPromptSubmit` command hooks with Claude's
  `hookSpecificOutput` envelope. Use marketplace/CLI update handling; never
  write to Claude-managed caches directly.
- **Hermes Agent:** add a root plugin manifest and a thin Python adapter that
  registers the shared skills, a bounded system prompt section, and a
  `pre_llm_call` memory lookup. The adapter calls the same Node CLI and degrades
  without Node. Project-local Hermes plugins remain opt-in; installation must
  not change Hermes trust or enable settings.

All adapters reuse the same rule files, skill definitions, routing table,
memory schema, CLI, and release policy. No adapter launches a competing agent
loop, infers permission grants, or auto-approves host actions.

### Autonomy and skill routing

Route feature work to planning, TDD, and verification; bugs to systematic
debugging, regression tests, and verification; refactors to focused analysis,
tests, and verification; review requests to review guidance; and memory/update
requests to their dedicated workflows. Routing is deterministic and bounded;
the host model selects and loads those existing skills without another model
call. Planning remains proportional to risk and scope. Clear tasks proceed
inline without an approval ceremony. Ask only for missing critical information,
permission boundaries, or high-risk irreversible work.

Use OpenHands patterns as design inputs: explicit task state, event-aligned
checkpoints, clear finished/blocked/error status, bounded recovery, and
verification after tool actions. Do not reproduce its model loop, tool runtime,
workspace abstraction, or server. Native host loops and tools remain authoritative.

### Update policy

Discover only the latest stable GitHub release over bounded HTTPS; compare full
SemVer, honor opt-out and version pinning, validate repository/tag/version
identity, and persist non-sensitive diagnostics. Never download or execute
remote scripts. Apply an update only through a supported host-native manager,
on a fresh session start, when its provenance and release are verifiable and
the manager can preserve user data. Otherwise show the exact host update
command. Do not run broad Codex marketplace upgrades from a plugin hook. Do
not mutate managed caches, user settings, project memory, or an active session.

### Licensing

Keep existing MIT attributions. Implement the memory format and CLI natively;
do not copy OpenHands SDK or brain.md code. Document OpenHands (MIT) and
brain.md (Apache-2.0) as architectural references, not bundled code. Preserve
all notices if later code is adapted from either source.

## Quality and compatibility

- Node.js 18+, CommonJS hooks, no new runtime packages or external services.
- Keep current Claude/Codex manifests synchronized with `package.json`, and
  add a portable plugin manifest for current Codex discovery.
- Preserve all existing skills, always-on rules, helpers, and the tested `27k`
  subagent budget rule. Remove mandatory approval gates that conflict with
  autonomous execution; keep safety, validation, and verification.
- Tests use temporary projects and mocked host commands. No host config or
  installation cache is modified by tests.
- Report measurable startup payload and hook timing, retrieval bounds, test
  coverage, and host integration evidence. Do not claim live host compatibility
  without running that host.

## Host reference contracts reviewed

- OpenHands Software Agent SDK: <https://github.com/OpenHands/software-agent-sdk>
- OpenHands SDK agent and state sources: <https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/agent/agent.py>
  and <https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/conversation/state.py>
- brain.md project protocol and CLI: <https://github.com/mindmuxai/brain.md>
- Codex plugins and hook contract: <https://developers.openai.com/plugins/build/plugins>
  and <https://learn.chatgpt.com/docs/hooks>
- Claude Code plugin and hook contract: <https://code.claude.com/docs/en/plugins>
  and <https://code.claude.com/docs/en/hooks>
- Hermes plugin and hook contracts: <https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md>
  and <https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/hooks.md>

## Validation evidence — 2026-10-16

- Baseline `npm test`: 53/53; v1.0.0 `npm test`: 85/85. `npm run lint`,
  Prettier checks, Python syntax compilation, and `git diff --check` pass.
- SessionStart context: 10,297 characters / 1,525 words, compared with the
  v0.5.0 output at 11,565 characters / 1,708 words. That is about 11% fewer
  characters and words. Median local hook process time was 48.9 ms versus
  38.2 ms with update checks disabled; the added local initialization costs
  about 11 ms. A stale release check can add up to its 1.8-second network limit.
- Retrieval benchmark: a 100-page temporary memory store returned the top
  three matching pages in a 3.58 ms median and 364 context characters. Runtime limits
  prompt memory to three pages / 2,200 characters and total prompt context to
  6,000 characters; Hermes session context is capped at 4,000 characters.
- `npm pack --dry-run` contains 106 intended runtime, host manifest, skill, and
  design files (162,202 unpacked bytes); the allowlist excludes local host
  settings, contributor-only `AGENTS.md`, and generated Python bytecode.
- Codex CLI 0.163.0 installed v1.0.0 from an isolated temporary marketplace
  and `CODEX_HOME`; Claude Code 2.1.289 validated and installed from an isolated
  temporary marketplace and `CLAUDE_CONFIG_DIR`; Hermes Agent 0.21.5 passed
  `hermes plugins doctor` with manifest parsing, import, and hook registration.
  The Hermes adapter's live hook call was also exercised with a mocked host.
- These checks prove host discovery, installation, manifest parsing, and
  adapter registration. They do not include a live model-driven coding turn.
  Claude's validator reports that the repository contributor `CLAUDE.md` is
  not plugin context; shared runtime instructions are injected by hooks and
  skills. Update installation remains host-manager-owned to protect caches and
  local modifications; Codex requires refreshing its marketplace and then
  selecting the plugin update in its Plugins manager.
