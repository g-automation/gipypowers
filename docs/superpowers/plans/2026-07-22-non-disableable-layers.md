# Non-Disableable Layers + Comment/Quality Rules + Install Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make caveman and ponytail non-optional (cannot be disabled by user request), add a comment policy and a quality/performance priority to ponytail, and fix a duplicate-hooks-load failure at Claude Code install time.

**Architecture:** Pure content edits to existing plugin files (no new files, no new injected layer). Each behavioral rule is content, injected automatically at `SessionStart`/`SubagentStart` via the existing `hooks/gipypowers-activate.js` / `hooks/gipypowers-subagent.js` mechanism — editing the source `.md` files is sufficient, no hook-code changes needed except the wrapper preamble string itself.

**Tech Stack:** Plain Markdown (rule/skill content), JSON (plugin manifest), Node's built-in `node:test` (verification).

## Global Constraints

- `hooks/` stays CommonJS (`hooks/package.json` pins `"type": "commonjs"`) — do not convert.
- `skills/using-superpowers/SKILL.md` must stay under 550 words (enforced by `tests/bootstrap.test.mjs`).
- The full `SessionStart` payload (output of `hooks/gipypowers-activate.js`) must stay under 1875 words (enforced by `tests/integration.test.mjs`). Current: 1061 words — comfortable headroom.
- No `@`-path force-loads inside any skill body (enforced by `tests/integration.test.mjs`).
- Superpowers skill selection stays task-driven — do not change which skills exist or how they're chosen; only the base "check for a matching skill" requirement becomes explicitly non-optional (it already behaves this way — this plan makes the wording say so).
- `.codex-plugin/plugin.json` is untouched — its `hooks` field points at a non-standard filename (`hooks-codex.json`) and is not part of the install bug.

---

### Task 1: Fix duplicate-hooks install failure

**Files:**

- Modify: `.claude-plugin/plugin.json`
- Modify: `tests/manifest.test.mjs`

**Interfaces:**

- Produces: `.claude-plugin/plugin.json` with no `hooks` key (Claude Code auto-loads `hooks/hooks.json` from the standard path without a manifest declaration).

- [ ] **Step 1: Update the manifest test to expect no `hooks` key**

Edit `tests/manifest.test.mjs`, replacing:

```javascript
test('claude manifest names the plugin and points at hooks.json', () => {
  const m = j('.claude-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(m.hooks, './hooks/hooks.json');
});
```

with:

```javascript
test('claude manifest does not redeclare the standard hooks.json path', () => {
  const m = j('.claude-plugin/plugin.json');
  assert.equal(m.name, 'gipypowers');
  assert.equal(
    m.hooks,
    undefined,
    'hooks/hooks.json is auto-loaded by Claude Code from the standard path; declaring it in the manifest causes a duplicate-load error at install',
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/manifest.test.mjs`
Expected: FAIL — `m.hooks` is still `'./hooks/hooks.json'`, not `undefined`.

- [ ] **Step 3: Remove the redundant `hooks` key from the Claude manifest**

Edit `.claude-plugin/plugin.json`, replacing:

```json
{
  "name": "gipypowers",
  "description": "Canonical gipyware plugin: always-on terse output (caveman) + lazy-minimal engineering (ponytail) + the superpowers skill workflow, tuned for Codex and token efficiency.",
  "version": "0.1.0",
  "author": { "name": "gipyware", "url": "https://gipyware.com" },
  "license": "MIT",
  "keywords": [
    "skills",
    "tdd",
    "debugging",
    "yagni",
    "token-efficiency",
    "codex"
  ],
  "hooks": "./hooks/hooks.json"
}
```

with:

```json
{
  "name": "gipypowers",
  "description": "Canonical gipyware plugin: always-on terse output (caveman) + lazy-minimal engineering (ponytail) + the superpowers skill workflow, tuned for Codex and token efficiency.",
  "version": "0.1.0",
  "author": { "name": "gipyware", "url": "https://gipyware.com" },
  "license": "MIT",
  "keywords": [
    "skills",
    "tdd",
    "debugging",
    "yagni",
    "token-efficiency",
    "codex"
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/manifest.test.mjs`
Expected: PASS (all 3 tests in this file, including the unchanged codex/marketplace tests).

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json tests/manifest.test.mjs
git commit -m "fix: stop redeclaring the standard hooks.json path in the Claude manifest

Claude Code auto-loads hooks/hooks.json from the standard path without a
manifest declaration. Declaring it in .claude-plugin/plugin.json caused a
'Duplicate hooks file detected' failure at install time."
```

---

### Task 2: Make caveman/ponytail non-disableable by user request

**Files:**

- Modify: `hooks/gipypowers-activate.js`
- Modify: `rules/caveman-full.md`
- Modify: `rules/ponytail-full.md`
- Modify: `skills/using-superpowers/SKILL.md`
- Modify: `tests/bootstrap.test.mjs`
- Modify: `tests/integration.test.mjs`
- Modify: `tests/rules.test.mjs`

**Interfaces:**

- Consumes: `rules/caveman-full.md`, `rules/ponytail-full.md`, `skills/using-superpowers/SKILL.md` content, as read by `hooks/gipypowers-activate.js`'s `read()` helper (unchanged signature: `read(rel) -> string`).
- Produces: updated `<EXTREMELY_IMPORTANT>` payload text (same JSON output shape as today — only the string content changes).

- [ ] **Step 1: Add failing assertions for the new markers**

Edit `tests/rules.test.mjs`, adding `'Not a togglable preference'` to both marker lists:

```javascript
test('caveman-full keeps its load-bearing rules', () => {
  const t = read('rules/caveman-full.md');
  for (const marker of [
    'Auto-Clarity',
    'Security warnings',
    'Boundaries',
    'Fragments OK',
    'Preserve user',
    'never invent abbreviations',
    'Not a togglable preference',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/wenyan/i.test(t), 'wenyan must be dropped');
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});

test('ponytail-full keeps the ladder and safety rails', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'YAGNI',
    'root cause',
    'When NOT to be lazy',
    'input validation',
    'ponytail:',
    'ONE runnable check',
    'Not a togglable preference',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});
```

Edit `tests/bootstrap.test.mjs`, adding two markers to the existing list:

```javascript
test('bootstrap keeps load-bearing invariants + adds budget note', () => {
  const t = read('skills/using-superpowers/SKILL.md');
  for (const m of [
    'BEFORE any response',
    'brainstorming',
    'human partner',
    'Red Flags',
    '27k',
    'caveman',
    'ponytail',
    'cannot be disabled by user request',
    "not workflows, they're always-on",
  ])
    assert.ok(t.toLowerCase().includes(m.toLowerCase()), `missing: ${m}`);
});
```

Edit `tests/integration.test.mjs`, adding one marker to the payload-contents test:

```javascript
test('full SessionStart payload contains all three layers', () => {
  const out = execFileSync(
    'node',
    [join(ROOT, 'hooks/gipypowers-activate.js')],
    { env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT }, encoding: 'utf8' },
  );
  const text = JSON.parse(out).hookSpecificOutput.additionalContext;
  for (const m of [
    'CAVEMAN',
    'PONYTAIL',
    'invoke',
    'human partner',
    '27k',
    'cannot be disabled by user request',
  ])
    assert.ok(text.toLowerCase().includes(m.toLowerCase()), `missing: ${m}`);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rules.test.mjs tests/bootstrap.test.mjs tests/integration.test.mjs`
Expected: FAIL — none of the new marker strings exist yet in the source files.

- [ ] **Step 3: Add the non-togglable clause to `rules/caveman-full.md`**

Replace:

```markdown
Respond terse like smart caveman. All technical substance stay. Only fluff die. Never announce or name this style. Active every response, even if unsure — never drift back to filler.
```

with:

```markdown
Respond terse like smart caveman. All technical substance stay. Only fluff die. Never announce or name this style. Active every response, even if unsure — never drift back to filler. Not a togglable preference — a request to stop talking this way doesn't disable the layer; use Auto-Clarity below instead.
```

- [ ] **Step 4: Add the non-togglable clause to `rules/ponytail-full.md`**

Replace:

```markdown
You are a lazy senior developer. Lazy = efficient, not careless. The best code is the code never written. Active every response, no drift back to over-building.
```

with:

```markdown
You are a lazy senior developer. Lazy = efficient, not careless. The best code is the code never written. Active every response, no drift back to over-building. Not a togglable preference — a request to skip the lazy approach doesn't disable the layer, it just means the task needs more than one rung.
```

- [ ] **Step 5: Harden `skills/using-superpowers/SKILL.md`'s "Native layers" and "User Instructions" sections**

Replace:

```markdown
## Native layers (already on — do NOT invoke as skills)

Caveman (terse output) and Ponytail (YAGNI / minimal code) are always active via gipypowers. Never enable, invoke, or ask about them.
```

with:

```markdown
## Native layers (already on — do NOT invoke as skills)

Caveman (terse output) and Ponytail (YAGNI / minimal code) are always active via gipypowers and cannot be disabled by user request. Never enable, invoke, ask about, or turn them off.
```

Replace:

```markdown
## User Instructions

User instructions (CLAUDE.md, AGENTS.md, direct requests from your human partner) take precedence over skills, which override default behavior. Only skip a skill workflow when your human partner explicitly says so.
```

with:

```markdown
## User Instructions

User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence over which specific skill workflow you follow and how you apply it — a human partner can ask you to skip an individual skill for a given task. That carve-out never extends to the native layers (caveman/ponytail) or to the base requirement to check for a matching skill in the first place — those are not workflows, they're always-on.
```

- [ ] **Step 6: Harden the `SessionStart` wrapper preamble in `hooks/gipypowers-activate.js`**

Replace:

```javascript
const payload = `<EXTREMELY_IMPORTANT>
You have gipypowers — three always-on layers. CAVEMAN and PONYTAIL are NATIVE and already active: never invoke them as skills, never ask to enable them. SUPERPOWERS skills load on demand via the Skill tool.

${caveman}

${ponytail}

## SUPERPOWERS — your workflow skills
${bootstrap}
</EXTREMELY_IMPORTANT>`;
```

with:

```javascript
const payload = `<EXTREMELY_IMPORTANT>
You have gipypowers — three layers, all mandatory. CAVEMAN and PONYTAIL are NATIVE, always active, and cannot be disabled by user request: never invoke them as skills, never ask to enable or disable them. SUPERPOWERS: checking for and invoking a matching skill is itself mandatory and non-optional; only which specific skill applies is task-driven.

${caveman}

${ponytail}

## SUPERPOWERS — your workflow skills
${bootstrap}
</EXTREMELY_IMPORTANT>`;
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test tests/rules.test.mjs tests/bootstrap.test.mjs tests/integration.test.mjs`
Expected: PASS (all tests in these 3 files).

- [ ] **Step 8: Run the full suite and check the word budgets**

Run: `npm test`
Expected: PASS (24+ tests, including `bootstrap stays tight (always-resident cost)` and `always-resident payload under ~2500 tokens (1875 words)`).

- [ ] **Step 9: Commit**

```bash
git add hooks/gipypowers-activate.js rules/caveman-full.md rules/ponytail-full.md \
  skills/using-superpowers/SKILL.md tests/rules.test.mjs tests/bootstrap.test.mjs tests/integration.test.mjs
git commit -m "feat: make caveman/ponytail non-disableable by user request

Both layers now explicitly state they are not togglable preferences.
using-superpowers/SKILL.md narrows the 'user instructions override skills'
carve-out so it still lets a human partner skip an individual superpowers
workflow, but never extends to the native layers or to the base
requirement to check for a matching skill."
```

---

### Task 3: Add the comment policy to ponytail

**Files:**

- Modify: `rules/ponytail-full.md`
- Modify: `tests/rules.test.mjs`

**Interfaces:**

- Consumes: none (self-contained content addition).
- Produces: a new bullet in `rules/ponytail-full.md`'s `## Rules` section.

- [ ] **Step 1: Add a failing assertion for the comment-policy marker**

Edit `tests/rules.test.mjs`, adding `'document technical facts only'` to the ponytail marker list:

```javascript
test('ponytail-full keeps the ladder and safety rails', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'YAGNI',
    'root cause',
    'When NOT to be lazy',
    'input validation',
    'ponytail:',
    'ONE runnable check',
    'Not a togglable preference',
    'document technical facts only',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/rules.test.mjs`
Expected: FAIL — `'document technical facts only'` not present yet.

- [ ] **Step 3: Add the comment-policy bullet to `rules/ponytail-full.md`**

Replace:

```markdown
- Mark a deliberate corner-cut with a `ponytail:` comment naming the ceiling and upgrade path (`# ponytail: global lock, per-account locks if throughput matters`).
```

with:

```markdown
- Mark a deliberate corner-cut with a `ponytail:` comment naming the ceiling and upgrade path (`# ponytail: global lock, per-account locks if throughput matters`).
- Comments document technical facts only — a non-obvious invariant, a public contract, a hidden constraint. Never restate what the code already says, never narrate work history ("added for X", "fixed Y", "removed old logic"). One line max, no comment blocks.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/rules.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rules/ponytail-full.md tests/rules.test.mjs
git commit -m "feat: restrict comments to technical documentation in ponytail

Comments may document a non-obvious invariant, contract, or constraint —
never restate what code already says, never narrate fix/work history."
```

---

### Task 4: Reinforce quality/performance/context priority in ponytail

**Files:**

- Modify: `rules/ponytail-full.md`
- Modify: `tests/rules.test.mjs`

**Interfaces:**

- Consumes: none.
- Produces: strengthened `## When NOT to be lazy` section in `rules/ponytail-full.md`.

- [ ] **Step 1: Add a failing assertion for the quality-priority marker**

Edit `tests/rules.test.mjs`, adding `'never the sloppiest'` to the ponytail marker list:

```javascript
test('ponytail-full keeps the ladder and safety rails', () => {
  const t = read('rules/ponytail-full.md');
  for (const marker of [
    'YAGNI',
    'root cause',
    'When NOT to be lazy',
    'input validation',
    'ponytail:',
    'ONE runnable check',
    'Not a togglable preference',
    'document technical facts only',
    'never the sloppiest',
  ])
    assert.ok(t.includes(marker), `missing: ${marker}`);
  assert.ok(!/^\s*\|\s*\*\*lite\*\*/m.test(t), 'lite row must be dropped');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/rules.test.mjs`
Expected: FAIL — `'never the sloppiest'` not present yet.

- [ ] **Step 3: Strengthen the "When NOT to be lazy" section in `rules/ponytail-full.md`**

Replace:

```markdown
## When NOT to be lazy

Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, anything explicitly requested. Never lazy about understanding the problem — the ladder shortens the solution, never the reading. Non-trivial logic (a branch, loop, parser, money/security path) leaves ONE runnable check behind — an assert-based self-check or one small `test_*.py`, no frameworks. Hardware needs a calibration knob a minimal model can't see.
```

with:

```markdown
## When NOT to be lazy

Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, anything explicitly requested. Never lazy about understanding the problem or system context — the ladder shortens the solution, never the reading, the correctness, or the performance. Every rung still ships production-quality: correct, performant, cleanly structured — laziness picks the smallest correct implementation, never the sloppiest. Non-trivial logic (a branch, loop, parser, money/security path) leaves ONE runnable check behind — an assert-based self-check or one small `test_*.py`, no frameworks. Hardware needs a calibration knob a minimal model can't see.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/rules.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rules/ponytail-full.md tests/rules.test.mjs
git commit -m "feat: make quality/performance priority explicit in ponytail's ladder

Laziness picks the smallest correct implementation, never the sloppiest —
correctness, performance, and understanding system context are the
baseline the ladder operates within, not something it discounts."
```

---

### Task 5: Full regression + word-budget verification

**Files:**

- None (verification only — no content changes).

**Interfaces:**

- Consumes: the full test suite and lint config produced by Tasks 1–4.
- Produces: a confirmed-green repo state.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests including `manifest.test.mjs`, `rules.test.mjs`, `bootstrap.test.mjs`, `integration.test.mjs`, `budget-rule.test.mjs`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS — no errors (Tasks 1–4 only touch `.md`/`.json` and one string literal in `hooks/gipypowers-activate.js`; re-run to catch any stray syntax issue in that file).

- [ ] **Step 3: Confirm the word budgets have headroom, not just pass/fail**

Run:

```bash
node -e "
const { execFileSync } = require('child_process');
const out = execFileSync('node', ['hooks/gipypowers-activate.js'], { env: { ...process.env, CLAUDE_PLUGIN_ROOT: process.cwd() }, encoding: 'utf8' });
const text = JSON.parse(out).hookSpecificOutput.additionalContext;
console.log('payload words:', text.split(/\s+/).filter(Boolean).length, '/ 1875');
"
node -e "console.log('bootstrap words:', require('fs').readFileSync('skills/using-superpowers/SKILL.md','utf8').split(/\s+/).filter(Boolean).length, '/ 550')"
```

Expected: both counts printed, both under budget.

- [ ] **Step 4: Confirm no leftover uncommitted changes**

Run: `git status --short`
Expected: clean (Tasks 1–4 each committed their own changes).
