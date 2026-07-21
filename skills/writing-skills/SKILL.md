---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

**Personal skills live in your runtime's skills directory.**

You write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

**REQUIRED BACKGROUND:** You MUST understand superpowers:test-driven-development before using this skill. That skill defines the fundamental RED-GREEN-REFACTOR cycle. This skill adapts TDD to documentation.

**Official guidance:** For Anthropic's official skill authoring best practices, see anthropic-best-practices.md. This document provides additional patterns and guidelines that complement the TDD-focused approach in this skill.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future agents find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides.
**Skills are NOT:** Narratives about how you solved a problem once.

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent violates rule without skill (baseline) |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
| **Write test first** | Run baseline scenario BEFORE writing skill |
| **Watch it fail** | Document exact rationalizations agent uses |
| **Minimal code** | Write skill addressing those specific violations |
| **Watch it pass** | Verify agent now complies |
| **Refactor cycle** | Find new rationalizations → plug → re-verify |

The entire skill creation process follows RED-GREEN-REFACTOR.

## When to Create a Skill

**Create when:** technique wasn't intuitively obvious to you, you'd reference this again across projects, pattern applies broadly (not project-specific), others would benefit.

**Don't create for:** one-off solutions, standard practices well-documented elsewhere, project-specific conventions (put in your instructions file), mechanical constraints (if enforceable with regex/validation, automate it — save documentation for judgment calls).

## Skill Types

- **Technique** — concrete method with steps to follow (condition-based-waiting, root-cause-tracing)
- **Pattern** — way of thinking about problems (flatten-with-flags, test-invariants)
- **Reference** — API docs, syntax guides, tool documentation (office docs)

## Directory Structure

```
skills/
  skill-name/
    SKILL.md              # Main reference (required)
    supporting-file.*     # Only if needed
```

**Flat namespace** - all skills in one searchable namespace.

**Separate files for:** heavy reference (100+ lines — API docs, comprehensive syntax), reusable tools (scripts, utilities, templates). Keeping these out of SKILL.md and loading them only on demand is what keeps the always-scanned skill body small — progressive disclosure: the agent reads the overview, and only pulls the heavy file in when it actually needs it.

**Keep inline:** principles and concepts, code patterns (< 50 lines), everything else.

## SKILL.md Structure

**Frontmatter (YAML):** two required fields, `name` and `description` (see [agentskills.io/specification](https://agentskills.io/specification) for all supported fields). Max 1024 characters total. `name`: letters, numbers, hyphens only (no parentheses, special chars). `description`: third-person, describes ONLY when to use (NOT what it does) — start with "Use when...", include specific symptoms/situations/contexts, **NEVER summarize the skill's process or workflow** (see SDO below for why), keep under 500 characters if possible.

```markdown
---
name: Skill-Name-With-Hyphens
description: Use when [specific triggering conditions and symptoms]
---

# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.

## When to Use
[Small inline flowchart IF decision non-obvious]
Bullet list with SYMPTOMS and use cases. When NOT to use.

## Core Pattern (for techniques/patterns)
Before/after code comparison

## Quick Reference
Table or bullets for scanning common operations

## Implementation
Inline code for simple patterns. Link to file for heavy reference or reusable tools.

## Common Mistakes
What goes wrong + fixes

## Real-World Impact (optional)
Concrete results
```

## Skill Discovery Optimization (SDO)

**Critical for discovery:** Future agents need to FIND your skill.

### 1. Rich Description Field

**Purpose:** Your agent reads the description to decide which skills to load for a given task. Make it answer: "Should I read this skill right now?" **Format:** start with "Use when..." to focus on triggering conditions.

**CRITICAL: Description = When to Use, NOT What the Skill Does.** Do NOT summarize the skill's process or workflow in the description.

**Why this matters:** Testing revealed that when a description summarizes the skill's workflow, an agent may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused an agent to do ONE review, even though the skill's flowchart clearly showed TWO reviews (spec compliance then code quality). When the description was changed to just "Use when executing implementation plans with independent tasks" (no workflow summary), the agent correctly read the flowchart and followed the two-stage review process. **The trap:** descriptions that summarize workflow create a shortcut agents will take — the skill body becomes documentation agents skip.

```yaml
# ❌ BAD: Summarizes workflow - agents may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks
# ❌ BAD: Too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor
# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session
```

**Content:** use concrete triggers/symptoms/situations that signal this skill applies, describe the *problem* (race conditions, inconsistent behavior) not *language-specific symptoms* (setTimeout, sleep), keep triggers technology-agnostic unless the skill itself is technology-specific (if so, make that explicit), write in third person (injected into system prompt), **NEVER summarize the skill's process or workflow.**

```yaml
# ❌ BAD: Too abstract, vague, doesn't include when to use
description: For async testing
# ❌ BAD: First person
description: I can help you with async tests when they're flaky
# ✅ GOOD: Starts with "Use when", describes problem, no workflow
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
# ✅ GOOD: Technology-specific skill with explicit trigger
description: Use when using React Router and handling authentication redirects
```

### 2. Keyword Coverage

Use words an agent would search for: error messages ("Hook timed out", "ENOTEMPTY", "race condition"), symptoms ("flaky", "hanging", "zombie", "pollution"), synonyms ("timeout/hang/freeze", "cleanup/teardown/afterEach"), tools (actual commands, library names, file types).

### 3. Descriptive Naming

**Use active voice, verb-first:** `creating-skills` not `skill-creation`; `condition-based-waiting` not `async-test-helpers`.

**Name by what you DO or core insight:** `condition-based-waiting` > `async-test-helpers` · `using-skills` not `skill-usage` · `flatten-with-flags` > `data-structure-refactoring` · `root-cause-tracing` > `debugging-techniques`.

**Gerunds (-ing) work well for processes:** `creating-skills`, `testing-skills`, `debugging-with-logs` — active, describes the action you're taking.

### 4. Token Efficiency (Critical)

**Problem:** getting-started and frequently-referenced skills load into EVERY conversation. Every token counts.

**Target word counts:** getting-started workflows <150 words each; frequently-loaded skills <200 words total; other skills <500 words (still be concise).

**Techniques:**

Move details to tool help — reference `--help` instead of documenting every flag in SKILL.md.

Use cross-references instead of repeating workflow details: "Always use subagents (50-100x context savings). REQUIRED: Use [other-skill-name] for workflow." — don't repeat 20 lines of instructions already in another skill.

Compress examples — one minimal example beats a verbose one:
```
# ✅ GOOD (20 words)
Partner: "How did we handle auth errors in React Router?"
You: Searching...
[Dispatch subagent → synthesis]
```

Eliminate redundancy — don't repeat what's in cross-referenced skills, don't explain what's obvious from command, don't include multiple examples of the same pattern.

**Verification:**
```bash
wc -w skills/path/SKILL.md
# getting-started workflows: aim for <150 each
# Other frequently-loaded: aim for <200 total
```

### 5. Cross-Referencing Other Skills

Use skill name only, with explicit requirement markers:
- ✅ Good: `**REQUIRED SUB-SKILL:** Use superpowers:test-driven-development`
- ✅ Good: `**REQUIRED BACKGROUND:** You MUST understand superpowers:systematic-debugging`
- ❌ Bad: `See skills/testing/test-driven-development` (unclear if required)
- ❌ Bad: `@skills/testing/test-driven-development/SKILL.md` (force-loads, burns context)

**Why no @ links:** `@` syntax force-loads files immediately, consuming 200k+ context before you need them.

## Flowchart Usage

**Use flowcharts ONLY for:** non-obvious decision points, process loops where you might stop too early, "when to use A vs B" decisions.

**Never use flowcharts for:** reference material (use tables/lists), code examples (use markdown blocks), linear instructions (use numbered lists), labels without semantic meaning (step1, helper2).

See `graphviz-conventions.dot` in this directory for graphviz style rules.

**Visualizing for your human partner:** use `render-graphs.js` in this directory to render a skill's flowcharts to SVG:
```bash
./render-graphs.js ../some-skill           # Each diagram separately
./render-graphs.js ../some-skill --combine # All diagrams in one SVG
```

## Code Examples

**One excellent example beats many mediocre ones.** Choose the most relevant language (testing techniques → TypeScript/JavaScript; system debugging → Shell/Python; data processing → Python).

**Good example:** complete and runnable, well-commented explaining WHY, from real scenario, shows pattern clearly, ready to adapt (not generic template).

**Don't:** implement in 5+ languages, create fill-in-the-blank templates, write contrived examples. You're good at porting - one great example is enough.

## File Organization

- **Self-contained skill** (`SKILL.md` only) — when all content fits, no heavy reference needed.
- **Skill with reusable tool** (`SKILL.md` + `example.ts`) — when the tool is reusable code, not just narrative.
- **Skill with heavy reference** (`SKILL.md` + reference `.md` files + `scripts/`) — when reference material is too large for inline.

## The Iron Law (Same as TDD)

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to NEW skills AND EDITS to existing skills.

Write skill before testing? Delete it. Start over. Edit skill without testing? Same violation.

**No exceptions:** not for "simple additions," not for "just adding a section," not for "documentation updates," don't keep untested changes as "reference," don't "adapt" while running tests. Delete means delete.

**REQUIRED BACKGROUND:** The superpowers:test-driven-development skill explains why this matters. Same principles apply to documentation.

## Testing All Skill Types

Different skill types need different test approaches:

| Type | Examples | Test with | Success criteria |
|------|----------|-----------|-------------------|
| **Discipline-enforcing** (rules/requirements) | TDD, verification-before-completion, designing-before-coding | Academic questions (understand rules?), pressure scenarios (comply under stress?), multiple combined pressures, identify rationalizations + add explicit counters | Agent follows rule under maximum pressure |
| **Technique** (how-to guides) | condition-based-waiting, root-cause-tracing, defensive-programming | Application scenarios, variation/edge-case scenarios, missing-information tests | Agent successfully applies technique to new scenario |
| **Pattern** (mental models) | reducing-complexity, information-hiding | Recognition scenarios, application scenarios, counter-examples (when NOT to apply) | Agent correctly identifies when/how to apply pattern |
| **Reference** (documentation/APIs) | API docs, command references, library guides | Retrieval scenarios, application scenarios, gap testing | Agent finds and correctly applies reference information |

## Common Rationalizations for Skipping Testing

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps, unclear sections. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. 15 min testing saves hours. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Testing is less tedious than debugging bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested skill wastes more time fixing it later. |

**All of these mean: Test before deploying. No exceptions.**

## Match the Form to the Failure

Before writing guidance, classify the baseline failure. The form that bulletproofs one failure type measurably backfires on another.

| Baseline failure | Right form | Wrong form |
|---|---|---|
| Skips/violates a rule under pressure (knows better, does it anyway) | Prohibition + rationalization table + red flags (see Bulletproofing below) | Soft guidance ("prefer...", "consider...") |
| Complies, but output has the wrong shape (bloated prompt, buried verdict, restated spec) | Positive recipe or contract: state what the output IS — its parts, in order | Prohibition list ("don't restate", "never narrate") |
| Omits a required element from something they already produce | Structural: REQUIRED field or slot in the template they fill in | Prose reminders near the template |
| Behavior should depend on a condition | Conditional keyed to an observable predicate ("if the brief exists, reference it") | Unconditional rule + exemption clauses |

**Why prohibitions backfire on shaping problems:** under a competing incentive ("make the prompt self-contained"), agents negotiate with "don't X". In head-to-head wording tests on dispatch-prompt guidance, the prohibition arm produced clearly more of the unwanted content than the recipe arm (fully separated distributions), and trended worse than even the no-guidance control — micro-test your own case rather than assuming, but never reach for the prohibition by default. A recipe leaves nothing to negotiate: the output matches the stated shape or it doesn't.

**Rules for whichever form you pick:**
- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation — appending a single nuance clause to a winning recipe degraded it from consistent to noisy in the same wording tests. Express a real exception as its own conditional on an observable predicate.
- **Exemption clauses don't scope.** "This limit doesn't apply to code blocks" still suppresses code blocks. If part of the output must be exempt, restructure so the rule can't reach it.

## Bulletproofing Skills Against Rationalization

Skills that enforce discipline (like TDD) need to resist rationalization. Agents are smart and will find loopholes when under pressure.

**Scope:** this toolkit is for discipline failures — an agent that knows the rule and skips it under pressure. For wrong-shaped output or omitted elements, prohibition-based bulletproofing backfires; use the forms in Match the Form to the Failure instead.

**Psychology note:** understanding WHY persuasion techniques work helps you apply them systematically. See persuasion-principles.md for research foundation (Cialdini, 2021; Meincke et al., 2025) on authority, commitment, scarcity, social proof, and unity principles.

**Close every loophole explicitly.** Don't just state the rule — forbid specific workarounds:
<Bad>`Write code before test? Delete it.`</Bad>
<Good>
```markdown
Write code before test? Delete it. Start over.
**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```
</Good>

**Address "spirit vs letter" arguments.** Add foundational principle early: `**Violating the letter of the rules is violating the spirit of the rules.**` This cuts off entire class of "I'm following the spirit" rationalizations.

**Build rationalization table.** Capture rationalizations from baseline testing — every excuse agents make goes in the table:
```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
```

**Create red flags list.** Make it easy for agents to self-check when rationalizing:
```markdown
## Red Flags - STOP and Start Over
- Code before test
- "I already manually tested it"
- "This is different because..."
**All of these mean: Delete code. Start over with TDD.**
```

**Update SDO for violation symptoms.** Add to description: symptoms of when you're ABOUT to violate the rule, e.g. `description: use when implementing any feature or bugfix, before writing implementation code`.

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)
Run pressure scenario with subagent WITHOUT the skill. Document exact behavior: what choices did they make? What rationalizations did they use (verbatim)? Which pressures triggered violations? This is "watch the test fail" - you must see what agents naturally do before writing the skill.

### GREEN: Write Minimal Skill
Write skill that addresses those specific rationalizations. Don't add extra content for hypothetical cases. Run same scenarios WITH skill. Agent should now comply.

### REFACTOR: Close Loopholes
Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

### Micro-Test Wording Before Full Scenarios

Full pressure-scenario runs are the final gate, but they are slow and expensive per iteration. Verify the wording itself first with micro-tests:
1. **One fresh-context sample per call** — a raw API call, or a single-shot subagent if you don't have API access. System prompt = the realistic context the guidance will live in (the full skill or prompt template, not the guidance in isolation); user message = a task that tempts the failure.
2. **Always include a no-guidance control.** If the control doesn't exhibit the failure, there is nothing to fix — stop, don't author the guidance.
3. **5+ reps per variant.** Single samples lie.
4. **Manually read every flagged match.** Score programmatically if you like, but template echoes and quoted counter-examples masquerade as hits; automated counts alone overstate both failure and success.
5. **Variance is a metric.** When guidance lands, reps converge on the same shape. Five different interpretations across five reps means the wording isn't binding — tighten the form before adding words.

Micro-tests verify wording; they do not replace pressure scenarios for discipline skills.

**Testing methodology:** see [testing-skills-with-subagents.md](testing-skills-with-subagents.md) for the complete testing methodology: how to write pressure scenarios, pressure types (time, sunk cost, authority, exhaustion), plugging holes systematically, meta-testing techniques.

## Anti-Patterns

- **❌ Narrative Example** — "In session 2025-10-03, we found empty projectDir caused..." Why bad: too specific, not reusable.
- **❌ Multi-Language Dilution** — example-js.js, example-py.py, example-go.go. Why bad: mediocre quality, maintenance burden.
- **❌ Code in Flowcharts** — `step1 [label="import fs"];`. Why bad: can't copy-paste, hard to read.
- **❌ Generic Labels** — helper1, helper2, step3, pattern4. Why bad: labels should have semantic meaning.

## STOP: Before Moving to Next Skill

**After writing ANY skill, you MUST STOP and complete the deployment process.**

**Do NOT:** create multiple skills in batch without testing each, move to next skill before current one is verified, skip testing because "batching is more efficient."

**The deployment checklist below is MANDATORY for EACH skill.** Deploying untested skills = deploying untested code. It's a violation of quality standards.

## Skill Creation Checklist (TDD Adapted)

**IMPORTANT: Create a todo for EACH checklist item below.**

**RED Phase - Write Failing Test:**
- [ ] Create pressure scenarios (3+ combined pressures for discipline skills)
- [ ] Run scenarios WITHOUT skill - document baseline behavior verbatim
- [ ] Identify patterns in rationalizations/failures

**GREEN Phase - Write Minimal Skill:**
- [ ] Name uses only letters, numbers, hyphens (no parentheses/special chars)
- [ ] YAML frontmatter with required `name` and `description` fields (max 1024 chars; see [spec](https://agentskills.io/specification))
- [ ] Description starts with "Use when..." and includes specific triggers/symptoms
- [ ] Description written in third person
- [ ] Keywords throughout for search (errors, symptoms, tools)
- [ ] Clear overview with core principle
- [ ] Address specific baseline failures identified in RED
- [ ] Guidance form matches the failure type (see Match the Form to the Failure)
- [ ] For behavior-shaping guidance: wording micro-tested against a no-guidance control (5+ reps, every flagged match read manually) — N/A for pure reference skills
- [ ] Code inline OR link to separate file
- [ ] One excellent example (not multi-language)
- [ ] Run scenarios WITH skill - verify agents now comply

**REFACTOR Phase - Close Loopholes:**
- [ ] Identify NEW rationalizations from testing
- [ ] Add explicit counters (if discipline skill)
- [ ] Build rationalization table from all test iterations
- [ ] Create red flags list
- [ ] Re-test until bulletproof

**Quality Checks:**
- [ ] Small flowchart only if decision non-obvious
- [ ] Quick reference table
- [ ] Common mistakes section
- [ ] No narrative storytelling
- [ ] Supporting files only for tools or heavy reference

**Deployment:**
- [ ] Commit skill to git and push to your fork (if configured)
- [ ] Consider contributing back via PR (if broadly useful)

## Discovery Workflow

How future agents find your skill: encounters problem ("tests are flaky") → searches skills (greps descriptions, browses categories) → finds SKILL (description matches) → scans overview (is this relevant?) → reads patterns (quick reference table) → loads example (only when implementing).

**Optimize for this flow** - put searchable terms early and often.

## The Bottom Line

**Creating skills IS TDD for process documentation.**

Same Iron Law: No skill without failing test first. Same cycle: RED (baseline) → GREEN (write skill) → REFACTOR (close loopholes). Same benefits: better quality, fewer surprises, bulletproof results.

If you follow TDD for code, follow it for skills. It's the same discipline applied to documentation.
