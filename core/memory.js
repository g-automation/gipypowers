'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  canonicalProjectRoot,
  ensureStateIgnored,
  resolveSafeDirectoryTree,
} = require('./safe-paths');

const MEMORY_DIR = path.join('.gipypowers', 'memory');
const MAX_PAGE_CHARS = 8000;
const DEFAULT_CONTEXT_CHARS = 4000;
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]{12,}/i,
];
const RAW_LOG_PATTERNS = [
  /Traceback \(most recent call last\):/,
  /(?:^|\n)\s+at [\w.$<>-]+ \([^\n]+\)(?:\n\s+at [^\n]+){1,}/,
  /(?:^|\n)npm ERR! .+/,
];
const TYPES = new Set([
  'architecture',
  'decision',
  'preference',
  'constraint',
  'requirement',
  'lesson',
  'failure',
  'reference',
]);
const CONFIDENCE = new Set(['validated', 'user-approved', 'observed']);
const STOP_WORDS = new Set([
  'about',
  'after',
  'before',
  'from',
  'have',
  'into',
  'that',
  'their',
  'there',
  'these',
  'this',
  'those',
  'with',
  'would',
  'when',
  'where',
  'will',
  'your',
  'project',
  'memory',
]);

function pathsFor(projectRoot) {
  const root = canonicalProjectRoot(projectRoot);
  const base = path.join(root, MEMORY_DIR);
  return {
    project: root,
    base,
    entries: path.join(base, 'entries'),
    index: path.join(base, 'index.json'),
    readme: path.join(base, 'README.md'),
    gitignore: path.join(root, '.gipypowers', '.gitignore'),
    lock: path.join(base, '.write.lock'),
  };
}

function atomicWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
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
      // Best-effort cleanup after a failed atomic write.
    }
    throw error;
  }
}

function withWriteLock(paths, action) {
  let fd;
  try {
    fd = fs.openSync(paths.lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        'memory write conflict: another writer is active; retry',
        { cause: error },
      );
    }
    throw error;
  }
  try {
    return action();
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(paths.lock);
    } catch (_) {
      // Best-effort lock cleanup after a completed mutation.
    }
  }
}

function validateId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error('memory id must use lowercase kebab-case');
  }
  return id;
}

function safeString(value, label, maxChars = 240) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  const result = value.trim();
  if (result.length > maxChars || result.includes('\0')) {
    throw new Error(`${label} exceeds the ${maxChars} character limit`);
  }
  return result;
}

function assertSafeContent(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('memory content is required');
  }
  if (text.length > MAX_PAGE_CHARS) {
    throw new Error(
      `memory content exceeds the ${MAX_PAGE_CHARS} character limit`,
    );
  }
  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error('memory content contains a sensitive value');
  }
  if (RAW_LOG_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error('raw logs cannot be stored as memory');
  }
  return text.trim();
}

function ensureMemoryDirectory(projectRoot) {
  const root = canonicalProjectRoot(projectRoot);
  resolveSafeDirectoryTree(root, ['.gipypowers', 'memory', 'entries'], true);
  ensureStateIgnored(root);
  const paths = pathsFor(root);
  if (!fs.existsSync(paths.readme)) {
    atomicWrite(
      paths.readme,
      '# Gipypowers project memory\n\n' +
        'Keep durable decisions, approved requirements, conventions, and validated lessons here. ' +
        'Do not store credentials, raw logs, unverified guesses, or facts that can be read from the code. ' +
        'Use the Gipypowers memory CLI for versioned writes; inspect and export Markdown freely. ' +
        'Task checkpoints live outside this directory and are temporary.\n',
    );
  }
  return paths;
}

function initializeMemory(projectRoot) {
  const paths = ensureMemoryDirectory(projectRoot);
  const created = !fs.existsSync(paths.index);
  if (created) {
    atomicWrite(
      paths.index,
      `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`,
    );
    rebuildIndex(paths);
  }
  return { directory: paths.base, index: paths.index };
}

function parsePage(file) {
  if (!fs.lstatSync(file).isFile()) {
    throw new Error(
      `memory page is not a regular file: ${path.basename(file)}`,
    );
  }
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match)
    throw new Error(`invalid memory page format: ${path.basename(file)}`);
  let metadata;
  try {
    metadata = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`invalid memory metadata: ${path.basename(file)}`, {
      cause: error,
    });
  }
  const sections = match[2].split(/\n\n## Revision history\n/);
  const body = (sections.shift() || '').trim();
  return {
    ...metadata,
    body,
    historyItems:
      metadata.historyItems ||
      (Array.isArray(metadata.history) ? metadata.history : []),
    history: sections.join('\n\n## Revision history\n').trim(),
  };
}

function pageText(entry) {
  const metadata = {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    version: entry.version,
    status: entry.status,
    source: entry.source,
    confidence: entry.confidence,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    supersedes: entry.supersedes,
    historyItems: entry.historyItems,
  };
  const history = (entry.historyItems || [])
    .map(
      (item) =>
        `- Version ${item.version}: ${item.kind} on ${item.at}; ${item.summary} (source: ${item.source}).`,
    )
    .join('\n');
  return `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${entry.body}\n\n## Revision history\n${history}\n`;
}

function makeIndexEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    version: entry.version,
    status: entry.status,
    source: entry.source,
    confidence: entry.confidence,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    supersedes: entry.supersedes,
  };
}

function isValidIndexEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  try {
    validateId(entry.id);
  } catch (_) {
    return false;
  }
  return (
    TYPES.has(entry.type) &&
    typeof entry.title === 'string' &&
    typeof entry.source === 'string' &&
    CONFIDENCE.has(entry.confidence) &&
    Number.isSafeInteger(entry.version) &&
    entry.version > 0 &&
    ['active', 'archived'].includes(entry.status) &&
    Array.isArray(entry.tags) &&
    entry.tags.length <= 12 &&
    entry.tags.every((tag) => typeof tag === 'string') &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string'
  );
}

function rebuildIndex(paths) {
  const entries = [];
  for (const name of fs.readdirSync(paths.entries)) {
    if (!name.endsWith('.md')) continue;
    try {
      const entry = parsePage(path.join(paths.entries, name));
      const indexEntry = makeIndexEntry(entry);
      if (entry.id === name.slice(0, -3) && isValidIndexEntry(indexEntry)) {
        entries.push(indexEntry);
      }
    } catch (_) {
      // A broken page stays visible to its owner but is excluded from retrieval.
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  atomicWrite(
    paths.index,
    `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`,
  );
  atomicWrite(
    path.join(paths.base, 'INDEX.md'),
    '# Project memory index\n\n' +
      (entries.length
        ? entries
            .map(
              (entry) =>
                `- **${entry.title}** — \`${entry.id}\` (${entry.type}, ${entry.status}, v${entry.version})`,
            )
            .join('\n') + '\n'
        : 'No durable entries yet.\n'),
  );
  return entries;
}

function loadIndex(paths) {
  try {
    const fileStat = fs.lstatSync(paths.index);
    if (!fileStat.isFile() || fileStat.size > 4 * 1024 * 1024) {
      return rebuildIndex(paths);
    }
    const index = JSON.parse(fs.readFileSync(paths.index, 'utf8'));
    const ids = new Set();
    const entriesValid =
      Array.isArray(index.entries) &&
      index.entries.every((entry) => {
        if (!isValidIndexEntry(entry) || ids.has(entry.id)) return false;
        ids.add(entry.id);
        return true;
      });
    if (index.schemaVersion === 1 && entriesValid) return index.entries;
  } catch (_) {
    // Rebuild a missing or corrupt index from Markdown pages.
  }
  return rebuildIndex(paths);
}

function reindexMemory(projectRoot) {
  const paths = ensureMemoryDirectory(projectRoot);
  return rebuildIndex(paths);
}

function normalizedContent(text) {
  return text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

function isSafeForRetrieval(entry) {
  try {
    assertSafeContent(entry.body);
    return !SECRET_PATTERNS.some((pattern) =>
      pattern.test(
        [entry.title, entry.source, ...(entry.tags || [])].join('\n'),
      ),
    );
  } catch (_) {
    return false;
  }
}

function createMemoryEntry(projectRoot, input, content) {
  const paths = ensureMemoryDirectory(projectRoot);
  const id = validateId(input?.id);
  if (!TYPES.has(input?.type)) throw new Error('memory type is invalid');
  const title = safeString(input.title, 'memory title');
  const source = safeString(input.source, 'memory source');
  const confidence = input.confidence || 'validated';
  if (!CONFIDENCE.has(confidence))
    throw new Error('memory confidence is invalid');
  const body = assertSafeContent(content);
  const metadataText = [title, source, body].join('\n');
  if (SECRET_PATTERNS.some((pattern) => pattern.test(metadataText))) {
    throw new Error('memory content contains a sensitive value');
  }
  const tags = [
    ...new Set(
      (input.tags || []).map((tag) =>
        safeString(tag, 'memory tag', 40).toLowerCase(),
      ),
    ),
  ].slice(0, 12);
  const supersedes = [...new Set((input.supersedes || []).map(validateId))];
  const now = new Date().toISOString();
  const entry = {
    id,
    type: input.type,
    title,
    version: 1,
    status: 'active',
    source,
    confidence,
    tags,
    createdAt: now,
    updatedAt: now,
    supersedes,
    historyItems: [
      {
        version: 1,
        at: now,
        kind: 'created',
        summary: 'validated knowledge recorded',
        source,
      },
    ],
    body,
  };
  return withWriteLock(paths, () => {
    const file = path.join(paths.entries, `${id}.md`);
    if (fs.existsSync(file))
      throw new Error(`memory entry already exists: ${id}`);
    const duplicate = loadIndex(paths).find((existing) => {
      try {
        return (
          normalizedContent(
            parsePage(path.join(paths.entries, `${existing.id}.md`)).body,
          ) === normalizedContent(body)
        );
      } catch (_) {
        return false;
      }
    });
    if (duplicate) {
      throw new Error(
        `duplicate memory content matches ${duplicate.id}; revise that entry or record a distinct fact`,
      );
    }
    atomicWrite(file, pageText(entry));
    rebuildIndex(paths);
    return makeIndexEntry(entry);
  });
}

function readMemoryEntry(projectRoot, id) {
  resolveSafeDirectoryTree(
    projectRoot,
    ['.gipypowers', 'memory', 'entries'],
    false,
  );
  const paths = pathsFor(projectRoot);
  const safeId = validateId(id);
  const file = path.join(paths.entries, `${safeId}.md`);
  if (!fs.existsSync(file))
    throw new Error(`memory entry not found: ${safeId}`);
  return parsePage(file);
}

function reviseMemoryEntry(projectRoot, id, expectedVersion, content, source) {
  const paths = ensureMemoryDirectory(projectRoot);
  const safeId = validateId(id);
  const body = assertSafeContent(content);
  const safeSource = safeString(source, 'memory source');
  if (
    SECRET_PATTERNS.some((pattern) => pattern.test(`${safeSource}\n${body}`))
  ) {
    throw new Error('memory content contains a sensitive value');
  }
  return withWriteLock(paths, () => {
    const current = readMemoryEntry(projectRoot, safeId);
    if (current.version !== Number(expectedVersion)) {
      throw new Error(
        `memory conflict: current version is ${current.version}; reread and reconcile`,
      );
    }
    const duplicate = loadIndex(paths).find((entry) => {
      if (entry.id === safeId) return false;
      try {
        return (
          normalizedContent(
            parsePage(path.join(paths.entries, `${entry.id}.md`)).body,
          ) === normalizedContent(body)
        );
      } catch (_) {
        return false;
      }
    });
    if (duplicate) {
      throw new Error(
        `duplicate memory content matches ${duplicate.id}; revise that entry or record a distinct fact`,
      );
    }
    const now = new Date().toISOString();
    const historyItems = [
      ...(current.historyItems || []),
      {
        version: current.version + 1,
        at: now,
        kind: 'revised',
        summary: 'validated understanding updated',
        source: safeSource,
      },
    ];
    const next = {
      ...current,
      version: current.version + 1,
      updatedAt: now,
      source: safeSource,
      historyItems,
      body,
    };
    atomicWrite(path.join(paths.entries, `${safeId}.md`), pageText(next));
    rebuildIndex(paths);
    return makeIndexEntry(next);
  });
}

function archiveMemoryEntry(
  projectRoot,
  id,
  summary = 'superseded by validated knowledge',
) {
  const paths = ensureMemoryDirectory(projectRoot);
  const safeId = validateId(id);
  const reason = safeString(summary, 'archive reason');
  if (SECRET_PATTERNS.some((pattern) => pattern.test(reason))) {
    throw new Error('memory content contains a sensitive value');
  }
  return withWriteLock(paths, () => {
    const current = readMemoryEntry(projectRoot, safeId);
    const now = new Date().toISOString();
    const next = {
      ...current,
      version: current.version + 1,
      status: 'archived',
      updatedAt: now,
      historyItems: [
        ...(current.historyItems || []),
        {
          version: current.version + 1,
          at: now,
          kind: 'archived',
          summary: reason,
          source: 'gipypowers memory archive',
        },
      ],
    };
    atomicWrite(path.join(paths.entries, `${safeId}.md`), pageText(next));
    rebuildIndex(paths);
    return makeIndexEntry(next);
  });
}

function deleteMemoryEntry(projectRoot, id) {
  const paths = ensureMemoryDirectory(projectRoot);
  const safeId = validateId(id);
  return withWriteLock(paths, () => {
    const file = path.join(paths.entries, `${safeId}.md`);
    if (!fs.existsSync(file))
      throw new Error(`memory entry not found: ${safeId}`);
    fs.unlinkSync(file);
    rebuildIndex(paths);
    return { id: safeId, deleted: true };
  });
}

function listMemoryEntries(projectRoot, options = {}) {
  const paths = ensureMemoryDirectory(projectRoot);
  return loadIndex(paths).filter(
    (entry) => options.includeArchived || entry.status === 'active',
  );
}

function tokens(text) {
  return [
    ...new Set(
      String(text || '')
        .toLocaleLowerCase('en')
        .match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [],
    ),
  ].filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreEntry(entry, queryTokens) {
  if (!queryTokens.length) return 0;
  const title = tokens(entry.title);
  const tags = tokens((entry.tags || []).join(' '));
  const body = tokens(entry.body);
  let score = 0;
  for (const token of queryTokens) {
    if (title.includes(token)) score += 5;
    if (tags.includes(token)) score += 4;
    if (body.includes(token)) score += 1;
  }
  return score;
}

function searchMemory(projectRoot, query, options = {}) {
  const paths = ensureMemoryDirectory(projectRoot);
  const queryTokens = tokens(query);
  const limit = Math.max(1, Math.min(Number(options.limit) || 4, 10));
  const maxChars = Math.max(
    120,
    Math.min(Number(options.maxChars) || DEFAULT_CONTEXT_CHARS, 12000),
  );
  const scored = loadIndex(paths)
    .filter((entry) => entry.status === 'active')
    .map((entry) => {
      try {
        const page = parsePage(path.join(paths.entries, `${entry.id}.md`));
        if (!isSafeForRetrieval({ ...entry, body: page.body })) {
          return { ...entry, body: '', score: 0 };
        }
        return {
          ...entry,
          body: page.body,
          score: scoreEntry({ ...entry, body: page.body }, queryTokens),
        };
      } catch (_) {
        return { ...entry, body: '', score: 0 };
      }
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
  let context = '';
  const entries = [];
  for (const entry of scored) {
    const section = `### ${entry.title} (${entry.id}, ${entry.type}, v${entry.version})\n${entry.body}\n\n`;
    const remaining = maxChars - context.length;
    if (remaining <= 0) break;
    const bounded =
      section.length <= remaining
        ? section
        : `${section.slice(0, remaining).trimEnd()}…`;
    context += bounded;
    entries.push({ ...entry, body: entry.body });
    if (bounded.length < section.length) break;
  }
  return { entries, context: context.trimEnd(), maxChars };
}

function exportMemory(projectRoot) {
  const paths = ensureMemoryDirectory(projectRoot);
  const pages = loadIndex(paths)
    .map((entry) => parsePage(path.join(paths.entries, `${entry.id}.md`)))
    .sort((a, b) => a.id.localeCompare(b.id));
  return pages
    .map(
      (entry) =>
        `# ${entry.title}\n\n- ID: \`${entry.id}\`\n- Type: ${entry.type}\n- Status: ${entry.status}\n- Version: ${entry.version}\n- Source: ${entry.source}\n- Confidence: ${entry.confidence}\n\n${entry.body}\n\n${entry.history ? `## Revision history\n${entry.history}` : ''}`,
    )
    .join('\n\n---\n\n');
}

module.exports = {
  DEFAULT_CONTEXT_CHARS,
  MAX_PAGE_CHARS,
  archiveMemoryEntry,
  createMemoryEntry,
  deleteMemoryEntry,
  exportMemory,
  initializeMemory,
  listMemoryEntries,
  pathsFor,
  reindexMemory,
  readMemoryEntry,
  reviseMemoryEntry,
  searchMemory,
};
