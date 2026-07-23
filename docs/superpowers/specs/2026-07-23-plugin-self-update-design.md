# Plugin self-update mechanism

## Purpose

Users currently have no reliable way to move to a newer gipypowers release
without a full reinstall. Investigation found the actual root cause: Claude
Code already tracks plugin versions itself (`~/.claude/plugins/installed_plugins.json`
pins an installed version copied from the marketplace git clone into a
version-keyed cache dir), keyed off `.claude-plugin/plugin.json`'s `version`
field — but that field was left at `0.1.0` while `package.json` had already
moved to `0.2.0`. Claude Code's own update flow has nothing to detect because
the manifest never said anything changed.

Codex has no equivalent cache/version system — a Codex install is just a
directory the user points at, so "update" there is inherently `git pull`.

This spec covers: fixing the version-drift bug, adding a passive low-noise
update notice to session start, and adding an explicit on-demand check/update
skill that gives the right instructions (or action) for whichever install
type it detects.

## Scope

New: one hook-side library module, one skill, two test files, a version bump,
a README section. No new runtime dependencies (stdlib `https`/`fs` only). No
change to how skills or hooks are registered in the two plugin manifests —
`check-for-updates` lands under `skills/` and both manifests already point at
that directory generically (per `.claude/skills/add-skill/SKILL.md`).

Explicitly out of scope: auto-pulling or auto-copying new plugin files
without user action. A background process silently mutating the user's
plugin files — especially inside Claude Code's own host-managed cache
directory, which the host's own bookkeeping (`installed_plugins.json`)
expects to control — was considered and rejected as an approach during
brainstorming.

## Changes

### A. Version-drift fix (root cause)

- Bump `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` `version`
  from `0.1.0` to `0.2.0`, matching `package.json`.
- Going forward, a release bumps all three together — enforced by (E) below.

### B. Passive update notice (`hooks/lib/update-check.js`, new)

Exports:
- `isNewerVersion(remote, local)` — pure `x.y.z` numeric comparison. Returns
  `false` on equal, on local-newer, and on any unparseable input (safe
  default: never claims an update exists it can't confirm).
- `getUpdateNotice(root)` — orchestrator:
  1. Read local version from `<root>/package.json`.
  2. Read the cache file at `~/.gipypowers/update-check.json`
     (`{ lastChecked: <epoch ms>, latestVersion: <string> }`); missing/corrupt
     file is treated as empty.
  3. If `GIPYPOWERS_NO_UPDATE_CHECK` is set, or `Date.now() - lastChecked <
     24h`, skip the network step.
  4. Otherwise, issue one bounded HTTPS GET (~1.5s timeout) for
     `https://raw.githubusercontent.com/g-automation/gipypowers/main/package.json`,
     parse `.version`, and rewrite the cache file with the new
     `lastChecked`/`latestVersion` (write `lastChecked` even on failure, so a
     persistently offline machine doesn't retry the network every session —
     `latestVersion` is left untouched on failure so a previously-discovered
     notice doesn't flicker away on a transient error).
  5. Return a single-line string (`"gipypowers vX.Y.Z available (you have
     vA.B.C) — run /check-for-updates"`) if the cached `latestVersion` is
     newer than local, else `''`.
  Every step wrapped in try/catch; any failure anywhere yields `''`.

- `hooks/gipypowers-activate.js`: after building the existing payload, call
  `getUpdateNotice(ROOT)` and append the result as a trailing line if
  non-empty. No change to the payload when there's nothing to report (the
  common case) — the existing word-budget test is unaffected.

### C. Explicit update skill (`skills/check-for-updates/`, new)

`SKILL.md` + `agents/openai.yaml` per the standard skill shape. Behavior the
skill instructs the agent to follow:
1. Read local version (`package.json` at the plugin root).
2. Fetch `raw.githubusercontent.com/g-automation/gipypowers/main/package.json`
   and read its version.
3. If equal or local is newer: report "up to date," stop.
4. If remote is newer, detect install type by checking whether the plugin
   root is inside a git working tree:
   - **Git working copy** (Codex install, manual clone, or this dev repo):
     run `git status` first; if clean, confirm with the user, then `git
     pull`. If dirty, tell the user to commit/stash first — never pull over
     uncommitted changes.
   - **Host-managed cache dir, no `.git`** (typical Claude Code marketplace
     install): tell the user to open `/plugin`, refresh the `gipypowers`
     marketplace entry, then update the plugin from there — this repo's code
     must never write into Claude Code's own cache/bookkeeping directly.
5. After a successful update (either path), overwrite
   `~/.gipypowers/update-check.json` with the now-current version so the
   passive notice clears on the next session.

Not a budget-bearing skill (no subagent spawning) — no `27k` rule, no entry
in `tests/budget-rule.test.mjs`'s `BUDGET_BEARERS` list needed.

### D. README

New "## Updating" section: how the passive notice works, the exact
`/check-for-updates` flow for each harness, and the
`GIPYPOWERS_NO_UPDATE_CHECK=1` opt-out.

### E. Tests

- `tests/version-sync.test.mjs` (new): reads all three manifest/package
  files, asserts their `version` fields are identical. Fails loudly if a
  future release bumps one file and not the others.
- `tests/update-check.test.mjs` (new): unit tests `isNewerVersion` only
  (patch/minor/major newer → true; equal → false; local-newer → false;
  malformed strings → false). No network, no home-dir I/O — deterministic.

## Test/doc fallout

- `tests/integration.test.mjs`'s payload-content and `<1875`-word tests still
  pass: `getUpdateNotice` returns `''` whenever there's no fresher cached
  version, which is the case for every test invocation (fresh checkout, no
  `~/.gipypowers` cache entry claiming a newer version than what's already
  checked out).
- `tests/manifest.test.mjs` needs no edit — it doesn't enumerate an exhaustive
  skill list.
- `.claude/skills/add-skill/SKILL.md` checklist followed as-is for the new
  skill; no manifest edits needed since both plugin manifests already point
  at `./skills/` as a directory.

## Out of scope

- No auto-pull / auto-copy without explicit user action.
- No change to Claude Code's or Codex's own plugin-management internals.
- No new dependency — `https`/`fs`/`os` stdlib only.
- No retry/backoff tuning beyond the single bounded attempt once per 24h;
  not worth the complexity for a once-a-day best-effort check.
