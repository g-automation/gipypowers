'use strict';

const fs = require('node:fs');
const path = require('node:path');

function canonicalProjectRoot(projectRoot) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  if (!fs.statSync(root).isDirectory()) {
    throw new Error('project root must be a directory');
  }
  return root;
}

function resolveSafeDirectoryTree(projectRoot, segments, create = false) {
  const root = canonicalProjectRoot(projectRoot);
  let current = root;
  for (const segment of segments) {
    if (
      typeof segment !== 'string' ||
      !segment ||
      segment === '.' ||
      segment === '..' ||
      path.isAbsolute(segment) ||
      segment.includes(path.sep)
    ) {
      throw new Error('invalid project storage path');
    }
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!create) return null;
      try {
        fs.mkdirSync(current, { mode: 0o700 });
      } catch (mkdirError) {
        if (mkdirError.code !== 'EEXIST') throw mkdirError;
      }
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink()) {
      throw new Error('refusing symlink in project storage path');
    }
    if (!stat.isDirectory()) {
      throw new Error('project storage path component is not a directory');
    }
  }
  return current;
}

function ensureStateIgnored(projectRoot) {
  const project = canonicalProjectRoot(projectRoot);
  const metadata = resolveSafeDirectoryTree(project, ['.gipypowers'], true);
  const file = path.join(metadata, '.gitignore');
  let contents;
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error('refusing unsafe Gipypowers state ignore file');
    }
    contents = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      fs.writeFileSync(file, '/state/\n', { flag: 'wx', mode: 0o600 });
      return file;
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      return ensureStateIgnored(project);
    }
  }
  if (!/^\/state\/?\s*$/m.test(contents)) {
    fs.appendFileSync(file, `${contents.endsWith('\n') ? '' : '\n'}/state/\n`);
  }
  return file;
}

module.exports = {
  canonicalProjectRoot,
  ensureStateIgnored,
  resolveSafeDirectoryTree,
};
