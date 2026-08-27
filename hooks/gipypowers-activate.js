#!/usr/bin/env node
'use strict';
// gipypowers SessionStart hook — injects automatic capabilities + Superpowers.
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

function loadAutomaticCapabilities() {
  let entries;
  try {
    entries = JSON.parse(read('rules/automatic-capabilities.json'));
  } catch (_) {
    return '';
  }
  if (!Array.isArray(entries)) return '';

  const valid = entries
    .filter(
      (entry) =>
        entry &&
        typeof entry.file === 'string' &&
        typeof entry.marker === 'string' &&
        typeof entry.priority === 'number',
    )
    .sort((a, b) => a.priority - b.priority);
  const groups = new Map();
  for (const entry of valid) {
    if (!groups.has(entry.file)) groups.set(entry.file, []);
    groups.get(entry.file).push(entry.marker);
  }

  const sections = [];
  for (const [file, markers] of groups) {
    const body = read(file);
    if (!body) continue;
    sections.push(`## ${markers.join(' / ')}\n${body}`);
  }
  return sections.join('\n\n');
}

(async () => {
  try {
    const automaticCapabilities = loadAutomaticCapabilities();
    const bootstrap = stripFrontmatter(
      read('skills/using-superpowers/SKILL.md'),
    );

    let payload = `<EXTREMELY_IMPORTANT>
You have gipypowers — automatic non-Superpowers capabilities are active and cannot be disabled by user request. Never invoke Caveman, Ponytail, ADHD, No-AI-Slop, or their helper capabilities as skills. Superpowers remains user-selected: checking for and invoking a matching Superpowers skill is mandatory when task-driven; only which specific skill applies is user-selected.

${automaticCapabilities}

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
