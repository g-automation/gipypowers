---
name: systematic-debugging
description: Use when an unexpected result needs diagnosis or a fix has failed
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Gather enough evidence to choose a
narrow fix, while scaling investigation to the issue's complexity.

**Core principle:** Establish the likely cause before changing behavior. A clear,
isolated issue needs only a brief investigation.

Use the four phases as a checklist, not a gate. Skip steps that do not apply and
continue inline when available evidence is sufficient.

## When to Use

Use for technical issues such as test failures, production bugs, unexpected
behavior, performance problems, build failures, and integration errors. Keep
the investigation brief for reproducible local failures with an evident cause.

Use deeper investigation for repeated failures, unclear causes, or issues that
cross component boundaries. For a simple, reproducible issue, a short inspection
of the error and relevant code can be enough.

## The Four Phases

Scale each phase to the available evidence; not every issue needs every step.

### Phase 1: Root Cause Investigation

Start with the evidence relevant to the current failure:

1. **Read Relevant Errors** — use the message, location, and stack frames that explain the failure.

2. **Reproduce When Useful** — trigger the issue when reproduction will clarify the cause. If it is already clear and reproducible, continue.

3. **Check Recent Changes** — inspect nearby code, configuration, dependencies, or environment changes implicated by the failure.

4. **Gather Evidence in Multi-Component Systems** — when useful, inspect relevant component boundaries and verify input, output, and configuration propagation before changing them.

5. **Trace Data Flow** — **WHEN error is deep in call stack:** see `root-cause-tracing.md` in this directory for the complete backward tracing technique. Quick version: where does the bad value originate? What called this with the bad value? Keep tracing up until you find the source. Fix at source, not at symptom.

### Phase 2: Pattern Analysis (when useful)

Compare a working example or reference when it can narrow the cause:

1. **Find Working Examples** — locate similar code when comparison helps.
2. **Compare References** — inspect relevant sections of official or local references; read more when behavior depends on details.
3. **Identify Differences** — focus on differences that could explain the observed failure.
4. **Understand Dependencies** — check settings, configuration, environment, or assumptions implicated by the evidence.

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form a Hypothesis** — identify the most likely cause from the evidence.
2. **Test Minimally** — choose the smallest diagnostic or change that can confirm it.
3. **Verify and Adapt** — if it fails, use the new evidence to change the hypothesis or approach.
4. **When uncertain** — inspect more evidence and compare official or local references. Ask only when missing information cannot be inferred and materially blocks the fix.

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Add a Regression Check** — create a focused test when behavior changes and a durable check is practical. Use direct validation for docs, configuration, or one-off cases.
2. **Implement the Fix** — address the likely cause and keep unrelated cleanup separate.
3. **Verify the Outcome** — run the focused check and relevant regressions.
4. **Recover** — after two unsuccessful attempts with the same approach, change strategy or report the concrete blocker.
5. **Reassess architecture when evidence points there** — recurring shared-state or coupling failures can justify a scoped design change. Make that decision from repository evidence; ask the user only if scope or requirements are genuinely unclear.

## Red Flags

Changing code without checking the failure, bundling unrelated changes, or
repeating a failed approach makes results harder to diagnose. After two failed
attempts, change strategy; consider architecture only when evidence points to it.

## Responding to New Evidence

When the user points out a missed symptom or assumption, incorporate it and
recheck the relevant evidence. Keep the investigation moving.

## Common Pitfalls

| Pitfall                          | Better response                                                            |
| -------------------------------- | -------------------------------------------------------------------------- |
| "This issue is probably obvious" | Check the error and nearby code, then make the focused change.             |
| "Let's change several things"    | Isolate changes when that makes the result easier to interpret.            |
| "Try the same fix again"         | Change the hypothesis or report a concrete blocker after repeated failure. |

## Quick Reference

| Phase                 | Key Activities                      | Success Criteria                   |
| --------------------- | ----------------------------------- | ---------------------------------- |
| **1. Root Cause**     | Inspect errors and relevant changes | Likely cause identified            |
| **2. Pattern**        | Compare examples when useful        | Useful differences found           |
| **3. Hypothesis**     | Test a likely explanation           | Confirmed or updated hypothesis    |
| **4. Implementation** | Check when practical, fix, verify   | Bug resolved; relevant checks pass |

## When Process Reveals "No Root Cause"

If the evidence points to an environmental or external cause, document the
checks performed and implement appropriate handling such as a bounded retry,
timeout, or actionable error message.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- **`root-cause-tracing.md`** — trace bugs backward through call stack to find original trigger
- **`defense-in-depth.md`** — add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** — replace arbitrary timeouts with condition polling

**Related skills:**

- **superpowers:test-driven-development** — for behavior changes that need a focused regression test
- **superpowers:verification-before-completion** — verify fix worked before claiming success

## Practical Outcome

Use enough evidence to avoid repeating failed attempts, while keeping clear
issues concise and moving toward a verified fix.
