# Automatic Output Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundle ADHD-friendly and anti-slop response guidance into gipypowers as automatic Claude/Codex layers while keeping Superpowers skill choice user-controlled.

**Architecture:** Store compact, adapted rule files in `rules/` and load them from the existing SessionStart hook. Add only a short reminder to SubagentStart so subagents inherit behavior without duplicating the full payload. Update repository contracts and documentation to reflect five automatic layers.

**Tech Stack:** Node.js CommonJS hooks, Markdown rules, Node built-in `node:test`, JSON manifests.

## Global Constraints

- Runtime inputs stay inside this repository; never read sibling plugin directories.
- System/user instructions and safety override all style rules.
- ADHD guidance controls action-first structure; anti-slop guidance controls precise, concrete language; Caveman controls terse output; Ponytail controls engineering decisions.
- Superpowers remains on-demand workflow guidance; no new activation flags or dependencies.
- Keep SessionStart payload below existing 1875-word limit and preserve silent-failure behavior.

---

### Task 1: Add adapted automatic rule files

**Files:**

- Create: `rules/i-have-adhd-full.md`
- Create: `rules/no-ai-slop-full.md`
- Test: `tests/rules.test.mjs`

**Interfaces:**

- Consumes: guidance from sibling plugins `../i-have-adhd/skills/i-have-adhd/SKILL.md` and `../no-ai-slop/skills/no-ai-slop/SKILL.md` during authoring only.
- Produces: compact rule bodies with no frontmatter or activation commands.

- [ ] **Step 1: Add failing content-contract test**

Append tests that read both files and require these exact markers:

```js
test('automatic output layers contain action and anti-slop guidance', () => {
  const adhd = read('rules/i-have-adhd-full.md');
  const slop = read('rules/no-ai-slop-full.md');
  for (const marker of ['action first', 'numbered steps', 'state', 'lists at five'])
    assert.ok(adhd.toLowerCase().includes(marker), `missing ADHD marker: ${marker}`);
  for (const marker of ['preserve intent', 'minimum effective edit', 'concrete', 'active voice', 'AI slop'])
    assert.ok(slop.toLowerCase().includes(marker), `missing anti-slop marker: ${marker}`);
});
```

- [ ] **Step 2: Run focused test and verify failure**

Run: `node --test tests/rules.test.mjs`

Expected: FAIL because both new rule files are absent.

- [ ] **Step 3: Write minimal adapted rules**

Create each file with a title and concise bullets. ADHD file must cover action-first output, numbered multi-step work, current state/progress, lists capped at five, concrete next step, visible wins, matter-of-fact errors, and no preamble/recap/closer. Anti-slop file must cover preserving intent/voice, minimum effective edits, concrete facts, active voice, cutting filler/clichés/binary contrasts/metacommentary/repetition/recaps, and no automatic editor report. Exclude upstream opt-in/off commands and editor slash-command workflow.

- [ ] **Step 4: Run focused test**

Run: `node --test tests/rules.test.mjs`

Expected: all rule tests PASS.

### Task 2: Inject layers in Claude/Codex hooks

**Files:**

- Modify: `hooks/gipypowers-activate.js`
- Modify: `hooks/gipypowers-subagent.js`
- Test: `tests/hook.test.mjs`
- Test: `tests/integration.test.mjs`

**Interfaces:**

- Consumes: `rules/i-have-adhd-full.md` and `rules/no-ai-slop-full.md` via existing `read()` helper.
- Produces: existing Claude nested and Codex top-level JSON envelopes with five automatic layers.

- [ ] **Step 1: Add failing hook assertions**

Extend layer marker arrays to include `I-HAVE-ADHD`, `NO-AI-SLOP`, `action first`, and `preserve intent`; extend subagent-hook assertions with `ADHD` and `ANTI-SLOP`.

- [ ] **Step 2: Run hook tests and verify failure**

Run: `node --test tests/hook.test.mjs tests/integration.test.mjs`

Expected: FAIL because payloads do not include new rule content or reminders.

- [ ] **Step 3: Inject files and compact reminder**

In `gipypowers-activate.js`, read both files beside Caveman/Ponytail and interpolate them before the Superpowers section. Change the envelope introduction to state “five layers” while preserving existing environment branching. In `gipypowers-subagent.js`, append compact reminders equivalent to `ADHD: action first, number real multi-step work, show state/progress, cap lists at 5.` and `ANTI-SLOP: preserve intent, use concrete active language, cut filler and AI patterns.`

- [ ] **Step 4: Run hook tests and payload budget checks**

Run: `node --test tests/hook.test.mjs tests/integration.test.mjs`

Expected: all targeted tests PASS, including payload under 1875 words. If budget fails, shorten rule wording while retaining required markers.

### Task 3: Update documentation, metadata, and attribution

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `NOTICE`

**Interfaces:**

- Consumes: final five-layer behavior and upstream source metadata.
- Produces: consistent contributor/user-facing descriptions for Claude and Codex.

- [ ] **Step 1: Update docs and descriptions**

Replace “three layers” descriptions with five automatic layers: Caveman, Ponytail, i-have-adhd, no-ai-slop, and Superpowers. State that only Superpowers workflow skills are selected on demand. Preserve existing install/update instructions and test commands.

- [ ] **Step 2: Add attribution**

Append `i-have-adhd — Copyright (c) Ayghri — https://github.com/ayghri/i-have-adhd` and `no-ai-slop — Copyright (c) Peter Yang — https://github.com/petergyang/no-ai-slop` to `NOTICE`, noting both are adapted MIT-licensed content.

- [ ] **Step 3: Run documentation contract checks**

Run: `rg -n "three layers|five layers|i-have-adhd|no-ai-slop|Superpowers" README.md CLAUDE.md AGENTS.md .claude-plugin/plugin.json .codex-plugin/plugin.json NOTICE`

Expected: stale three-layer descriptions are absent from user-facing metadata; all five layer names and attributions appear where required.

### Task 4: Full verification and commit

**Files:**

- Test: `tests/*.test.mjs`

**Interfaces:**

- Consumes: completed rules, hooks, tests, docs, and metadata.
- Produces: verified implementation with no manifest drift.

- [ ] **Step 1: Run complete tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run lint and whitespace checks**

Run: `npm run lint && git diff --check`

Expected: ESLint exits 0 and no whitespace errors appear.

- [ ] **Step 3: Review changed-file scope**

Run: `git diff --stat && git status --short`

Expected: only planned rules, hooks, tests, docs, metadata, attribution, and plan/spec files are changed; unrelated existing edits remain untouched.

- [ ] **Step 4: Commit implementation**

```bash
git add rules/i-have-adhd-full.md rules/no-ai-slop-full.md hooks/gipypowers-activate.js hooks/gipypowers-subagent.js tests/rules.test.mjs tests/hook.test.mjs tests/integration.test.mjs README.md CLAUDE.md AGENTS.md .claude-plugin/plugin.json .codex-plugin/plugin.json NOTICE
git commit -m "feat: add automatic output layers"
```
