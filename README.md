# gipypowers

The canonical gipyware plugin. One install gives a coding agent three always-on layers:

- **Caveman** — terse output (drop filler, keep every technical fact). Native, always on.
- **Ponytail** — YAGNI, stdlib-first, smallest correct diff. Native, always on.
- **Superpowers** — brainstorming, planning, TDD, debugging, and review skills, loaded on demand.

Tuned for OpenAI Codex (gpt-5.6 / 5.5 / 5.4) and a 10%-of-context token budget; also installs in Claude Code.

## Install

- **Codex:** add this plugin directory; `.codex-plugin/plugin.json` registers the skills and the SessionStart hook.
- **Claude Code:** add via the marketplace entry in `.claude-plugin/marketplace.json`, or point Claude Code at this directory.

## How it works

A single `SessionStart` hook injects the caveman + ponytail rulesets and the `using-superpowers` bootstrap. Every other skill loads only when invoked, so the always-on cost stays under ~2,500 tokens. A `SubagentStart` hook re-injects a compact reminder and the 27k-token budget so subagents stay terse, lazy, and in budget.

## Credits

Combines and adapts caveman (JuliusBrussee), ponytail (DietrichGebert), and superpowers (obra) — all MIT. See `NOTICE`.
