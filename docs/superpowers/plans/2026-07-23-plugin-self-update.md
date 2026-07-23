# Plugin Self-Update Mechanism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users move to a newer gipypowers release without a full reinstall, via a passive session-start notice and an explicit on-demand check/update skill.

**Architecture:** Fix the version-drift bug that silently disabled Claude Code's own update detection; add a small CommonJS library (`hooks/lib/update-check.js`) that does a throttled, bounded, best-effort GitHub version check and feeds a one-line notice into the existing `SessionStart` hook payload; add a `check-for-updates` skill that does a live check and gives the right next action (`git pull` for a git checkout, `/plugin` marketplace refresh for a Claude-Code-managed cache dir).

**Tech Stack:** Node.js stdlib only (`fs`, `os`, `path`, `https`) — no new dependencies. `node:test` for the two new test files, matching the rest of `tests/`.

**Spec:** `docs/superpowers/specs/2026-07-23-plugin-self-update-design.md`

## Global Constraints

- No new runtime dependencies — stdlib only (`fs`, `os`, `path`, `https`).
- `hooks/**/*.js` stays CommonJS (`hooks/package.json` pins `"type": "commonjs"`) — use `require`/`module.exports`, never `import`/`export`, anywhere under `hooks/`.
- Every skill ships `SKILL.md` + `agents/openai.yaml` (per `.claude/skills/add-skill/SKILL.md`).
- Any repo-mutating action (e.g. `git pull`) runs only after explicit user confirmation and a clean `git status` — never pull over uncommitted changes.
- The passive check must never meaningfully slow or block session start: one bounded (~1.5s) network attempt, throttled to once per 24h, skippable entirely via `GIPYPOWERS_NO_UPDATE_CHECK=1`.
- `tests/integration.test.mjs`'s existing payload-content and `<1875`-word checks must keep passing unchanged.
- Test files: `.test.mjs`, ESM, `node:test` + `node:assert/strict`, mirroring the style already in `tests/manifest.test.mjs` / `tests/integration.test.mjs`.

---

### Task 1: Fix version drift + guard test

The root cause: `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` are stuck at `0.1.0` while `package.json` is at `0.2.0`. Claude Code's native update flow reads the manifest's `version` field to decide whether a new release exists — since it never changed, Claude Code never saw an update to offer.

**Files:**
- Create: `tests/version-sync.test.mjs`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`

**Interfaces:**
- Produces: no code interface — this task only guarantees `package.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json` all share the same `version` string. Later tasks don't depend on this beyond "the test suite is green."

- [ ] **Step 1: Write the failing test**

Create `tests/version-sync.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('version matches across package.json and both plugin manifests', () => {
  const pkg = j('package.json');
  const claudeManifest = j('.claude-plugin/plugin.json');
  const codexManifest = j('.codex-plugin/plugin.json');
  assert.equal(
    claudeManifest.version,
    pkg.version,
    `.claude-plugin/plugin.json version (${claudeManifest.version}) must match package.json (${pkg.version})`,
  );
  assert.equal(
    codexManifest.version,
    pkg.version,
    `.codex-plugin/plugin.json version (${codexManifest.version}) must match package.json (${pkg.version})`,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/version-sync.test.mjs`
Expected: FAIL — `.claude-plugin/plugin.json` version ("0.1.0") must match package.json ("0.2.0")

- [ ] **Step 3: Fix the version fields**

In `.claude-plugin/plugin.json`, change:

```json
  "version": "0.1.0",
```

to:

```json
  "version": "0.2.0",
```

In `.codex-plugin/plugin.json`, change:

```json
  "version": "0.1.0",
```

to:

```json
  "version": "0.2.0",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/version-sync.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/version-sync.test.mjs .claude-plugin/plugin.json .codex-plugin/plugin.json
git commit -m "fix: sync plugin manifest versions with package.json, guard against future drift"
```

---

### Task 2: Update-check library + unit test

**Files:**
- Create: `hooks/lib/update-check.js`
- Create: `tests/update-check.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (for Task 3): `module.exports.isNewerVersion(remote: string, local: string): boolean` and `module.exports.getUpdateNotice(root: string): Promise<string>` (empty string when there's nothing to report or on any failure).

- [ ] **Step 1: Write the failing test**

Create `tests/update-check.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isNewerVersion } = require('../hooks/lib/update-check.js');

test('isNewerVersion detects patch/minor/major bumps', () => {
  assert.equal(isNewerVersion('0.2.0', '0.1.0'), true);
  assert.equal(isNewerVersion('0.1.1', '0.1.0'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
});

test('isNewerVersion returns false when equal or local is already newer', () => {
  assert.equal(isNewerVersion('0.2.0', '0.2.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.2.0'), false);
});

test('isNewerVersion returns false for malformed input', () => {
  assert.equal(isNewerVersion('not-a-version', '0.1.0'), false);
  assert.equal(isNewerVersion('0.2.0', 'not-a-version'), false);
  assert.equal(isNewerVersion(null, '0.1.0'), false);
  assert.equal(isNewerVersion('1.2', '0.1.0'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/update-check.test.mjs`
Expected: FAIL — Cannot find module `../hooks/lib/update-check.js`

- [ ] **Step 3: Write the implementation**

Create `hooks/lib/update-check.js`:

```js
'use strict';
// Throttled, bounded, best-effort GitHub version check for the SessionStart hook.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(os.homedir(), '.gipypowers');
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json');
const THROTTLE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1500;
const REMOTE_URL =
  'https://raw.githubusercontent.com/g-automation/gipypowers/main/package.json';

function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const parts = v.trim().split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return nums;
}

function isNewerVersion(remote, local) {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  if (!r || !l) return false;
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeCache(cache) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch (_) {
    // silent-fail: cache is best-effort
  }
}

function fetchRemoteVersion() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let req;
    try {
      req = https.get(
        REMOTE_URL,
        { headers: { 'User-Agent': 'gipypowers-update-check' } },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              finish(JSON.parse(body).version || null);
            } catch (_) {
              finish(null);
            }
          });
        },
      );
      req.on('error', () => finish(null));
      req.setTimeout(FETCH_TIMEOUT_MS, () => {
        req.destroy();
        finish(null);
      });
    } catch (_) {
      finish(null);
    }
  });
}

function readLocalVersion(root) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ).version;
  } catch (_) {
    return null;
  }
}

async function getUpdateNotice(root) {
  try {
    const local = readLocalVersion(root);
    if (!local) return '';

    let cache = readCache();
    const stale =
      !cache.lastChecked || Date.now() - cache.lastChecked > THROTTLE_MS;

    if (stale && !process.env.GIPYPOWERS_NO_UPDATE_CHECK) {
      const remoteVersion = await fetchRemoteVersion();
      cache = {
        lastChecked: Date.now(),
        latestVersion: remoteVersion || cache.latestVersion,
      };
      writeCache(cache);
    }

    if (cache.latestVersion && isNewerVersion(cache.latestVersion, local)) {
      return `gipypowers v${cache.latestVersion} available (you have v${local}) — run /check-for-updates`;
    }
    return '';
  } catch (_) {
    return '';
  }
}

module.exports.isNewerVersion = isNewerVersion;
module.exports.getUpdateNotice = getUpdateNotice;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/update-check.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/lib/update-check.js tests/update-check.test.mjs
git commit -m "feat: add throttled GitHub update-check library"
```

---

### Task 3: Wire the notice into the SessionStart hook

**Files:**
- Modify: `hooks/gipypowers-activate.js` (full file, currently 55 lines)

**Interfaces:**
- Consumes: `getUpdateNotice(root: string): Promise<string>` from Task 2 (`hooks/lib/update-check.js`).
- Produces: no new interface — the hook's JSON stdout contract (`hookSpecificOutput.additionalContext` / `additional_context`) is unchanged; it may now include one trailing line.

- [ ] **Step 1: Replace the hook file**

Replace the full contents of `hooks/gipypowers-activate.js` with:

```js
#!/usr/bin/env node
'use strict';
// gipypowers SessionStart hook — injects the three always-on layers.
const fs = require('fs');
const path = require('path');
const { getUpdateNotice } = require('./lib/update-check');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8').trim();
  } catch (_) {
    return '';
  }
}

function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

(async () => {
  try {
    const caveman = read('rules/caveman-full.md');
    const ponytail = read('rules/ponytail-full.md');
    const bootstrap = stripFrontmatter(
      read('skills/using-superpowers/SKILL.md'),
    );

    let payload = `<EXTREMELY_IMPORTANT>
You have gipypowers — three layers, all mandatory. CAVEMAN and PONYTAIL are NATIVE, always active, and cannot be disabled by user request: never invoke them as skills, never ask to enable or disable them. SUPERPOWERS: checking for and invoking a matching skill is itself mandatory and non-optional; only which specific skill applies is task-driven.

${caveman}

${ponytail}

## SUPERPOWERS — your workflow skills
${bootstrap}
</EXTREMELY_IMPORTANT>`;

    const updateNotice = await getUpdateNotice(ROOT);
    if (updateNotice) payload += `\n\n${updateNotice}`;

    const env = process.env;
    let out;
    if (env.CURSOR_PLUGIN_ROOT) {
      out = { additional_context: payload };
    } else if (env.CLAUDE_PLUGIN_ROOT && !env.COPILOT_CLI) {
      out = {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: payload,
        },
      };
    } else {
      out = { additionalContext: payload };
    }
    process.stdout.write(JSON.stringify(out));
  } catch (_) {
    // silent-fail: never block session start
  }
})();
```

- [ ] **Step 2: Manual sanity check with the check disabled**

Run: `GIPYPOWERS_NO_UPDATE_CHECK=1 CLAUDE_PLUGIN_ROOT="$(pwd)" node hooks/gipypowers-activate.js`
Expected: prints one JSON object with `hookSpecificOutput.additionalContext` containing the caveman/ponytail/bootstrap text, no trailing update line, no errors, no hang.

- [ ] **Step 3: Run the existing test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — all tests including `tests/integration.test.mjs`'s payload-content and `<1875`-word checks.

- [ ] **Step 4: Commit**

```bash
git add hooks/gipypowers-activate.js
git commit -m "feat: surface update-check notice in the SessionStart payload"
```

---

### Task 4: `check-for-updates` skill

**Files:**
- Create: `skills/check-for-updates/SKILL.md`
- Create: `skills/check-for-updates/agents/openai.yaml`

**Interfaces:**
- Consumes: nothing from earlier tasks (this is agent-facing instructions, not code) — but its "clear the notice" step writes the same cache file shape Task 2 reads/writes (`~/.gipypowers/update-check.json`, `{lastChecked, latestVersion}`).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Create the skill directory and SKILL.md**

Create `skills/check-for-updates/SKILL.md`:

```markdown
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

## Step 1: Read the local version

```bash
ROOT="${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}"
node -pe "JSON.parse(require('fs').readFileSync('$ROOT/package.json','utf8')).version"
```

## Step 2: Read the latest published version

```bash
curl -fsSL https://raw.githubusercontent.com/g-automation/gipypowers/main/package.json \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).version"
```

If `curl` fails (no network, DNS error, timeout), report that the check
couldn't reach GitHub and stop — don't guess a version.

## Step 3: Compare

If the two versions are equal, or the local version is newer (dev checkout
ahead of `main`), report "gipypowers is up to date (vX.Y.Z)" and stop.

## Step 4: If a newer version exists, detect the install type

```bash
git -C "$ROOT" rev-parse --is-inside-work-tree 2>/dev/null
```

**Exit 0 (git working tree — Codex / manual clone / this dev repo):**

1. `git -C "$ROOT" status --porcelain` — if it prints anything, tell the user
   there are uncommitted changes and ask them to commit or stash first. Stop.
2. If clean, tell the user the version jump (e.g. "0.1.0 → 0.2.0") and ask
   for confirmation before pulling.
3. On confirmation: `git -C "$ROOT" pull`.

**Non-zero exit (no `.git` — Claude Code host-managed cache dir):**

Tell the user: "Newer gipypowers available (vX.Y.Z, you have vA.B.C). Open
`/plugin`, refresh the `gipypowers` marketplace entry, then update the
plugin from there — Claude Code will fetch the new version into its own
cache directory." Do not attempt to write into `$ROOT` yourself.

## Step 5: Clear the cached notice after a successful update

```bash
mkdir -p ~/.gipypowers
node -e "require('fs').writeFileSync(require('os').homedir()+'/.gipypowers/update-check.json', JSON.stringify({lastChecked: Date.now(), latestVersion: process.argv[1]}))" "$NEW_VERSION"
```

This keeps the passive session-start notice from repeating once the user is
already current.
```

- [ ] **Step 2: Create agents/openai.yaml**

Create `skills/check-for-updates/agents/openai.yaml`:

```yaml
interface:
  display_name: 'check-for-updates'
  short_description: 'Use when checking for or installing a gipypowers update.'
```

- [ ] **Step 3: Verify the skill shape**

Run: `ls skills/check-for-updates/ skills/check-for-updates/agents/`
Expected: `SKILL.md` in the first listing, `openai.yaml` in the second.

Run: `npm test`
Expected: PASS — the existing skill-shape/manifest tests aren't skill-list-exhaustive, so a new skill directory doesn't fail them.

- [ ] **Step 4: Commit**

```bash
git add skills/check-for-updates/
git commit -m "feat: add check-for-updates skill"
```

---

### Task 5: README + final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new — documents the behavior built in Tasks 1-4.

- [ ] **Step 1: Add an "Updating" section**

In `README.md`, insert a new section after `## How it works` and before `## Credits`:

```markdown
## Updating

A `SessionStart` hook checks GitHub once every 24h (best-effort, silent on
failure, bounded to ~1.5s) and adds one line to the injected context if a
newer release exists. Set `GIPYPOWERS_NO_UPDATE_CHECK=1` to disable this
check entirely.

To actually update:

- **Codex / manual clone:** the plugin directory is a normal git checkout —
  `cd` into it and `git pull`.
- **Claude Code marketplace install:** open `/plugin`, refresh the
  `gipypowers` marketplace entry, then update the plugin from there — Claude
  Code fetches the new version into its own cache directory.

Or ask the agent to run the `check-for-updates` skill, which detects which
of the two situations applies and does (or tells you) the right thing.
```

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: PASS — all tests, including the two new files from Tasks 1 and 2.

Run: `npm run lint`
Expected: PASS — no lint errors in `hooks/lib/update-check.js` or the modified `hooks/gipypowers-activate.js`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the update mechanism"
```
