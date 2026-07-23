---
name: check-for-updates
description: Use when the user asks to check for, or install, a gipypowers update, or when a session-start update notice appeared - detects whether this install is a git checkout or a Claude-Code-managed cache dir and gives the exact next action.
---

# Check For Updates

## Overview

gipypowers ships from `github.com/g-automation/gipypowers`. This skill finds
out whether a newer release exists and, if so, does (or tells you) the right
thing for how *this* copy was installed — a plain git checkout (Codex, manual
clone) has no host managing it, so `git pull` is safe and sufficient. A
Claude Code marketplace install lives in a host-managed cache directory with
no `.git` — never write into that directory directly; Claude Code owns it.

**Announce at start:** "I'm using the check-for-updates skill to check for a gipypowers update."

**Shell state does not persist between separately-run commands.** If your
tool runs each fenced block below as its own invocation, `ROOT`,
`LOCAL_VERSION`, and `REMOTE_VERSION` will not survive from one block to the
next. Either run Steps 1-5 as one combined shell session, or re-derive
`ROOT="${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}"` (and re-read/re-pass the
versions you already found) at the top of every later block that needs them
— every block below is written to be self-contained for exactly that reason.

## Step 1: Read the local version

```bash
ROOT="${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}"
LOCAL_VERSION=$(node -pe "JSON.parse(require('fs').readFileSync('$ROOT/package.json','utf8')).version")
echo "$LOCAL_VERSION"
```

## Step 2: Read the latest published version

```bash
REMOTE_VERSION=$(curl -fsSL https://raw.githubusercontent.com/g-automation/gipypowers/main/package.json \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).version")
echo "$REMOTE_VERSION"
```

If `curl` fails (no network, DNS error, timeout), report that the check
couldn't reach GitHub and stop — don't guess a version.

## Step 3: Compare

If `$REMOTE_VERSION` equals `$LOCAL_VERSION`, or the local version is newer
(dev checkout ahead of `main`), report "gipypowers is up to date
(v$LOCAL_VERSION)" and stop.

## Step 4: If a newer version exists, detect the install type

```bash
ROOT="${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}"
git -C "$ROOT" rev-parse --is-inside-work-tree 2>/dev/null
```

**Exit 0 (git working tree — Codex / manual clone / this dev repo):**

1. `git -C "$ROOT" status --porcelain` — if it prints anything, tell the user
   there are uncommitted changes and ask them to commit or stash first. Stop.
2. If clean, tell the user the version jump (`$LOCAL_VERSION` →
   `$REMOTE_VERSION`) and ask for confirmation before pulling.
3. On confirmation: `git -C "$ROOT" pull`.

**Non-zero exit (no `.git` — Claude Code host-managed cache dir):**

Tell the user: "Newer gipypowers available (v$REMOTE_VERSION, you have
v$LOCAL_VERSION). Open `/plugin`, refresh the `gipypowers` marketplace
entry, then update the plugin from there — Claude Code will fetch the new
version into its own cache directory." Do not attempt to write into `$ROOT`
yourself.

## Step 5: Clear the cached notice after a successful update

Only after a successful `git pull` (the git-working-tree path above) — the
host-managed-cache path never mutates anything here, so there is nothing to
clear; the passive check will naturally see the new version on its own next
throttled run.

Re-reads the version from disk rather than reusing an earlier variable —
after the pull, the checked-out `package.json` IS the new version, so this
block is self-contained and correct even if run as its own invocation:

```bash
ROOT="${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}"
NEW_VERSION=$(node -pe "JSON.parse(require('fs').readFileSync('$ROOT/package.json','utf8')).version")
mkdir -p ~/.gipypowers
node -e "require('fs').writeFileSync(require('os').homedir()+'/.gipypowers/update-check.json', JSON.stringify({lastChecked: Date.now(), latestVersion: process.argv[1]}))" "$NEW_VERSION"
```

This keeps the passive session-start notice from repeating once the user is
already current.
