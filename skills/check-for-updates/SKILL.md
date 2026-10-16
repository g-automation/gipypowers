---
name: check-for-updates
description: Use when a user asks about a Gipypowers update, an update fails, or a host reports an available version
---

# Check for Gipypowers Updates

Gipypowers checks stable releases at session startup. Use this explicit command
for a read-only status check:

```sh
node "$PLUGIN_ROOT/core/cli.js" update check --host codex
```

Use `--host claude` or `--host hermes` in those hosts. Pass `--root PATH` to
read project settings and `--plugin-root PATH` when the plugin path is not in
the environment.

## Host Update Rules

- **Codex:** Gipypowers refreshes only the named `gipypowers` marketplace at
  startup when a newer stable release exists and no tracked task is active. It
  verifies the installed version with `codex plugin list`. Set
  `GIPYPOWERS_AUTO_UPDATE=0` or `autoUpdate: false` in
  `.gipypowers/config.json` to opt out.
- **Claude Code:** Let Claude Code's marketplace auto-updater apply updates.
  Third-party marketplace auto-update is off by default; enable it once with
  `/plugin` → **Marketplaces** → **gipypowers** → **Enable auto-update**. Do not
  run a plugin update from a hook or override this marketplace setting. Claude
  Code refreshes after session start; the next session loads the updated plugin.
- **Hermes Agent:** Let Hermes' scheduled updater apply tracked Git plugin
  updates. To opt in, run `hermes config set plugins.auto_apply true`; the
  Gateway checks on its configured schedule (24 hours by default, while the
  Gateway is active) and Hermes keeps its update security scan. Do not run
  `hermes plugins update` from a hook or edit Hermes configuration for the user.
- For Claude or Hermes, explain the native opt-in if it is not already enabled.
  Do not claim an update succeeded before the host's plugin list shows the
  target version.

Manual commands:

```sh
# Codex
codex plugin marketplace upgrade gipypowers

# Claude Code
claude plugin marketplace update gipypowers
claude plugin update gipypowers@gipypowers

# Hermes Agent
hermes plugins update gipypowers
```

Respect `GIPYPOWERS_NO_UPDATE_CHECK=1`, `GIPYPOWERS_VERSION_PIN`, and
`.gipypowers/config.json`'s `versionPin`. `GIPYPOWERS_AUTO_UPDATE=0` disables
Gipypowers' Codex updater; host-native Claude and Hermes settings control their
own automatic updates. Installations from before the updater was introduced
need one host-native update first because older plugin code cannot update
itself. Never edit host-managed caches, run `git pull` in an installed plugin,
or execute a downloaded installer. If release discovery fails, report that
without guessing a version.
