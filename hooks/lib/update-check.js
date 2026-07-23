'use strict';
// Throttled, bounded, best-effort GitHub version check for the SessionStart hook.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(os.homedir(), '.gipypowers');
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json');
const THROTTLE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1500;
const REMOTE_URL =
  'https://raw.githubusercontent.com/g-automation/gipypowers/main/package.json';

function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const parts = v.trim().split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return nums;
}

function isNewerVersion(remote, local) {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  if (!r || !l) return false;
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeCache(cache) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch (_) {
    // silent-fail: cache is best-effort
  }
}

function fetchRemoteVersion() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let req;
    try {
      req = https.get(
        REMOTE_URL,
        { headers: { 'User-Agent': 'gipypowers-update-check' } },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              finish(JSON.parse(body).version || null);
            } catch (_) {
              finish(null);
            }
          });
        },
      );
      req.on('error', () => finish(null));
      req.setTimeout(FETCH_TIMEOUT_MS, () => {
        req.destroy();
        finish(null);
      });
    } catch (_) {
      finish(null);
    }
  });
}

function readLocalVersion(root) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ).version;
  } catch (_) {
    return null;
  }
}

async function getUpdateNotice(root) {
  try {
    const local = readLocalVersion(root);
    if (!local) return '';

    let cache = readCache();
    const stale =
      !cache.lastChecked || Date.now() - cache.lastChecked > THROTTLE_MS;

    if (stale && !process.env.GIPYPOWERS_NO_UPDATE_CHECK) {
      const remoteVersion = await fetchRemoteVersion();
      cache = {
        lastChecked: Date.now(),
        latestVersion: remoteVersion || cache.latestVersion,
      };
      writeCache(cache);
    }

    if (cache.latestVersion && isNewerVersion(cache.latestVersion, local)) {
      return `gipypowers v${cache.latestVersion} available (you have v${local}) — run /check-for-updates`;
    }
    return '';
  } catch (_) {
    return '';
  }
}

module.exports.isNewerVersion = isNewerVersion;
module.exports.getUpdateNotice = getUpdateNotice;
