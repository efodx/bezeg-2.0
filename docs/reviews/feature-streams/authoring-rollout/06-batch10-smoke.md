# Batch 10 smoke: patches family registration

Production build from `f73a13eb` (clean; `f73a13eb` is HEAD and is the local patches-family registration commit named in the brief). Command: `just build` (log `.command-logs/batch10-build.log`, provenance log `.command-logs/2026-11-12T12-46-51-152Z-23528-1bda9568.log`). The build passed (`exit=0`, `build: passed in 12.0s; revision f73a13eb115bc6dd58ff8b8b1699524be77ace5b; clean`); its warnings are the existing ones recorded in the provenance log.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch10-grep.txt`:

`(^| )(patch-tensor|patch-decasteljau|patch-derivatives|patch-subdivision|patch-joins|patch-triangular|patch-coons)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Wrapper log: `.command-logs/batch10-smoke.log`. The run waited about 397 s for test slot 2/2 (both slots were busy with other checkouts' `check-changed` runs), then `smoke-built: passed in 439.2s (test slot 2/2, 5 workers); revision f73a13eb115bc6dd58ff8b8b1699524be77ace5b; clean; reusing build from revision f73a13eb115bc6dd58ff8b8b1699524be77ace5b (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T12-47-09-058Z-22908-4857f0ef.log` (`24 passed (40.7s)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331 (Playwright owns its server).

Result: 24 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (24 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (7): `patch-tensor`, `patch-decasteljau`, `patch-derivatives`, `patch-subdivision`, `patch-joins`, `patch-triangular`, `patch-coons` each "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`). All pass. These are the surface-view branch (`view: 'surface'`) of that row, which waits for `data-surface-framing` and the surface evidence producer.
- Lesson walks (14): for each of the seven IDs, the `Lesson <id>` describe (`guided-lessons.smoke.spec.cjs:2642` for the Slovenian `?learn=1` walk with pointer clicks on Next to completion, and `:2653` for the English 390x844 walk: points in view, math inside viewport, Next pointer-clickable). All pass. The `patchRow` and `coonsPatch` setups also assert surface mesh owners and generated surface expectations per step, so these walks do exercise the surface view, not only the text.

Surface and patches rows in the harness (search of `tests/*.cjs` for `patch-`, `patches` and `surface`):
- `guided-lessons.smoke.spec.cjs:1823-1833` defines `patchRow` lesson rows for `patch-tensor`, `patch-bilinear-patch`, `patch-control-net`, `patch-boundary-iso-curves`, `patch-decasteljau`, `patch-properties`, `patch-derivatives`, `patch-subdivision`, `patch-joins`, `patch-triangular` and `patch-square-vs-triangular`. The `patch-bilinear-patch`, `patch-control-net`, `patch-boundary-iso-curves`, `patch-properties` and `patch-square-vs-triangular` rows are lesson section IDs, not Demonstration IDs, and the anchored grep does not select them. Only the rows whose ID is one of the seven were selected.
- `guided-lessons.smoke.spec.cjs:2298` `coonsPatch` (`patch-coons`), selected through its `Lesson patch-coons` describe.
- `demonstrations.smoke.spec.cjs:22-29` surface branch and `NO_POINT_SURFACE_IDS` (only `solids` listed). Covered by the seven demonstration rows.
- `unified-learning.smoke.spec.cjs` (bezier-patches chapter, authored preview `src` matching `bezier-patches.curve-to-patch.patch-tensor`): not selected; its titles do not contain the IDs.

Unrelated rows: none selected. The anchored regex matched only the seven patch IDs and the three catalog rows.

Not covered:
- Lesson exit for any of the seven IDs (no exit rows are generated for them).
- Preset import/export and save/reopen for the patch collections (`patchesCollectionKeys` in `src/graphs/patches/registration.ts`). No harness row covers them; no Preset row was added.
- Console and page errors on the demonstration rows: the demonstration test does not capture them, so those rows establish render only.
- Drag, slider and surface-view camera interaction on the seven routes; only route load, render, and lesson walks ran.
- The `patch-bilinear-patch`, `patch-control-net`, `patch-boundary-iso-curves`, `patch-properties` and `patch-square-vs-triangular` lesson rows, the `unified-learning` bezier-patches chapter rows, and the other families' catalog order relative to the patches rows.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- The lesson readout values and surface mesh samples beyond what the harness probes check were not independently verified here; a passing walk means the harness probes passed, not that the mathematics was re-derived.
- No diff-level comparison against pre-registration behaviour was made.
- Cleanup: the smoke run is a harness-owned preview; no data was created or changed by this worker. Playwright and the preview were started and disposed by `smoke-built`; no process started by this worker remains.
