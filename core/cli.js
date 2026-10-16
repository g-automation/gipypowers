#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findProjectRoot } = require('./project');
const memory = require('./memory');
const task = require('./task-state');
const { routePrompt } = require('./skill-router');

function parseArgs(args) {
  const result = { positional: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const value = args[i];
    if (!value.startsWith('--')) {
      result.positional.push(value);
      continue;
    }
    const equals = value.indexOf('=');
    if (equals !== -1) {
      result.flags[value.slice(2, equals)] = value.slice(equals + 1);
      continue;
    }
    const key = value.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      result.flags[key] = next;
      i++;
    } else {
      result.flags[key] = true;
    }
  }
  return result;
}

function rootFrom(flags) {
  const supplied = flags.root || flags['project-root'];
  const root = supplied
    ? path.resolve(supplied)
    : findProjectRoot(process.cwd());
  if (!root || !fs.existsSync(root)) {
    throw new Error(
      'project root not found; run this command inside a project or pass --root',
    );
  }
  return root;
}

function bodyFrom(flags) {
  if (typeof flags.content === 'string') return flags.content;
  return fs.readFileSync(0, 'utf8');
}

function listValue(value) {
  return typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp() {
  process.stdout.write(
    `gipypowers — shared memory and task context\n\n` +
      `Commands:\n` +
      `  memory init [--root PATH]\n` +
      `  memory list [--include-archived] [--root PATH]\n` +
      `  memory search --query TEXT [--limit 4] [--max-chars 4000]\n` +
      `  memory read --id ID\n` +
      `  memory add --id ID --type TYPE --title TEXT --source TEXT [--tags a,b]\n` +
      `  memory revise --id ID --expected-version N --source TEXT\n` +
      `  memory archive --id ID [--summary TEXT]\n` +
      `  memory delete --id ID\n` +
      `  memory export [--root PATH]\n` +
      `  memory reindex [--root PATH]\n` +
      `  task begin --id ID [--route NAME]\n` +
      `  task checkpoint --status STATUS --summary TEXT --next TEXT [--files a,b]\n` +
      `  task fail --signature CLASS --summary TEXT\n` +
      `  task show | task complete\n` +
      `  route --prompt TEXT\n` +
      `  context session | context prompt --prompt TEXT [--plugin-root PATH]\n` +
      `  update check\n`,
  );
}

function runMemory(args) {
  const { positional, flags } = parseArgs(args);
  const operation = positional[0];
  const root = rootFrom(flags);
  switch (operation) {
    case 'init':
      printJson(memory.initializeMemory(root));
      break;
    case 'list':
      printJson(
        memory.listMemoryEntries(root, {
          includeArchived: flags['include-archived'] === true,
        }),
      );
      break;
    case 'search': {
      const result = memory.searchMemory(root, flags.query || '', {
        limit: flags.limit,
        maxChars: flags['max-chars'],
      });
      process.stdout.write(result.context || '(no relevant project memory)\n');
      break;
    }
    case 'read':
      printJson(memory.readMemoryEntry(root, flags.id));
      break;
    case 'add': {
      const entry = memory.createMemoryEntry(
        root,
        {
          id: flags.id,
          type: flags.type,
          title: flags.title,
          source: flags.source,
          confidence: flags.confidence,
          tags: listValue(flags.tags),
          supersedes: listValue(flags.supersedes),
        },
        bodyFrom(flags),
      );
      printJson(entry);
      break;
    }
    case 'revise':
      printJson(
        memory.reviseMemoryEntry(
          root,
          flags.id,
          flags['expected-version'],
          bodyFrom(flags),
          flags.source,
        ),
      );
      break;
    case 'archive':
      printJson(memory.archiveMemoryEntry(root, flags.id, flags.summary));
      break;
    case 'delete':
      printJson(memory.deleteMemoryEntry(root, flags.id));
      break;
    case 'export':
      process.stdout.write(`${memory.exportMemory(root)}\n`);
      break;
    case 'reindex':
      printJson({ entries: memory.reindexMemory(root).length });
      break;
    default:
      throw new Error(`unknown memory command: ${operation || '(missing)'}`);
  }
}

function runTask(args) {
  const { positional, flags } = parseArgs(args);
  const operation = positional[0];
  const root = rootFrom(flags);
  switch (operation) {
    case 'begin':
      printJson(
        task.beginTask(root, { id: flags.id, route: flags.route || '' }),
      );
      break;
    case 'checkpoint':
      printJson(
        task.checkpointTask(root, {
          status: flags.status,
          summary: flags.summary,
          step: flags.step,
          next: flags.next,
          files: listValue(flags.files),
        }),
      );
      break;
    case 'fail':
      printJson(
        task.recordTaskFailure(root, {
          signature: flags.signature,
          summary: flags.summary,
        }),
      );
      break;
    case 'show':
      printJson(task.readTaskState(root));
      break;
    case 'complete':
      printJson({ cleared: task.completeTask(root) });
      break;
    default:
      throw new Error(`unknown task command: ${operation || '(missing)'}`);
  }
}

function runRoute(args) {
  const { flags } = parseArgs(args);
  printJson(routePrompt(flags.prompt || ''));
}

function runContext(args) {
  const { positional, flags } = parseArgs(args);
  const root = rootFrom(flags);
  const {
    buildCompactSessionContext,
    buildPromptContext,
    buildSessionContext,
  } = require('../hooks/lib/activation');
  const pluginRoot =
    flags['plugin-root'] ||
    process.env.PLUGIN_ROOT ||
    process.env.CLAUDE_PLUGIN_ROOT;
  const context =
    positional[0] === 'prompt'
      ? buildPromptContext(root, flags.prompt || '', pluginRoot, {
          sessionId: flags['session-id'],
        })
      : flags.compact === true
        ? buildCompactSessionContext(root, pluginRoot)
        : buildSessionContext(root, pluginRoot);
  process.stdout.write(`${context}\n`);
}

async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0];
  if (!command || command === 'help' || flags.help) {
    printHelp();
    return;
  }
  const args = argv.slice(1);
  if (command === 'memory') return runMemory(args);
  if (command === 'task') return runTask(args);
  if (command === 'route') return runRoute(args);
  if (command === 'context') return runContext(args);
  if (command === 'update') {
    const updates = require('./update-check');
    return updates.runUpdateCommand(positional[1] || 'check', flags);
  }
  if (command === '--version' || command === 'version') {
    process.stdout.write(`${require('../package.json').version}\n`);
    return;
  }
  throw new Error(`unknown command: ${command}`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`gipypowers: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
