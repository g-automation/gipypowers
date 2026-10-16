#!/usr/bin/env node
'use strict';

// Bounded, fail-open adapter for Codex and Claude Code command hooks.
const fs = require('node:fs');
const path = require('node:path');
const { findProjectRoot } = require('../core/project');
const {
  buildPromptContext,
  buildSessionContext,
  formatHookOutput,
} = require('./lib/activation');
const { getStartupUpdateNotice } = require('../core/update-check');

const ROOT = path.resolve(__dirname, '..');
const MAX_INPUT_BYTES = 512 * 1024;

function readHookInput() {
  const chunks = [];
  let size = 0;
  const buffer = Buffer.alloc(16 * 1024);
  while (size <= MAX_INPUT_BYTES) {
    const count = fs.readSync(0, buffer, 0, buffer.length, null);
    if (!count) break;
    size += count;
    if (size > MAX_INPUT_BYTES) return {};
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  } catch (_) {
    return {};
  }
}

function projectRoot(input) {
  const cwd =
    typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  return (
    findProjectRoot(cwd) ||
    (path.resolve(cwd) !== path.parse(path.resolve(cwd)).root
      ? path.resolve(cwd)
      : null)
  );
}

function hostName(env = process.env) {
  if (env.CLAUDE_PLUGIN_ROOT && !env.PLUGIN_ROOT) return 'claude';
  if (env.PLUGIN_ROOT || env.COPILOT_CLI) return 'codex';
  return 'unknown';
}

function main(input = readHookInput()) {
  const event =
    input.hook_event_name ||
    input.hookEventName ||
    input.event ||
    'SessionStart';
  const root = projectRoot(input);
  if (!root) return;
  const pluginRoot =
    process.env.PLUGIN_ROOT || process.env.CLAUDE_PLUGIN_ROOT || ROOT;
  let context = '';
  if (/^UserPromptSubmit$/i.test(event)) {
    const prompt = input.prompt || input.user_prompt || input.userMessage || '';
    if (!String(prompt).trim()) return;
    context = buildPromptContext(
      root,
      String(prompt).slice(0, 50000),
      pluginRoot,
      {
        sessionId: input.session_id || input.sessionId || '',
      },
    );
  } else if (/^SessionStart$/i.test(event)) {
    context = buildSessionContext(root, pluginRoot);
    const source = input.source || input.session_source || '';
    if (!source || source === 'startup') {
      const taskState = require('../core/task-state').readTaskState(root);
      getStartupUpdateNotice(ROOT, {
        configRoot: root,
        host: hostName(),
        activeTask: Boolean(taskState),
      })
        .then((notice) => {
          if (notice) context += `\n\n${notice}`;
          const output = formatHookOutput(event, context);
          process.stdout.write(JSON.stringify(output));
        })
        .catch(() => {
          process.stdout.write(
            JSON.stringify(formatHookOutput(event, context)),
          );
        });
      return;
    }
  } else {
    return;
  }
  process.stdout.write(JSON.stringify(formatHookOutput(event, context)));
}

if (require.main === module) {
  try {
    main();
  } catch (_) {
    // Hook failures must never block a host session or user prompt.
  }
}

module.exports = { MAX_INPUT_BYTES, main, projectRoot, readHookInput };
