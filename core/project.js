'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function findProjectRoot(cwd, env = process.env) {
  if (env.GIPYPOWERS_PROJECT_ROOT) {
    return path.resolve(env.GIPYPOWERS_PROJECT_ROOT);
  }
  const start = path.resolve(cwd || process.cwd());
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: start,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 750,
    }).trim();
  } catch (_) {
    let current = start;
    while (true) {
      if (
        fs.existsSync(path.join(current, 'AGENTS.md')) ||
        fs.existsSync(path.join(current, 'CLAUDE.md')) ||
        fs.existsSync(path.join(current, 'package.json')) ||
        fs.existsSync(path.join(current, 'pyproject.toml')) ||
        fs.existsSync(path.join(current, 'Cargo.toml'))
      ) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

module.exports = { findProjectRoot };
