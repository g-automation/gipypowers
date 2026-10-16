import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const {
  checkForUpdate,
  compareVersions,
  getUpdateNotice,
  hostPolicy,
  isNewerVersion,
  parseVersion,
  RELEASE_URL,
  validateRelease,
} = require('../hooks/lib/update-check.js');

const now = 1_800_000_000_000;
function release(version = '1.1.0', options = {}) {
  return {
    tag_name: `v${version}`,
    html_url: `https://github.com/g-automation/gipypowers/releases/tag/v${version}`,
    draft: false,
    prerelease: false,
    immutable: options.immutable ?? true,
    published_at: '2026-10-01T00:00:00Z',
    assets: options.assets || [{ digest: `sha256:${'a'.repeat(64)}` }],
  };
}

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'gipypowers-updates-'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ version: '1.0.0' }),
  );
  return root;
}

test('semantic version comparison handles releases, prereleases, and build metadata', () => {
  assert.deepEqual(parseVersion('v1.2.3-rc.2+build.4'), {
    major: '1',
    minor: '2',
    patch: '3',
    prerelease: ['rc', '2'],
  });
  assert.equal(compareVersions('1.0.0', '1.0.0-rc.2'), 1);
  assert.equal(compareVersions('1.0.0-rc.10', '1.0.0-rc.2'), 1);
  assert.equal(compareVersions('1.0.0+one', '1.0.0+two'), 0);
  assert.equal(compareVersions('01.0.0', '1.0.0'), null);
  assert.equal(
    compareVersions('900719925474099312345.0.0', '900719925474099312344.0.0'),
    1,
  );
  assert.equal(
    compareVersions(
      '1.0.0-900719925474099312345',
      '1.0.0-900719925474099312344',
    ),
    1,
  );
  assert.equal(parseVersion('1.0.0-rc..2'), null);
  assert.equal(parseVersion('1.0.0+build..4'), null);
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
  assert.equal(isNewerVersion('not-semver', '1.0.0'), false);
  assert.match(
    RELEASE_URL,
    /api\.github\.com\/repos\/g-automation\/gipypowers\/releases\/latest/,
  );
});

test('release validation rejects drafts, prereleases, wrong identities, and malformed digests', () => {
  assert.ok(validateRelease(release('1.1.0'))?.integrityMetadataValid);
  assert.equal(
    validateRelease(release('1.1.0', { assets: [] }))?.integrityMetadataValid,
    false,
  );
  assert.equal(validateRelease({ ...release(), draft: true }), null);
  assert.equal(validateRelease({ ...release(), prerelease: true }), null);
  assert.equal(
    validateRelease({ ...release(), html_url: 'https://example.com/release' }),
    null,
  );
  assert.equal(
    validateRelease(
      release('1.1.0', {
        assets: [{ digest: 'sha1:bad' }],
      }),
    )?.integrityMetadataValid,
    false,
  );
});

test('update discovery honors host manager policy and never mutates the installation', async () => {
  const root = fixtureRoot();
  const cacheFile = join(root, '.cache', 'update.json');
  try {
    const result = await checkForUpdate(root, {
      host: 'claude',
      cacheFile,
      now,
      fetchRelease: async () => release(),
    });
    assert.equal(result.status, 'update-available');
    assert.equal(result.integrityMetadataValid, true);
    assert.equal(result.policy.action, 'host-managed');
    assert.match(result.policy.command, /claude plugin update/);
    assert.equal(
      JSON.parse(
        await import('node:fs/promises').then(({ readFile }) =>
          readFile(join(root, 'package.json'), 'utf8'),
        ),
      ).version,
      '1.0.0',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('host update guidance uses the native manager and defers active work', () => {
  const hermes = validateRelease(release('1.1.0'));
  assert.equal(
    hostPolicy('codex', hermes).command,
    'codex plugin marketplace upgrade gipypowers',
  );
  assert.equal(
    hostPolicy('hermes', hermes).command,
    'hermes plugins update gipypowers',
  );
  assert.equal(
    hostPolicy('claude', hermes).command,
    'claude plugin update gipypowers',
  );
  assert.equal(
    hostPolicy('hermes', hermes, { activeTask: true }).action,
    'defer',
  );
});

test('update notices are withheld while a task checkpoint is active', async () => {
  const root = fixtureRoot();
  try {
    const notice = await getUpdateNotice(root, {
      activeTask: true,
      cacheFile: join(root, '.cache', 'update.json'),
      now,
      fetchRelease: async () => release(),
    });
    assert.equal(notice, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('update notices describe digest metadata without claiming artifact verification', async () => {
  const root = fixtureRoot();
  try {
    const notice = await getUpdateNotice(root, {
      cacheFile: join(root, '.cache', 'update.json'),
      now,
      fetchRelease: async () => release(),
    });
    assert.match(notice, /immutable release with SHA-256 digest metadata/i);
    assert.doesNotMatch(notice, /host manager verifies installed artifacts/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('update checks honor version pins, opt-out, and active work deferral', async () => {
  const root = fixtureRoot();
  const cacheFile = join(root, '.cache', 'update.json');
  try {
    mkdirSync(join(root, '.gipypowers'), { recursive: true });
    writeFileSync(
      join(root, '.gipypowers', 'config.json'),
      JSON.stringify({ versionPin: '1.0.5' }),
    );
    const pinned = await checkForUpdate(root, {
      cacheFile,
      now,
      fetchRelease: async () => release(),
    });
    assert.equal(pinned.status, 'pinned');
    const optedOut = await checkForUpdate(root, {
      env: { GIPYPOWERS_NO_UPDATE_CHECK: '1' },
    });
    assert.equal(optedOut.status, 'disabled');
    writeFileSync(join(root, '.gipypowers', 'config.json'), JSON.stringify({}));
    const deferred = await checkForUpdate(root, {
      activeTask: true,
      cacheFile,
      now,
      fetchRelease: async () => release('1.1.0'),
    });
    assert.equal(deferred.status, 'update-available');
    assert.equal(deferred.policy.action, 'defer');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('release cache limits network lookups and preserves validated stable metadata', async () => {
  const root = fixtureRoot();
  const cacheFile = join(root, '.cache', 'update.json');
  try {
    let fetches = 0;
    await checkForUpdate(root, {
      cacheFile,
      now,
      fetchRelease: async () => {
        fetches++;
        return release();
      },
    });
    const cached = await checkForUpdate(root, {
      cacheFile,
      now: now + 1000,
      fetchRelease: async () => {
        fetches++;
        return null;
      },
    });
    assert.equal(fetches, 1);
    assert.equal(cached.latest, '1.1.0');
    assert.equal(cached.release.integrityMetadataValid, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
