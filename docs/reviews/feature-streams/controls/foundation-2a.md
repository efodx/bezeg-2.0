# Foundation slice 2a: evidence

Worker report for [the brief](foundation-2a-brief.md). Logs are in `.command-logs/2a-*.log` (ignored by Git); screenshots in `.command-logs/2a-shots/`.

## Changes

- New `src/inputs/UnavailableButton.tsx` (D-a), `src/inputs/RefusalChannel.tsx` and `.css` (D-b: `RefusalChannel`, `RefusalNotice` with `data-refusal-notice`), `src/graphs/base/controls/guard.ts` (D-c, kept beside the graph code because it needs `DomainError`).
- `PlaybackButtons` rebuilt on `UnavailableButton`; DOM contract (`data-action`, `data-playback-reason`, `inspector-playback`) unchanged; its test file is unchanged and passes. The hidden description span now sits after its button instead of after the group's children.
- `NumberInput`: `grid` (D-e, using `gridUnits` and `cleanNumber` from `src/analysis/numbers`, so no move was needed) and `unavailableReason` (D-f). The old `disabled` prop is untouched.
- `CountSetter`: unavailable buttons at bounds (D-g), own status region `data-count-status`, optional `minReason`/`maxReason`.
- `CorrelationGraph`: private notice/guard replaced (D-h); `guarded` is now `protected` so the host test can call it. Refusal renders alone in `data-refusal-notice`.
- `sl.ts`/`en.ts`: `number_snapped_hint` (Zaokroženo na / Rounded to), `count_at_minimum` (Najmanj / At least), `count_at_maximum` (Največ / At most).
- Tests: `UnavailableButton.test.tsx`, `RefusalChannel.test.tsx`, `guard.test.ts`, `NumberInput.grid.test.tsx` (new); `CountSetter.test.tsx` and `CorrelationGraph.host.test.tsx` updated; `tests/count-setter.smoke.spec.cjs` updated.

## Decisions beyond D-a to D-h

- The channel holds `Message | string`; a `DomainError` without a reason is stored as its message text.
- The unavailable `NumberInput` shows the reason permanently as its (visible) hint, linked by `aria-describedby`, rather than a hidden span; `title` carries it too.
- `NumberInput` adjusts its state while rendering when `unavailableReason` appears (the lint rule rejects setState in an effect).
- The CountSetter status region uses `data-count-status`, not a reused class, because `<output>` already has the status role and the existing `onSet` test queried `getByRole('status')`; that test now reads all status regions.
- Dashed border marks unavailable fields and (forced colours) buttons without colour; `RefusalChannel.css` gives the refusal line a readable colour in the presenting theme.
- Playwright treats `aria-disabled` as not enabled, so the old `toBeDisabled()` in the count-setter smoke would still have passed. The updated test now checks `aria-disabled`, focuses the button, presses Enter on the keyboard and asserts focus and the status text.

## Known limits

- A `NumberInput` draft open when the field unmounts is dropped silently (D-f).
- No graph uses `grid` or `unavailableReason` yet; their screenshots come from the component's own markup rendered with the built stylesheet (static, so layout is narrower than in the app).
- The guarded commit check `if (unavailableReason !== undefined) return false` in `commit` is redundant with the key, change and draft-drop guards (mutation survived); kept as defence in depth.
- Pre-existing: `.function-inspector [role="status"] > p.inspector-help` (FunctionReadout.css, not owned) has no presenting colour, so other status lines in function inspectors are dark on the dark presenting panel (seen in the first Correlation shot). `RefusalChannel.css` only fixes the refusal line.
- In forced colours the `GrayText` colour of the unavailable field did not show in the static capture (the border rendered red-brown); the dashed border and the visible reason carry the state.

## Mutation evidence

Each mutation was applied alone, the focused unit file run, then reverted (`.command-logs/2a-mutations.log`). All killed except the one noted.

| Mutation | Result |
|---|---|
| button runs action when unavailable | killed (2) |
| UnavailableButton without title / without description span / reason not given on press | killed (1 each) |
| channel `clear` a no-op / second refusal ignored / no language subscription | killed (1 each) |
| guard: success does not clear / swallows non-`DomainError` | killed (1 each) |
| NumberInput: no snap / snap result not range-checked / range not checked on commit / no snap hint | killed (3 / 1 / 1 / 2) |
| NumberInput: not read-only when unavailable / draft not dropped | killed (1 each) |
| NumberInput: commit not blocked when unavailable | SURVIVED (redundant guard) |
| CountSetter: minus never unavailable / reason not shown on press | killed (1 each) |
| Correlation: refusal not surfaced or cleared / notice not rendered | killed (1 / 3) |

## Checks

- `just unit src/inputs src/graphs/base/controls src/graphs/functions/Correlation`: passed (`2a-unit.log`).
- `just typecheck`, `just lint`, `just build`: see the report; logs `2a-typecheck.log`, `2a-lint.log`, `2a-build.log` (build warnings are Sass deprecation notices only).
- Smoke (built app, own server, ports 4327/4328): `tests/count-setter.smoke.spec.cjs` and `tests/curve-ownership.smoke.spec.cjs` passed (`2a-smoke1.log`); `just smoke-lesson bisection sequence fixed-point prob-correlation` passed (`2a-smoke2.log`; these are the guided-lesson rows that use playback or correlation). `tests/demonstrations.smoke.spec.cjs` has no playback or correlation test. No `ERR_NO_BUFFER_SPACE` seen. The smoke ran before the final CSS-only edits (dashed borders, refusal colour); those were checked by screenshot only.
- Screenshots: `countsetter-*`, `correlation-*`, `numberinput-*` for light, presenting and forced colours. Gaps found were fixed (dashed unavailable marker, presenting colour); the remaining ones are listed above.

## Repairs (PARTIAL: budget handoff)

Done in code and tests: R1 (CountSetter drops the blocked-press reason when `n` changes), R2 CSS (dashed border; presenting pair #b5bfd0 on #2b3b57), R3 (NumberInput hint in an always-present `.number-input-live` status region), R4 (CountSetter reason line keyed by a press counter; `RefusalChannel.refuse(refusal, announce)` bumps `announcements`, `guard` passes `announce`, `RefusalNotice` keys its line on it), R5 (`sameRefusal` compares key and params), R6 (snapped hint uses the grid's decimals), R7 (ties away from zero), R8 (prop comment), R9 (exact message `Število točk mora biti od 2 do 20.`). New tests added for R1, R4, R5, R6, R7, R3.

Observed: `just unit src/inputs src/graphs/base/controls src/graphs/functions/Correlation src/graphs/functions/BinomialNormal` passed (`2a-unit.log`). R3 broke existing tests that expected no status role when there is no hint; I changed them to expect an empty region (`NumberInput.test.tsx`) and narrowed one selector in `BinomialNormalGraph.host.test.tsx` line 279 (outside the owned paths, mechanical consequence).

NOT done or not observed: mutation runs for the new assertions; `just typecheck`, `just lint`, `just build` after the repairs; the count-setter smoke on 4327; the presenting and forced-colours CountSetter screenshots (R2 contrast unverified by screenshot). `just check-changed` was started and was still running (log `.command-logs/2a-changed.log`, empty when I stopped; its detailed log is the newest `.command-logs/2026-11-07T16-12-*.log`), so other tests that query `role=status` near a NumberInput (compgeo, DensityArea, Slider, etc.) are unverified.

## Handler completion of the repairs

- **R3 withdrawn.** An always-present status region in every `NumberInput` broke `TensorDerivativesGraph.test.tsx` (multiple status roles) and `LookUnderneath.test.tsx`, which pins a single live region per controls area. The hint is back to the 1a markup (`<p role="status">` mounted with its text), the `NumberInput.test.tsx` and `BinomialNormalGraph.host.test.tsx` changes are reverted, and the R3 test is removed. Whether a field hint is announced on insert moves to slice 3 (announcements, C21), which decides live regions as a whole.
- **R6 corrected.** `-log10(grid)` gives 1 decimal for a 0.25 grid; `gridDecimals` now counts the grid's decimal places. New test (grid 0.25, `decimals={0}`, 0,3 → "Zaokroženo na 0,25."), observed failing under the old formula (`2a-mut-griddec.log`).
- **Contract update outside the owned paths:** `LeastSquaresGraph.host.test.tsx` lines 133, 141 and 146 assert `aria-disabled="true"` instead of `toBeDisabled()` (decision 13).
- **Mutations of the repairs** (`.command-logs/2a-mut-repairs.sh`, logs `2a-mut-r*.log`): R1 stale reason, R4 count key, R4 notice key, R5 dedupe by identity, R7 ties by `Math.round` — each failed one test.
- **Checks after the repairs:** `just check-changed` passed (typecheck, lint, affected units, build; `2a-check-changed-2.log`). Smoke on 4327: `count-setter` 5 passed, lessons `prob-correlation` and `fixed-point` 4 passed (`2a-smoke-count.log`, `2a-smoke-lessons.log`).
- **Presenting screenshot:** the recheck's grey, unreadable `+` was the Bootstrap background transition caught mid-way (the script toggles `is-presenting` just before the shot). After 800 ms the button computes `#b5bfd0` on `#2b3b57`, dashed, legible (`2a-shots/countsetter-presenting-settled.png`, probe `.command-logs/probe/2a-probe.cjs`).
- **Open, older than this slice:** in the presenting theme the *enabled* count-setter button in a tools list shows a faint glyph on the cream panel fill (`.workspace-inspector .tools .btn` against `.is-presenting .workspace-inspector .btn`). Its classes did not change here.
