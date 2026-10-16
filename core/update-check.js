'use strict';

// Release discovery is read-only. Host managers own installation and rollback.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');

const THROTTLE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1800;
const MAX_RESPONSE_BYTES = 64 * 1024;
const RELEASE_URL =
  'https://api.github.com/repos/g-automation/gipypowers/releases/latest';
const CACHE_FILE = path.join(os.homedir(), '.gipypowers', 'release-check.json');
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

function compareNumericIdentifiers(left, right) {
  const a = String(left).replace(/^0+(?=\d)/, '');
  const b = String(right).replace(/^0+(?=\d)/, '');
  if (a.length !== b.length) return a.length > b.length ? 1 : -1;
  return a === b ? 0 : a > b ? 1 : -1;
}

function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().replace(/^v/, '').match(SEMVER);
  if (!match) return null;
  const prerelease = match[4] ? match[4].split('.') : [];
  const build = match[5] ? match[5].split('.') : [];
  if (
    prerelease.some(
      (part) =>
        !part || (/^\d+$/.test(part) && part.length > 1 && part[0] === '0'),
    )
  )
    return null;
  if (build.some((part) => !part)) return null;
  return { major: match[1], minor: match[2], patch: match[3], prerelease };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (const field of ['major', 'minor', 'patch']) {
    const comparison = compareNumericIdentifiers(a[field], b[field]);
    if (comparison) return comparison;
  }
  if (!a.prerelease.length && b.prerelease.length) return 1;
  if (a.prerelease.length && !b.prerelease.length) return -1;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return compareNumericIdentifiers(x, y);
    if (xn !== yn) return xn ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}

function isNewerVersion(remote, local) {
  return compareVersions(remote, local) === 1;
}

function validateRelease(release) {
  if (!release || release.draft !== false || release.prerelease !== false)
    return null;
  const version =
    typeof release.tag_name === 'string'
      ? release.tag_name.replace(/^v/, '')
      : '';
  if (!parseVersion(version) || parseVersion(version).prerelease.length)
    return null;
  if (
    release.html_url !==
      `https://github.com/g-automation/gipypowers/releases/tag/v${version}` &&
    release.html_url !==
      `https://github.com/g-automation/gipypowers/releases/tag/${version}`
  )
    return null;
  return {
    version,
    url: release.html_url,
    immutable: release.immutable === true,
    publishedAt:
      typeof release.published_at === 'string' ? release.published_at : '',
    assets: Array.isArray(release.assets)
      ? release.assets.map((asset) => ({ digest: asset.digest || '' }))
      : [],
    integrityMetadataValid:
      release.immutable === true &&
      Array.isArray(release.assets) &&
      release.assets.length > 0 &&
      release.assets.every((asset) =>
        /^sha256:[a-f0-9]{64}$/i.test(asset.digest || ''),
      ),
  };
}

function readLocalVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
      .version;
  } catch (_) {
    return null;
  }
}

function readVersionPin(root, env = process.env) {
  const configured = env.GIPYPOWERS_VERSION_PIN;
  if (configured)
    return parseVersion(configured) ? configured.replace(/^v/, '') : 'invalid';
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(root, '.gipypowers', 'config.json'), 'utf8'),
    );
    const pin = config.versionPin || config.version;
    return pin ? (parseVersion(pin) ? pin.replace(/^v/, '') : 'invalid') : null;
  } catch (_) {
    return null;
  }
}

function readCache(file) {
  try {
    const cache = JSON.parse(fs.readFileSync(file, 'utf8'));
    return cache && typeof cache.lastChecked === 'number' ? cache : {};
  } catch (_) {
    return {};
  }
}

function writeCache(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (_) {
    // Caching is best-effort and never blocks session startup.
  }
}

function fetchLatestRelease(url = RELEASE_URL, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let request;
    try {
      request = https.get(
        url,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'gipypowers-release-check',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
        (response) => {
          if (response.statusCode !== 200) {
            response.resume();
            finish(null);
            return;
          }
          const chunks = [];
          let size = 0;
          response.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_RESPONSE_BYTES) {
              request.destroy();
              finish(null);
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => {
            try {
              finish(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch (_) {
              finish(null);
            }
          });
        },
      );
      request.on('error', () => finish(null));
      request.setTimeout(timeoutMs, () => {
        request.destroy();
        finish(null);
      });
    } catch (_) {
      finish(null);
    }
  });
}

function hostPolicy(host, release, context = {}) {
  if (!release)
    return {
      action: 'none',
      reason: 'release metadata is unavailable or invalid',
    };
  if (context.activeTask)
    return { action: 'defer', reason: 'an implementation task is active' };
  if (host === 'claude')
    return {
      action: 'host-managed',
      command: 'claude plugin update gipypowers',
    };
  if (host === 'codex')
    return {
      action: 'notify',
      command: 'codex plugin marketplace upgrade gipypowers',
      reason:
        'refresh the marketplace, then update Gipypowers in the Codex Plugins manager',
    };
  if (host === 'hermes')
    return {
      action: 'notify',
      command: 'hermes plugins update gipypowers',
      reason: 'Hermes owns plugin installation and update validation',
    };
  return {
    action: 'notify',
    reason: 'review the stable release and install it through the host manager',
  };
}

async function checkForUpdate(root, options = {}) {
  const env = options.env || process.env;
  if (env.GIPYPOWERS_NO_UPDATE_CHECK === '1') return { status: 'disabled' };
  const local = options.localVersion || readLocalVersion(root);
  if (!parseVersion(local)) return { status: 'invalid-local-version' };
  const pin = readVersionPin(options.configRoot || root, env);
  if (pin === 'invalid') return { status: 'invalid-pin' };

  const now = options.now ?? Date.now();
  const cacheFile = options.cacheFile || CACHE_FILE;
  const cache = options.cache || readCache(cacheFile);
  let release = cache.release ? validateRelease(cache.release) : null;
  const stale = !cache.lastChecked || now - cache.lastChecked >= THROTTLE_MS;
  if (stale && typeof options.fetchRelease === 'function') {
    release = validateRelease(await options.fetchRelease()) || release;
  } else if (stale && options.fetch !== false) {
    release = validateRelease(await fetchLatestRelease()) || release;
  }
  if (stale)
    writeCache(cacheFile, {
      lastChecked: now,
      release: release
        ? {
            tag_name: `v${release.version}`,
            html_url: release.url,
            draft: false,
            prerelease: false,
            immutable: release.immutable,
            published_at: release.publishedAt,
            assets: release.assets,
          }
        : null,
    });
  if (!release) return { status: 'unavailable' };
  if (pin && compareVersions(release.version, pin) > 0) {
    return { status: 'pinned', local, latest: release.version, pin, release };
  }
  if (!isNewerVersion(release.version, local))
    return { status: 'current', local, latest: release.version, release };
  const policy = hostPolicy(options.host || 'unknown', release, options);
  return {
    status: 'update-available',
    local,
    latest: release.version,
    release,
    integrityMetadataValid: release.integrityMetadataValid,
    policy,
  };
}

async function getUpdateNotice(root, options = {}) {
  try {
    const result = await checkForUpdate(root, options);
    if (
      result.status !== 'update-available' ||
      result.policy.action === 'defer'
    )
      return '';
    const integrity = result.integrityMetadataValid
      ? 'immutable release with SHA-256 digest metadata; installation remains host-managed'
      : 'stable release; review it in the host manager';
    const action = result.policy.command
      ? `${result.policy.reason ? `${result.policy.reason}. ` : ''}Run: ${result.policy.command}.`
      : result.policy.reason;
    return `gipypowers v${result.latest} is available (current v${result.local}; ${integrity}). ${action}`;
  } catch (_) {
    return '';
  }
}

async function runUpdateCommand(command, flags = {}) {
  if (command !== 'check')
    throw new Error(`unsupported update command: ${command}`);
  const configRoot = path.resolve(flags.root || process.cwd());
  const pluginRoot = path.resolve(
    flags['plugin-root'] ||
      process.env.PLUGIN_ROOT ||
      process.env.CLAUDE_PLUGIN_ROOT ||
      path.resolve(__dirname, '..'),
  );
  const host = flags.host || 'unknown';
  const result = await checkForUpdate(pluginRoot, {
    configRoot,
    host,
    activeTask: Boolean(flags['active-task']),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

module.exports = {
  CACHE_FILE,
  compareNumericIdentifiers,
  RELEASE_URL,
  THROTTLE_MS,
  checkForUpdate,
  compareVersions,
  fetchLatestRelease,
  getUpdateNotice,
  hostPolicy,
  isNewerVersion,
  parseVersion,
  readVersionPin,
  runUpdateCommand,
  validateRelease,
};
