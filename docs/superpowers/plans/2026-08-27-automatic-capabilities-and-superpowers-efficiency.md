# Automatic Capabilities and Superpowers Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically apply every non-Superpowers capability while making Superpowers skills compact, precise, and portable across Claude and Codex.

**Architecture:** Compile sibling Caveman/Ponytail helper behavior plus existing ADHD/No-AI-Slop rules into local indexed rules. Load that index from the existing hooks, then load a compressed Superpowers bootstrap; keep individual Superpowers skills on-demand and trim redundant prose without changing their contracts.

**Tech Stack:** Node.js CommonJS hooks, Markdown rules, JSON index/manifests, Node built-in `node:test`, ESLint.

## Global Constraints

- Runtime inputs stay inside this repository; never read sibling plugin directories.
- Automatic capabilities include Caveman/Ponytail helpers, ADHD, and No-AI-Slop; no Superpowers skill is auto-invoked.
- System/user instructions, safety, and explicit task requirements override every style or workflow rule.
- Claude and Codex receive identical content; only JSON envelope differs.
- Keep SessionStart payload below 1875 words and SubagentStart reminder compact with literal `27k`.
- Preserve validation, error handling, security, tests, attribution, and all public skill contracts while removing repetition.

---

### Task 1: Define indexed automatic capabilities

**Files:**

- Create: `rules/automatic-capabilities.json`
- Modify: `rules/i-have-adhd-full.md`
- Modify: `rules/no-ai-slop-full.md`
- Modify: `rules/caveman-full.md`
- Modify: `rules/ponytail-full.md`
- Test: `tests/rules.test.mjs`

**Interfaces:**

- Consumes: adapted behavior from `../caveman/skills/`, `../ponytail/skills/`, and existing local rule files during authoring only.
- Produces: JSON array of local rule paths with stable names, priorities, and markers consumed by Task 2.

- [ ] **Step 1: Add failing index contract test**

Add a test that parses `rules/automatic-capabilities.json`, requires entries named `i-have-adhd`, `no-ai-slop`, `caveman`, `caveman-review`, `caveman-commit`, `caveman-compress`, `caveman-help`, `caveman-stats`, `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, and `ponytail-help`, and asserts every entry has string fields `file`, `marker`, and numeric `priority`.

- [ ] **Step 2: Run focused test and verify failure**

Run: `node --test tests/rules.test.mjs`

Expected: FAIL because the index does not exist.

- [ ] **Step 3: Create compact indexed rules**

Create one JSON entry per capability. Point output-focused capabilities to the two existing ADHD/No-AI-Slop files and helper capabilities to compact local helper-rule files (grouped by Caveman/Ponytail family). Keep stats/help metrics user-requested; turn review/audit/debt/gain/commit behavior on when task context makes it relevant. Set priorities matching the spec: ADHD, No-AI-Slop, Caveman, Ponytail, helper capabilities. Entries may share a file, but the loader must read each unique file once.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/rules.test.mjs`

Expected: all rule and index tests PASS.

### Task 2: Load index automatically in both runtimes

**Files:**

- Modify: `hooks/gipypowers-activate.js`
- Modify: `hooks/gipypowers-subagent.js`
- Modify: `tests/hook.test.mjs`
- Modify: `tests/integration.test.mjs`
- Modify: `tests/subagent.test.mjs`

**Interfaces:**

- Consumes: `rules/automatic-capabilities.json`; existing `read()` helper; `skills/using-superpowers/SKILL.md` bootstrap.
- Produces: deterministic indexed rule payload and compact subagent protocol.

- [ ] **Step 1: Add failing hook assertions**

Assert SessionStart output contains every index marker in priority order, contains `SUPERPOWERS` after automatic markers, and does not contain `invoke /caveman` or `invoke /ponytail`. Assert SubagentStart contains `AUTO-CAPABILITIES`, `27k`, and no full rule bodies.

- [ ] **Step 2: Run targeted tests and verify failure**

Run: `node --test tests/hook.test.mjs tests/integration.test.mjs tests/subagent.test.mjs`

Expected: FAIL because hooks currently load only four rule files and lack index markers.

- [ ] **Step 3: Implement indexed loader**

Parse the index inside the existing outer `try`. Sort entries by numeric `priority`, group by unique local `file`, read each file once, and append marker headings in priority order; skip malformed/missing entries without throwing. Keep current Claude/Codex/Cursor envelope branches and update intro to state automatic capabilities plus on-demand Superpowers. Add a fixed compact subagent reminder listing automatic helper behavior, `27k`, and “Superpowers skills remain user-selected.”

- [ ] **Step 4: Run targeted tests and budget check**

Run: `node --test tests/hook.test.mjs tests/integration.test.mjs tests/subagent.test.mjs`

Expected: targeted tests PASS and aggregate payload remains under 1875 words.

### Task 3: Compress and harden Superpowers workflow skills

**Files:**

- Modify: `skills/using-superpowers/SKILL.md`
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`
- Modify: `skills/test-driven-development/SKILL.md`
- Modify: `skills/systematic-debugging/SKILL.md`
- Modify: `skills/verification-before-completion/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/receiving-code-review/SKILL.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Modify: `skills/using-git-worktrees/SKILL.md`
- Modify: `skills/writing-skills/SKILL.md`
- Modify: `tests/bootstrap.test.mjs`
- Modify: `tests/budget-rule.test.mjs`

**Interfaces:**

- Consumes: current skill contracts, required gates, and model-neutral protocol from the approved spec.
- Produces: same skill names/frontmatter and required behavior with less repeated prose.

- [ ] **Step 1: Add compression invariants**

Extend tests to require every skill retains frontmatter `name`/`description`, explicit stop/approval gates where currently present, and literal `27k` in every `BUDGET_BEARERS` file. Add per-skill word ceilings: bootstrap 450, brainstorming 900, writing-plans 700, execution/review/debug skills 750, and writing-skills 1000; assert each file remains below its ceiling.

- [ ] **Step 2: Run tests and record baseline failures**

Run: `node --test tests/bootstrap.test.mjs tests/budget-rule.test.mjs tests/integration.test.mjs`

Expected: new ceiling assertions FAIL for oversized skills, identifying files to compress.

- [ ] **Step 3: Compress each skill without contract loss**

Remove duplicated philosophy, repeated warnings, long examples, and model-specific wording. Keep one actionable rule per requirement, exact commands/paths, safety confirmations, approval gates, interfaces, expected verification output, and `27k` constraints. Replace repeated paragraphs with compact checklists; keep existing `agents/openai.yaml` metadata unchanged.

- [ ] **Step 4: Run skill contract tests**

Run: `node --test tests/bootstrap.test.mjs tests/budget-rule.test.mjs tests/integration.test.mjs`

Expected: all contract and word-ceiling tests PASS with no skill missing required metadata.

### Task 4: Align documentation and metadata

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `NOTICE`

**Interfaces:**

- Consumes: final automatic capability index and compressed Superpowers behavior.
- Produces: consistent installation/user/contributor documentation.

- [ ] **Step 1: Update descriptions**

Document all automatic capabilities and state that only Superpowers skills are selected/invoked by the user. Explain contextual helper behavior and model-neutral Claude/Codex support. Preserve install/update commands and existing attribution.

- [ ] **Step 2: Update attribution and inventory**

Record Caveman/Ponytail helper adaptations alongside existing five upstream projects in `NOTICE`; ensure index capability names match docs and tests.

- [ ] **Step 3: Verify docs and JSON**

Run: `node -e "for (const p of ['.claude-plugin/plugin.json','.claude-plugin/marketplace.json','.codex-plugin/plugin.json','rules/automatic-capabilities.json']) JSON.parse(require('fs').readFileSync(p))"`

Expected: all JSON parses; `rg` finds no stale claim that only three/four layers are automatic.

### Task 5: Full verification and commit

**Files:**

- Test: `tests/*.test.mjs`

**Interfaces:**

- Consumes: completed automatic index, hooks, rules, compressed skills, docs, and metadata.
- Produces: verified branch ready for integration.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run lint and whitespace checks**

Run: `npm run lint && git diff --check`

Expected: ESLint exits 0 and no whitespace errors appear.

- [ ] **Step 3: Inspect payload and scope**

Run: `node hooks/gipypowers-activate.js | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);const t=o.additionalContext||o.hookSpecificOutput.additionalContext;console.log(t.split(/\\s+/).filter(Boolean).length+' words')})" && git diff --stat && git status --short`

Expected: payload word count is below 1875; only planned files plus pre-existing unrelated edits appear.

- [ ] **Step 4: Commit implementation**

```bash
git add rules hooks tests skills README.md CLAUDE.md AGENTS.md .claude-plugin .codex-plugin NOTICE
git commit -m "feat: automate non-superpowers capabilities"
```
