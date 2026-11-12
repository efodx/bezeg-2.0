# Batch 4 smoke: rational family and `farin`/`circle` registration

Production build from `1d1759e6` (clean). Command: `just build` (log `.command-logs/batch4-build.log`, provenance log `.command-logs/2026-11-12T10-34-53-276Z-29552-9b2bb824.log`), then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch4-grep.txt`:

`(^| )(rational|rational-decasteljau|rational-elevation|rational-extrapolation|rational-subdivision|farin|circle)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance|Rational elevation (extras|outside lessons)|Farin points on the elevation route`

Wrapper log: `.command-logs/batch4-smoke.log`. Playwright run log: `.command-logs/2026-11-12T10-35-25-995Z-30472-af439a63.log`. The build was reused from the same clean revision. The preview was the harness-owned production preview on `http://127.0.0.1:4331/bezeg-2.0`.

Result: 34 passed, 0 failed, 0 skipped, 0 flaky. No page or console errors were reported by the run.

Selected rows:
- Demonstrations (7): `rational`, `rational-decasteljau`, `rational-elevation`, `rational-extrapolation`, `rational-subdivision`, `farin`, `circle` each render heading, graph and inspector. All pass.
- Lesson walks (14): Slovenian `?learn=1` walk and English 390x844 walk for `rational`, `rational-decasteljau`, `rational-elevation`, `rational-subdivision`, `rational-extrapolation`, `farin`, `circle`. All pass.
- Lesson exit test (1): `farin`, English exit and re-entry. Passes.
- Shared lesson runtime on `farin` (3): header language switch, Tab+Enter on Next, lossless Back walk. All pass.
- Rational elevation extras and outside lessons (3): "?learn=1 completes with 5 then 6 points...", "Dvigni stopnjo with weight labels...", "Farin points on the elevation route (seeded stored preset)...". All pass.
- Catalog (3): "the catalogue shows every demonstration in teaching order...", "catalog filters combine topic and forgiving search...", "generated preview mapping and provenance...". All pass.

Unrelated rows also selected (4, all pass):
- `curve-ownership.smoke.spec.cjs`: "batch restore preserves live Farin weights, rational curve, and standard-form mode" (matched by `rational`).
- `curve-ownership.smoke.spec.cjs`: "Farin sliders follow dragged control points without changing their ratios". Its title contains no listed ID and the cause of the match was not determined.
- `rendered-appearance.smoke.spec.cjs`: "hover and rational weight selection change the marker outline and restore" (matched by `rational`).
- The `Shared lesson runtime` and `Lesson farin exit` rows are part of the `farin` coverage above, not unrelated.

Circle-specific check: `circle` has a row in the demonstration and lesson tests above. No Preset check exists for `circle` in the harness (no `circle` reference in the preset or workspace specs), so the Preset UI absence/disabled state was not exercised.

Not covered:
- Preset UI on `circle` (absent or disabled): the harness has no check; not exercised in the browser.
- Drag or slider on these routes (rational weights, Farin sliders, circle board); only route load and lesson walks ran.
- Preset save/reopen for the rational family and `farin`.
- Demonstration-load tests do not capture console errors, so the demonstration rows establish render only; lesson walks fail on runtime errors.
- Rendered catalog card order for these seven entries was not asserted separately; the teaching-order test covers the full catalogue.
- Keyboard-only and touch-only navigation beyond the 390 px lesson walks; the full baseline checklist (not required, since only registration moved).
- Routes, loaders and lesson owners were checked only through the tests above; no diff-level comparison against pre-registration behaviour was made.
