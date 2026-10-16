'use strict';

// Release discovery is read-only. Host managers own installation and rollback.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const https = require('node:https');

const THROTTLE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1800;
const MAX_RESPONSE_BYTES = 64 * 1024;
const RELEASE_URL =
  'https://api.github.com/repos/g-automation/gipypowers/releases/latest';
const CACHE_FILE = path.join(os.homedir(), '.gipypowers', 'release-check.json');
const AUTO_UPDATE_STATE_FILE = path.join(
  os.homedir(),
  '.gipypowers',
  'auto-update.json',
);
const AUTO_UPDATE_LOCK_FILE = path.join(
  os.homedir(),
  '.gipypowers',
  'auto-update.lock',
);
const AUTO_UPDATE_COMMAND_TIMEOUT_MS = 4000;
const AUTO_UPDATE_LOCK_STALE_MS = 15 * 60 * 1000;
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
      command: 'claude plugin update gipypowers@gipypowers',
      reason:
        'enable auto-update for the Gipypowers marketplace in /plugin > Marketplaces',
    };
  if (host === 'codex')
    return {
      action: 'notify',
      command: 'codex plugin marketplace upgrade gipypowers',
      reason:
        'refresh the marketplace and select Gipypowers in the Codex Plugins manager',
    };
  if (host === 'hermes')
    return {
      action: 'host-managed',
      command: 'hermes plugins update gipypowers',
      reason:
        'enable Hermes scheduled plugin auto-apply with `hermes config set plugins.auto_apply true`',
    };
  return {
    action: 'notify',
    reason: 'review the stable release and install it through the host manager',
  };
}

function hostUpdatePlan(host) {
  if (host === 'codex')
    return {
      updates: [
        {
          operation: 'update',
          command: 'codex',
          args: ['plugin', 'marketplace', 'upgrade', 'gipypowers', '--json'],
          timeoutMs: 6500,
        },
      ],
      verify: {
        operation: 'verify-version',
        command: 'codex',
        args: ['plugin', 'list', '--marketplace', 'gipypowers', '--json'],
        timeoutMs: 2500,
      },
    };
  if (host === 'claude')
    return {
      updates: [],
      verify: {
        operation: 'verify-version',
        command: 'claude',
        args: ['plugin', 'list', '--json'],
      },
      nativeAutoUpdate: 'marketplace',
    };
  if (host === 'hermes')
    return {
      updates: [],
      verify: {
        operation: 'verify-version',
        command: 'hermes',
        args: ['plugins', 'list', '--json'],
      },
      autoApply: {
        operation: 'check-auto-apply',
        command: 'hermes',
        args: ['config', 'get', 'plugins.auto_apply'],
      },
      nativeAutoUpdate: 'scheduled',
    };
  return null;
}

function autoUpdateDisabled(configRoot, env = process.env) {
  if (/^(0|false|no)$/i.test(env.GIPYPOWERS_AUTO_UPDATE || '')) return true;
  try {
    const config = JSON.parse(
      fs.readFileSync(
        path.join(configRoot, '.gipypowers', 'config.json'),
        'utf8',
      ),
    );
    return config.autoUpdate === false;
  } catch (_) {
    return false;
  }
}

function readAutoUpdateState(file) {
  try {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    return state && typeof state === 'object' ? state : {};
  } catch (_) {
    return {};
  }
}

function writeAutoUpdateState(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (_) {
    // Update throttling is best-effort and must not block a host session.
  }
}

function acquireUpdateLock(file, now = Date.now()) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, 'wx', 0o600);
    fs.writeFileSync(fd, `${JSON.stringify({ pid: process.pid, now })}\n`);
    return fd;
  } catch (error) {
    if (error.code !== 'EEXIST') return null;
  }
  try {
    if (now - fs.statSync(file).mtimeMs > AUTO_UPDATE_LOCK_STALE_MS) {
      fs.unlinkSync(file);
      return acquireUpdateLock(file, now);
    }
  } catch (_) {
    // A disappearing lock is treated as busy; the next session can retry.
  }
  return null;
}

function releaseUpdateLock(file, fd) {
  try {
    fs.closeSync(fd);
  } catch (_) {
    // Best-effort cleanup.
  }
  try {
    fs.unlinkSync(file);
  } catch (_) {
    // Best-effort cleanup.
  }
}

function runHostCommand(step, options = {}) {
  if (typeof options.runCommand === 'function') return options.runCommand(step);
  return spawnSync(step.command, step.args, {
    encoding: 'utf8',
    env: options.env || process.env,
    maxBuffer: 128 * 1024,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout:
      step.timeoutMs ||
      options.commandTimeoutMs ||
      AUTO_UPDATE_COMMAND_TIMEOUT_MS,
  });
}

function installedHostVersion(host, output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (_) {
    return null;
  }
  const plugins = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.installed)
      ? parsed.installed
      : [];
  const plugin = plugins.find((item) => {
    if (!item || typeof item !== 'object') return false;
    if (host === 'codex')
      return (
        item.pluginId === 'gipypowers@gipypowers' ||
        (item.name === 'gipypowers' && item.marketplaceName === 'gipypowers')
      );
    if (host === 'claude') return item.id === 'gipypowers@gipypowers';
    return item.name === 'gipypowers';
  });
  return plugin && typeof plugin.version === 'string' ? plugin.version : null;
}

function commandFailure(result) {
  if (result?.error?.code === 'ETIMEDOUT')
    return 'host manager command timed out';
  if (result?.error?.code === 'ENOENT')
    return 'host manager command was not found';
  if (result?.error) return 'host manager command could not run';
  return `host manager returned exit code ${Number.isInteger(result?.status) ? result.status : 'unknown'}`;
}

function attemptResult(status, update, details = {}) {
  return {
    status,
    host: update.host,
    local: update.local,
    latest: update.latest,
    policy: update.policy,
    ...details,
  };
}

async function runAutomaticUpdate(root, options = {}) {
  const env = options.env || process.env;
  const configRoot = options.configRoot || root;
  const host = options.host || 'unknown';
  if (env.GIPYPOWERS_NO_UPDATE_CHECK === '1') return { status: 'disabled' };
  if (host === 'codex' && autoUpdateDisabled(configRoot, env))
    return { status: 'disabled' };
  const plan = hostUpdatePlan(host);
  if (!plan) return { status: 'unsupported-host', host };

  let activeTask = options.activeTask;
  if (activeTask === undefined) {
    try {
      activeTask = Boolean(require('./task-state').readTaskState(configRoot));
    } catch (_) {
      activeTask = false;
    }
  }
  const update = await checkForUpdate(root, {
    ...options,
    configRoot,
    env,
    host,
    activeTask: Boolean(activeTask),
  });
  if (update.status !== 'update-available') return update;
  if (update.policy.action === 'defer')
    return attemptResult('deferred', update, { reason: update.policy.reason });

  if (plan.nativeAutoUpdate) {
    let verification;
    try {
      verification = await runHostCommand(plan.verify, options);
    } catch (error) {
      verification = { error: { code: error.code || 'UNKNOWN' } };
    }
    if (verification?.status === 0) {
      const verifiedVersion = installedHostVersion(
        host,
        verification.stdout || '',
      );
      if (
        verifiedVersion &&
        compareVersions(verifiedVersion, update.latest) !== null &&
        compareVersions(verifiedVersion, update.latest) >= 0
      ) {
        return attemptResult('already-updated', update, {
          verifiedVersion,
          restartRequired: host === 'claude',
        });
      }
    }
    if (host === 'hermes') {
      let autoApply;
      try {
        autoApply = await runHostCommand(plan.autoApply, options);
      } catch (error) {
        autoApply = { error: { code: error.code || 'UNKNOWN' } };
      }
      if (autoApply?.status === 0 && autoApply.stdout?.trim() === 'true') {
        return attemptResult('host-managed', update, {
          reason:
            'Hermes auto-apply is enabled; tracked Git plugin updates run during scheduled Gateway checks (default 24 hours while the Gateway is active) and retain the host security scan',
        });
      }
    }
    return attemptResult('host-auto-update-required', update, {
      reason:
        host === 'claude'
          ? 'Claude Code applies marketplace updates after startup when auto-update is enabled; if it is not already enabled, turn it on in /plugin > Marketplaces (third-party marketplaces default to off)'
          : 'enable Hermes scheduled auto-apply with `hermes config set plugins.auto_apply true`; its scheduled Gateway checks run only while the Gateway is active, or update through the Hermes plugin manager',
    });
  }

  const now = options.now ?? Date.now();
  const stateFile = options.stateFile || AUTO_UPDATE_STATE_FILE;
  const lockFile = options.lockFile || AUTO_UPDATE_LOCK_FILE;
  const state = readAutoUpdateState(stateFile);
  const prior = state.attempts?.[host];
  if (
    prior?.version === update.latest &&
    Number.isFinite(prior.attemptedAt) &&
    now - prior.attemptedAt < THROTTLE_MS
  ) {
    return attemptResult(
      prior.status === 'updated' ? 'already-updated' : 'retry-deferred',
      update,
      {
        reason: prior.reason || '',
        verifiedVersion: prior.verifiedVersion || '',
      },
    );
  }

  const lockFd = acquireUpdateLock(lockFile, now);
  if (lockFd === null)
    return attemptResult('busy', update, {
      reason: 'another update is running',
    });

  try {
    const latestState = readAutoUpdateState(stateFile);
    const latestPrior = latestState.attempts?.[host];
    if (
      latestPrior?.version === update.latest &&
      Number.isFinite(latestPrior.attemptedAt) &&
      now - latestPrior.attemptedAt < THROTTLE_MS
    ) {
      return attemptResult(
        latestPrior.status === 'updated' ? 'already-updated' : 'retry-deferred',
        update,
        {
          reason: latestPrior.reason || '',
          verifiedVersion: latestPrior.verifiedVersion || '',
        },
      );
    }

    const attempts = { ...(latestState.attempts || {}) };
    attempts[host] = {
      version: update.latest,
      attemptedAt: now,
      status: 'running',
    };
    writeAutoUpdateState(stateFile, { attempts });

    for (const step of plan.updates) {
      let commandResult;
      try {
        commandResult = await runHostCommand(step, options);
      } catch (error) {
        commandResult = { error: { code: error.code || 'UNKNOWN' } };
      }
      if (commandResult?.status !== 0) {
        const reason = commandFailure(commandResult);
        attempts[host] = {
          version: update.latest,
          attemptedAt: now,
          status: 'failed',
          reason,
        };
        writeAutoUpdateState(stateFile, { attempts });
        return attemptResult('failed', update, { reason });
      }
    }

    let verification;
    try {
      verification = await runHostCommand(plan.verify, options);
    } catch (error) {
      verification = { error: { code: error.code || 'UNKNOWN' } };
    }
    if (verification?.status !== 0) {
      const reason = commandFailure(verification);
      attempts[host] = {
        version: update.latest,
        attemptedAt: now,
        status: 'failed',
        reason,
      };
      writeAutoUpdateState(stateFile, { attempts });
      return attemptResult('failed', update, { reason });
    }
    const verifiedVersion = installedHostVersion(
      host,
      verification.stdout || '',
    );
    if (
      !verifiedVersion ||
      compareVersions(verifiedVersion, update.latest) === null ||
      compareVersions(verifiedVersion, update.latest) < 0
    ) {
      const reason = 'the host manager did not confirm the target version';
      attempts[host] = {
        version: update.latest,
        attemptedAt: now,
        status: 'failed',
        reason,
      };
      writeAutoUpdateState(stateFile, { attempts });
      return attemptResult('failed', update, { reason });
    }

    attempts[host] = {
      version: update.latest,
      attemptedAt: now,
      status: 'updated',
      verifiedVersion,
    };
    writeAutoUpdateState(stateFile, { attempts });
    return attemptResult('updated', update, {
      verifiedVersion,
      restartRequired: host === 'claude',
    });
  } finally {
    releaseUpdateLock(lockFile, lockFd);
  }
}

function formatAutoUpdateNotice(result) {
  if (!result || !result.latest) return '';
  const host = result.host === 'unknown' ? 'host manager' : result.host;
  if (result.status === 'updated' || result.status === 'already-updated') {
    const restart =
      result.host === 'claude'
        ? 'Start a new Claude Code session'
        : 'Start a new session';
    return `Gipypowers v${result.verifiedVersion || result.latest} is installed through ${host}; ${restart} to load it.`;
  }
  if (result.status === 'host-managed')
    return `Gipypowers v${result.latest} is available. ${result.reason}.`;
  if (result.status === 'host-auto-update-required') {
    return `Gipypowers v${result.latest} is available. ${result.reason}. Manual update: ${result.policy?.command || 'use the host plugin manager'}.`;
  }
  if (
    result.status === 'failed' ||
    result.status === 'retry-deferred' ||
    result.status === 'unsupported-host'
  ) {
    const action = result.policy?.command
      ? `Run: ${result.policy.command}.`
      : 'Use the host plugin manager to install the stable release.';
    const reason = result.reason ? ` (${result.reason})` : '';
    return `Gipypowers v${result.latest} could not be confirmed as installed automatically${reason}. ${action}`;
  }
  if (result.status === 'update-available') {
    const action = result.policy?.command
      ? `Run: ${result.policy.command}.`
      : 'Use the host plugin manager to install the stable release.';
    return `Gipypowers v${result.latest} is available. ${action}`;
  }
  return '';
}

async function getStartupUpdateNotice(root, options = {}) {
  try {
    const result = await runAutomaticUpdate(root, options);
    return formatAutoUpdateNotice(result);
  } catch (_) {
    return '';
  }
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
  if (command !== 'check' && command !== 'startup')
    throw new Error(`unsupported update command: ${command}`);
  const configRoot = path.resolve(flags.root || process.cwd());
  const pluginRoot = path.resolve(
    flags['plugin-root'] ||
      process.env.PLUGIN_ROOT ||
      process.env.CLAUDE_PLUGIN_ROOT ||
      path.resolve(__dirname, '..'),
  );
  const host = flags.host || 'unknown';
  const result =
    command === 'startup'
      ? await runAutomaticUpdate(pluginRoot, {
          configRoot,
          host,
          ...(flags['active-task'] === true ? { activeTask: true } : {}),
        })
      : await checkForUpdate(pluginRoot, {
          configRoot,
          host,
          activeTask: Boolean(flags['active-task']),
        });
  if (command === 'startup') result.notice = formatAutoUpdateNotice(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

module.exports = {
  CACHE_FILE,
  AUTO_UPDATE_COMMAND_TIMEOUT_MS,
  AUTO_UPDATE_STATE_FILE,
  compareNumericIdentifiers,
  RELEASE_URL,
  THROTTLE_MS,
  autoUpdateDisabled,
  checkForUpdate,
  compareVersions,
  fetchLatestRelease,
  formatAutoUpdateNotice,
  getUpdateNotice,
  getStartupUpdateNotice,
  hostPolicy,
  hostUpdatePlan,
  isNewerVersion,
  parseVersion,
  readVersionPin,
  runAutomaticUpdate,
  runUpdateCommand,
  validateRelease,
};
