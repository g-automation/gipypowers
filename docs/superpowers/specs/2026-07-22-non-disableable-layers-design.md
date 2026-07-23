# Non-disableable layers + comment/quality rules + install fix

## Purpose

Three behavioral rules must be hardened so they cannot be overridden by user
request, and one install-breaking bug must be fixed:

1. Caveman and Ponytail must never be manually triggered or manually disabled
   — they are fixed layers, not preferences.
2. Comments must be restricted to genuine technical documentation — never
   restating what code does, never narrating work/fix history.
3. Code quality, performance, clean-code practice, and understanding system
   context must always take priority — laziness (ponytail's ladder) never
   trades these away.
4. (Discovered during design) `.claude-plugin/plugin.json` declares
   `"hooks": "./hooks/hooks.json"`, which is the exact standard path Claude
   Code auto-loads by convention — causing a "Duplicate hooks file detected"
   failure at install time.

Superpowers (the on-demand skill library) is explicitly out of scope for
"always active" — individual skills stay task-driven. Only the base
requirement to check for a matching skill (already enforced via the
`using-superpowers` bootstrap) is non-optional, same as today.

## Scope

Edits confined to gipypowers' own rule/hook/manifest/test files. No new
files, no new injected layer — extends the existing three always-on-layer
architecture (caveman, ponytail, using-superpowers bootstrap).

## Changes

### A. Install bug fix

- `.claude-plugin/plugin.json`: remove the `hooks` key. Claude Code
  auto-loads `hooks/hooks.json` from the standard path without a manifest
  declaration; declaring it explicitly causes the duplicate-load error
  reported at install (`Failed to load hooks from
.../hooks/hooks.json: Duplicate hooks file detected ...`).
- `.codex-plugin/plugin.json` is untouched — it points at a non-standard
  filename (`hooks-codex.json`), so no duplicate-load risk exists there.
- `tests/manifest.test.mjs`: update the claude-manifest test to assert
  `m.hooks` is `undefined` instead of `'./hooks/hooks.json'`.

### B. Non-disableable native layers (Rule 1)

- `hooks/gipypowers-activate.js`: reword the `<EXTREMELY_IMPORTANT>` preamble
  so it states plainly that caveman/ponytail cannot be disabled by user
  request, and that checking for a matching superpowers skill is itself
  mandatory (only which specific skill applies is task-driven).
- `rules/caveman-full.md`: add one line — not a togglable preference; a
  request like "stop being terse" doesn't disable the layer, it's handled
  by the existing Auto-Clarity exceptions (which remain unchanged).
- `rules/ponytail-full.md`: add the equivalent line for engineering approach
  (a request like "skip the lazy approach" doesn't disable the layer).
- `skills/using-superpowers/SKILL.md`:
  - "Native layers" section: state explicitly they cannot be disabled by
    user request.
  - "User Instructions" section: narrow scope — a human partner can still
    say "skip skill X for this task" (today's flexibility for individual
    superpowers workflows is unchanged), but that carve-out never extends
    to caveman/ponytail, nor to the base requirement to check for a
    matching skill in the first place.

### C. Comment policy (Rule 2)

New bullet in `rules/ponytail-full.md`'s "Rules" section: comments document
technical facts only (a non-obvious invariant, a public contract, a hidden
constraint) — never restate what code already says, never narrate work
history ("added for X", "fixed Y", "removed old logic"). One line max, no
comment blocks.

### D. Quality/performance/context priority (Rule 3)

Strengthen `rules/ponytail-full.md`'s "When NOT to be lazy" section: laziness
picks the smallest _correct_ implementation, never the sloppiest —
correctness, performance, and clean structure are the baseline the ladder
operates within, not something it discounts. Understanding system/context
stays a hard prerequisite (reinforces existing wording, made explicit
alongside the new quality clause).

## Test/doc fallout

- `tests/manifest.test.mjs` — updated per (A).
- `tests/bootstrap.test.mjs` (`using-superpowers/SKILL.md` < 550 words) and
  `tests/integration.test.mjs` (full SessionStart payload < 1875 words) must
  still pass after the wording additions. Current payload is 1061/1875
  words — comfortable headroom.
- `tests/rules.test.mjs` marker checks are unaffected (no existing markers
  removed); no new markers required since the test asserts presence, not
  absence, of content.
- README.md: no functional change needed: it already states "Native, always
  on" for both layers.

## Out of scope

- No new rules file / no 4th always-on layer (ponytail's own "no unrequested
  abstractions" rule argues against it — content fits the existing two
  files).
- No change to which superpowers skills exist or how they're selected.
- No change to Codex-side hook wiring beyond confirming it's unaffected.
