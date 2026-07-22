#!/usr/bin/env node
'use strict';
// gipypowers SubagentStart hook — compact always-on reminder + token budget.
try {
  const env = process.env;
  const reminder =
    'gipypowers active (subagent). CAVEMAN: terse output, drop filler, code/errors verbatim. ' +
    'PONYTAIL: YAGNI, stdlib first, smallest correct diff; never simplify away validation, security, or tests. ' +
    'BUDGET: keep your working context under ~27k tokens (10% of the window); persist bulk output to files, keep only pointers.';
  let out;
  if (env.CURSOR_PLUGIN_ROOT) {
    out = { additional_context: reminder };
  } else if (env.CLAUDE_PLUGIN_ROOT && !env.COPILOT_CLI) {
    out = {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: reminder,
      },
    };
  } else {
    out = { additionalContext: reminder };
  }
  process.stdout.write(JSON.stringify(out));
} catch (_) {
  // silent-fail: never block a subagent from starting
}
