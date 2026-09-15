# Single-Commit Workflow Rule

## Goal

Make gipypowers operate under a golden single-commit rule: every implementation
performed through gipypowers ends with exactly one commit for that implementation.
Later corrections amend that commit instead of creating additional commits.

## Design

The rule is a workflow contract, enforced where gipypowers gives guidance:

- `using-superpowers` establishes the rule as a global invariant.
- `writing-plans` requires one final commit for the complete plan and removes
  guidance that encourages frequent commits or one commit per task.
- `executing-plans` keeps task checkpoints for verification, but directs all
  implementation changes into the same commit and requires `git commit --amend`
  after a base commit exists.
- `finishing-a-development-branch` verifies that the implementation contributes
  one commit before presenting integration choices.
- SessionStart emits one compact reminder so the policy is available without
  loading more documentation.

The contract distinguishes a commit created for the current implementation from
commits that already existed before the work began. Existing history is never
rewritten implicitly. If no implementation commit exists, create one after
verification. If one exists, amend it. Explicit user requests for a different
history remain outside this automatic policy.

## Compatibility and scope

Existing skills, manifests, host-specific hook envelopes, explicit sub-agent
invocation, the `27k` budget rule, and automatic capabilities remain available.
This change only removes multi-commit defaults from the gipypowers workflow.
Version remains `0.4.0`; this is a behavior correction within the release.

## Testing

Add source-contract tests that assert:

1. bootstrap text includes the single-commit and amend policy;
2. planning and execution guidance contains no frequent-commit or per-task
   commit instruction;
3. finishing guidance verifies one implementation commit;
4. existing hook, manifest, version, and capability tests still pass.

Verification: `npm test`, `npm run lint`, Prettier check, and `git diff --check`.
