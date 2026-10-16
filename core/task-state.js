'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  ensureStateIgnored,
  resolveSafeDirectoryTree,
} = require('./safe-paths');

const MAX_FAILURES = 10;
const ALLOWED_STATUS = new Set([
  'planning',
  'implementing',
  'verifying',
  'blocked',
]);
const SECRET_PATTERN =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b|\bAKIA[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+/-]{16,}|\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]{12,})/i;
const RAW_LOG_PATTERNS = [
  /Traceback \(most recent call last\):/,
  /(?:^|\n)\s+at [\w.$<>-]+ \([^\n]+\)(?:\n\s+at [^\n]+){1,}/,
  /(?:^|\n)npm ERR! .+/,
];

function safeText(value, label, maxChars) {
  if (value === undefined || value === null || value === '') return '';
  if (
    typeof value !== 'string' ||
    value.length > maxChars ||
    value.includes('\0')
  ) {
    throw new Error(`${label} exceeds the ${maxChars} character limit`);
  }
  if (SECRET_PATTERN.test(value))
    throw new Error(`${label} contains a sensitive value`);
  if (RAW_LOG_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error(`${label} contains raw log output`);
  }
  return value.trim();
}

function atomicWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, contents, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try {
      fs.unlinkSync(temp);
    } catch (_) {
      // Best-effort cleanup after a failed state write.
    }
    throw error;
  }
}

function persist(projectRoot, state) {
  const dir = resolveSafeDirectoryTree(
    projectRoot,
    ['.gipypowers', 'state'],
    true,
  );
  const file = path.join(dir, 'current.json');
  ensureStateIgnored(projectRoot);
  state.updatedAt = new Date().toISOString();
  atomicWrite(file, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

function readTaskState(projectRoot) {
  try {
    const dir = resolveSafeDirectoryTree(
      projectRoot,
      ['.gipypowers', 'state'],
      false,
    );
    if (!dir) return null;
    const file = path.join(dir, 'current.json');
    const fileStat = fs.lstatSync(file);
    if (!fileStat.isFile() || fileStat.size > 32 * 1024) return null;
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (
      stored.schemaVersion !== 1 ||
      typeof stored.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(stored.id) ||
      !ALLOWED_STATUS.has(stored.status)
    ) {
      return null;
    }
    const files = Array.isArray(stored.files) ? stored.files.slice(0, 12) : [];
    const failures = Array.isArray(stored.failures)
      ? stored.failures.slice(0, MAX_FAILURES).map((failure) => {
          if (
            !failure ||
            typeof failure.fingerprint !== 'string' ||
            !/^[a-f0-9]{16}$/.test(failure.fingerprint) ||
            !Number.isSafeInteger(failure.count) ||
            failure.count < 1
          ) {
            throw new Error('invalid stored task failure');
          }
          return {
            fingerprint: failure.fingerprint,
            count: failure.count,
            summary: safeText(failure.summary, 'task failure summary', 400),
            updatedAt:
              typeof failure.updatedAt === 'string' ? failure.updatedAt : '',
          };
        })
      : [];
    return {
      schemaVersion: 1,
      id: stored.id,
      route: safeText(stored.route, 'task route', 60),
      status: stored.status,
      summary: safeText(stored.summary, 'task summary', 600),
      step: safeText(stored.step, 'task step', 160),
      next: safeText(stored.next, 'next action', 300),
      files: files.map((file) => safeText(file, 'task file', 240)),
      failures,
      startedAt: typeof stored.startedAt === 'string' ? stored.startedAt : '',
      updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : '',
    };
  } catch (_) {
    return null;
  }
}

function beginTask(projectRoot, input) {
  if (
    !input ||
    typeof input.id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(input.id)
  ) {
    throw new Error('task id must be a short session or task identifier');
  }
  const now = new Date().toISOString();
  const previous = readTaskState(projectRoot);
  const failures =
    previous && previous.id === input.id ? previous.failures || [] : [];
  return persist(projectRoot, {
    schemaVersion: 1,
    id: input.id,
    route: safeText(input.route, 'task route', 60),
    status: 'planning',
    summary: '',
    step: '',
    next: '',
    files: [],
    failures,
    startedAt: previous && previous.id === input.id ? previous.startedAt : now,
    updatedAt: now,
  });
}

function checkpointTask(projectRoot, input) {
  const state = readTaskState(projectRoot);
  if (!state) throw new Error('no active task checkpoint');
  if (!ALLOWED_STATUS.has(input.status))
    throw new Error('task status is invalid');
  const files = (input.files || [])
    .slice(0, 12)
    .map((file) => safeText(file, 'task file', 240));
  state.status = input.status;
  state.summary = safeText(input.summary, 'task summary', 600);
  state.step = safeText(input.step, 'task step', 160);
  state.next = safeText(input.next, 'next action', 300);
  state.files = files;
  return persist(projectRoot, state);
}

function recordTaskFailure(projectRoot, input) {
  const state = readTaskState(projectRoot);
  if (!state) throw new Error('no active task checkpoint');
  if (
    !input ||
    typeof input.signature !== 'string' ||
    !input.signature.trim()
  ) {
    throw new Error('failure signature is required');
  }
  const summary = safeText(input.summary, 'failure summary', 400);
  const fingerprint = crypto
    .createHash('sha256')
    .update(input.signature.trim())
    .digest('hex')
    .slice(0, 16);
  const failures = Array.isArray(state.failures) ? state.failures : [];
  const existing = failures.find(
    (failure) => failure.fingerprint === fingerprint,
  );
  const count = existing ? existing.count + 1 : 1;
  const failure = {
    fingerprint,
    count,
    summary,
    updatedAt: new Date().toISOString(),
  };
  state.failures = [
    failure,
    ...failures.filter((item) => item.fingerprint !== fingerprint),
  ].slice(0, MAX_FAILURES);
  persist(projectRoot, state);
  return {
    fingerprint,
    count,
    shouldRetry: count <= 2,
    changeStrategy: count > 2,
  };
}

function completeTask(projectRoot) {
  const dir = resolveSafeDirectoryTree(
    projectRoot,
    ['.gipypowers', 'state'],
    false,
  );
  if (!dir) return false;
  const file = path.join(dir, 'current.json');
  try {
    fs.unlinkSync(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

module.exports = {
  beginTask,
  checkpointTask,
  completeTask,
  readTaskState,
  recordTaskFailure,
};
