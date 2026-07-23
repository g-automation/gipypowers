# gipypowers

The canonical gipyware plugin. One install gives a coding agent three layers:

- **Caveman** — terse output (drop filler, keep every technical fact). Native, always on, cannot be disabled by user request.
- **Ponytail** — YAGNI, stdlib-first, smallest correct diff, clean-code/performance never traded away. Native, always on, cannot be disabled by user request.
- **Superpowers** — brainstorming, planning, TDD, debugging, and review skills, loaded on demand. Checking for a matching skill is itself mandatory; which specific skill applies is task-driven.

Tuned for OpenAI Codex (gpt-5.6 / 5.5 / 5.4) and a 10%-of-context token budget; also installs in Claude Code.

## Install

- **Codex:** add this plugin directory; `.codex-plugin/plugin.json` registers the skills and the SessionStart hook.
- **Claude Code:** add via the marketplace entry in `.claude-plugin/marketplace.json`, or point Claude Code at this directory.

## How it works

A single `SessionStart` hook injects the caveman + ponytail rulesets and the `using-superpowers` bootstrap. Every other skill loads only when invoked, so the always-on cost stays under ~2,500 tokens. A `SubagentStart` hook re-injects a compact reminder and the 27k-token budget so subagents stay terse, lazy, and in budget.

## Updating

A `SessionStart` hook checks GitHub once every 24h (best-effort, silent on
failure, bounded to ~1.5s) and adds one line to the injected context if a
newer release exists. Set `GIPYPOWERS_NO_UPDATE_CHECK=1` to disable this
check entirely.

To actually update:

- **Codex / manual clone:** the plugin directory is a normal git checkout —
  `cd` into it and `git pull`.
- **Claude Code marketplace install:** open `/plugin`, refresh the
  `gipypowers` marketplace entry, then update the plugin from there — Claude
  Code fetches the new version into its own cache directory.

Or ask the agent to run the `check-for-updates` skill, which detects which
of the two situations applies and does (or tells you) the right thing.

## Credits

Combines and adapts caveman (JuliusBrussee), ponytail (DietrichGebert), and superpowers (obra) — all MIT. See `NOTICE`.
