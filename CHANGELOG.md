# Changelog

## 1.0.1 — 2026-10-16

- Apply Codex marketplace updates automatically at safe session starts and
  verify the installed version through Codex.
- Document Claude Code marketplace auto-update and Hermes Gateway auto-apply
  requirements, including the one-time update needed by existing installs.
- Keep host-managed installation paths intact and provide actionable fallback
  guidance when native updates are disabled or unavailable.

## 1.0.0 — 2026-10-16

- Add shared, project-local Markdown memory with provenance, versioned edits,
  selective retrieval, archival, deletion, export, and reindexing.
- Add durable task checkpoints, bounded retries, and deterministic prompt-to-
  skill routing across Codex, Claude Code, and Hermes Agent.
- Keep code execution and permissions in host runtimes; add native lifecycle
  adapters without a competing model loop or runtime dependencies.
- Replace the old version-string notice with bounded stable-release discovery,
  semantic-version comparison, opt-out and version pinning, integrity metadata
  checks, and host-native update guidance.
- Preserve the existing behavior layers, Superpowers workflows, and `27k`
  subagent budget while reducing always-resident startup context.

See [the v1 design](docs/superpowers/specs/2026-10-16-gipypowers-v1-design.md)
for architecture, compatibility evidence, and limitations.
