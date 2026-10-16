# Gipypowers v1.0.0 Implementation Plan

> **For agentic workers:** Execute inline by default with superpowers:executing-plans. Use sub-agent workflows only when the user explicitly invokes a sub-agent skill. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing 0.5.0 plugin to a tested, documented 1.0.0 shared intelligence layer for Codex, Claude Code, and Hermes Agent.

**Architecture:** A no-dependency CommonJS core owns project memory, task checkpoints, skill routing, release checks, and diagnostics. Claude/Codex hooks and a Hermes Python plugin adapt each host's event and context format while leaving execution and permissions to that host.

**Tech Stack:** Node.js 18+, CommonJS, Python standard library for Hermes, Node `node:test`, existing ESLint/Prettier.

## Global Constraints

- Preserve existing capability files and 14 skills, add the memory skill, keep manifest parity, and retain the literal `27k` budget rule.
- Do not add runtime dependencies, background services, LLM calls, or a competing execution engine.
- Do not mutate host-managed plugin caches, trust settings, or permission boundaries.
- Keep memory human-readable, selective, provenance-aware, conflict-safe, and free of secrets/raw logs.
- Use the native host execution loop; inline work remains the default and subagents remain optional.
- Finish with one implementation commit; amend it for corrections.

---

## File map

- `core/memory.js`: project memory schema, safe atomic writes, lexical retrieval,
  history, archive/delete/export.
- `core/task-state.js`: compact temporary progress, repeat-failure budget,
  checkpoint restore/clear.
- `core/skill-router.js`: deterministic task classification and bounded routes.
- `core/project.js` and `core/safe-paths.js`: project-root discovery and
  symlink-safe project storage paths.
- `core/update-check.js`: SemVer, stable release metadata, pin/opt-out, diagnostics,
  host-native update plan.
- `core/cli.js`: `gipypowers memory`, `task`, `route`, and `update` commands.
- `hooks/lib/activation.js`: shared session/prompt context for host envelopes.
- `hooks/gipypowers-activate.js` and hook manifests: dispatch SessionStart and
  UserPromptSubmit without breaking subagent context.
- `.agents/plugins/marketplace.json`, `.codex-plugin/plugin.json`,
  `.claude-plugin/plugin.json`, `plugin.yaml`, `__init__.py`: Codex, Claude,
  and Hermes installation metadata and adapters.
- `skills/*/SKILL.md`: concise autonomous workflow guidance; add a memory skill.
- `tests/*.test.mjs`: core contracts and
  mocked host registration.
- `README.md`, `CLAUDE.md`, `NOTICE`, `CHANGELOG.md`: installation,
  architecture, host limitations, licensing, and release notes.
- `package.json`, `package-lock.json`, and plugin manifests: synchronized 1.0.0.

## Tasks

### Task 1: Memory and task-state contracts

Write failing tests first for project initialization, selective ranking,
provenance/versioning, stale-write conflicts, secret rejection, archive/delete,
export, checkpoint recovery, and the two-retry cap. Implement the core APIs and
CLI; verify tests on isolated temporary projects. Use atomic replacement for
individual page/index/state files and never follow memory paths outside the
project memory root.

### Task 2: Automatic routing and shared activation

Write failing route and hook tests for features, bugs, refactors, reviews,
memory tasks, unknown prompts, compact context limits, and repeated routing.
Implement the route table and shared context builder. Add SessionStart recovery
and UserPromptSubmit memory lookup. Preserve each host's exact response shape
and fail open when parsing or memory access fails.

### Task 3: Host integrations

Write failing manifest parity and mocked Hermes registration tests. Add the
portable Codex manifest and prompt hook, Claude prompt hook, and Hermes plugin
that registers existing skill paths and shared memory callbacks. Verify all
manifest JSON/YAML shapes, command placeholders, platform fallback, and
permission/trust documentation. Do not change host config during installation.

### Task 4: Safe update path

Write failing tests for semantic versions including prereleases, stable GitHub
release identity, malformed/oversized responses, pinning, cache throttling,
timeouts, host-specific commands, opt-out, and safe fallback. Implement HTTPS
release discovery and diagnostics. Use targeted host-native update commands
only when the host advertises a supported safe path; otherwise return an
actionable instruction. Never invoke a shell or remote script.

### Task 5: Workflow autonomy and docs

Update bootstrap and relevant skills so matching workflows are selected
automatically, planning adapts to complexity, clear tasks execute inline, and
only genuine blockers/high-risk permission boundaries interrupt. Add the memory
skill and Hermes/Codex/Claude installation and compatibility instructions.
Document the baseline, architecture, limitations, lifecycle, retrieval
budgets, and update behavior. Update `NOTICE` only with accurate reference
attribution and no imported code claims.

### Task 6: Release and verification

Update `package.json`, lockfile, and all plugin versions to `1.0.0`. Run
`npm test`, `npm run lint`, `git diff --check`, format verification, and
mocked host checks. Measure session payload bytes/words, memory retrieval
results/characters, and hook elapsed time. Inspect the full diff and branch
status, then create the one implementation commit and prepare the PR text with
the evidence and host limitations.
