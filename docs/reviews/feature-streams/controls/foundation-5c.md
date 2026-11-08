# Controls slice 5c: rendered fixture evidence

Date 2026-11-08. Source: shared-graph-controls decision 25; lesson-authoring workstream 1 (I3).

## Files and recipe

- `fixtures/controls/{index.html,main.tsx,fixture.css}`: real `src/inputs/` components with the app CSS, set twice (Edit and Display
  placement, workspace wrapper classes). `?lang=en|sl`. Fixture-only long strings; no catalog keys added. Served at
  `/bezeg-2.0/fixtures/controls/` by the Vite dev server; `find build -ipath '*fixture*'` is empty after `just build`.
- `tests/controls-fixture.spec.cjs`, `tests/controls-fixture.config.cjs` (port 4328, `--strictPort`, cwd = repo root).
- `just controls-fixture [args]` (justfile, `scripts/commands.cjs`, slot memory in `scripts/test-slots.cjs`, `docs/commands.md`,
  wiring test in `scripts/commands.test.cjs`). `tsconfig.json` and `eslint.config.mjs` include `fixtures/`.
- Screenshots: `test-results-4328/controls-fixture/<view>-<lang>.png` (12 files, gitignored).

## Result (unmutated)

`just controls-fixture`: passed, 36 tests, 4 of them expected failures (`test.fail`, below). Also green: typecheck, lint, build,
`just tooling-test`. Logs: `.command-logs/5c-*.log`, final run `.command-logs/5c-final.log`.

| View (sl and en) | Refusal on load | Clipping | Focus indicator | Notes |
|---|---|---|---|---|
| 1440x900 | pass | pass | pass | |
| 1024x768 | pass | pass | pass | |
| 724x900 | pass | pass | pass | |
| 390x844 | pass | pass | pass | |
| 1440x900, 200% text | pass | expected fail (finding 1) | pass | |
| coarse 390x844 | n/a | n/a | n/a | targets: expected fail (finding 2) |

## Mutation evidence

The first checks were too weak (focus compared border and background colour, which Bootstrap changes on focus; the width mutation
was ignored by `flex:1`). Now the focus check compares only outline style, width, colour and box-shadow (plus pseudo-elements),
and the clip check is a real width test.

- Clip mutation `.bool-field-label{max-width:20px!important;flex:none!important;overflow:hidden!important}`: 8 failed, 28 passed
  (`.command-logs/5c-mutclip.log`).
- Focus mutation `:focus-visible{outline:none!important;box-shadow:none!important}`: 10 failed, all "each focusable control shows
  a focus indicator" (5 views x 2 languages) (`.command-logs/5c-mutfocus2.log`). The earlier colour-comparing version passed
  under this mutation.
- Mutations removed; `fixture.css` equals the clean backup; unmutated run passes.
- No real control fails the stricter focus check.

## Findings (component CSS not changed)

1. 200% text, both languages: the ChoiceSelect selected text is clipped (native one-line select). In Display placement,
   `.inspector-display-graph` (`src/graphs/base/DemonstrationWorkspace.css:284`, grid without `minmax(0,1fr)`) widens to the select
   and pushes controls past the 310px inspector. Kept as `test.fail`.
2. Coarse pointer: every NumberInput field is 40px tall, not only the slider's. `.number-input input[type]` at
   `src/inputs/NumberInput.css:4-7` (specificity 0,2,1) beats the coarse rule at `:26` (0,1,1). `CountSetter.css:15` fixes only
   the stepper. Kept as `test.fail`.
3. A long unbreakable BooleanField label (a 74-character word) does not break and overflows the inspector
   (`src/inputs/BooleanField.css:5`, flex container). The fixture now uses a 21-character word, so this is not asserted.
4. No other clipping, focus or target failure at 5 views x 2 languages.

## Gaps

- Chromium only; no Firefox/WebKit (slider thumb focus rings are `-webkit-`/`-moz-` rules).
- Focus is checked by Tab traversal on the fixture, not inside real lessons or the live workspace.
- Coarse-pointer check is emulation (`hasTouch`, `isMobile`) at 390x844 only.
- Screen-reader naming and forced-colours are not covered.
- The unbreakable-label overflow (finding 3) has no test.
