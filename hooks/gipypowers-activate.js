#!/usr/bin/env node
'use strict';
// gipypowers SessionStart hook — injects the three always-on layers.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8').trim(); }
  catch (_) { return ''; }
}

function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

try {
  const caveman = read('rules/caveman-full.md');
  const ponytail = read('rules/ponytail-full.md');
  const bootstrap = stripFrontmatter(read('skills/using-superpowers/SKILL.md'));

  const payload =
`<EXTREMELY_IMPORTANT>
You have gipypowers — three always-on layers. CAVEMAN and PONYTAIL are NATIVE and already active: never invoke them as skills, never ask to enable them. SUPERPOWERS skills load on demand via the Skill tool.

${caveman}

${ponytail}

## SUPERPOWERS — your workflow skills
${bootstrap}
</EXTREMELY_IMPORTANT>`;

  const env = process.env;
  let out;
  if (env.CURSOR_PLUGIN_ROOT) {
    out = { additional_context: payload };
  } else if (env.CLAUDE_PLUGIN_ROOT && !env.COPILOT_CLI) {
    out = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: payload } };
  } else {
    out = { additionalContext: payload };
  }
  process.stdout.write(JSON.stringify(out));
} catch (_) {
  // silent-fail: never block session start
}
