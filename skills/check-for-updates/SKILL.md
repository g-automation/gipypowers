---
name: check-for-updates
description: Use when the user asks about a Gipypowers update or a host reports one; inspect the stable release and use the host's native updater
---

# Check for Gipypowers Updates

Gipypowers checks the latest stable GitHub release at session start and
provides a host-specific action when an update is available. For an explicit
check, run the shared CLI from the plugin installation:

```sh
node "$PLUGIN_ROOT/core/cli.js" update check --host codex
```

Use `--host claude` or `--host hermes` when running in those hosts. Pass
`--root PATH` to read project version-pin settings and `--plugin-root PATH` if
the plugin path is not available in the environment.

## Update Policy

- Use only a stable release that matches the Gipypowers repository and has
  valid semantic-version metadata. Gipypowers checks release identity and
  digest metadata; it does not claim to verify downloaded artifact bytes.
- Respect `GIPYPOWERS_NO_UPDATE_CHECK=1`, `GIPYPOWERS_VERSION_PIN`, and
  `.gipypowers/config.json`'s `versionPin` setting.
- Let the host manager own installation, rollback, user data, and managed
  caches. Never run `git pull` in a host plugin directory, edit a plugin cache,
  or execute a downloaded installer.
- Defer updates while a task checkpoint is active.
- If the host cannot apply an update safely, give the native next step:

```sh
# Claude Code
claude plugin update gipypowers

# Hermes Agent
hermes plugins update gipypowers

# Codex: refresh the marketplace, then update Gipypowers in the Plugins manager
codex plugin marketplace upgrade gipypowers
```

Codex's marketplace command refreshes the configured marketplace; select the
plugin update in the Codex Plugins manager afterward. Do not claim that the
plugin itself was updated until its installed version confirms the change.

If release discovery is unavailable, report that fact without guessing a
version. Do not ask for permission to run a read-only version check.
