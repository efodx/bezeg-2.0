# BS-A-2b: registration of the B-spline basis and de Boor Demonstrations

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [ADR 0024](../../adr/0024-bspline-representation-and-presets.md). Date 2026-11-02.

## What changed

- `bspline-basis` (`/bezeg-2.0/bspline/basis`) and `bspline-deboor` (`/bezeg-2.0/bspline/deboor`) in the new family `/bezeg-2.0/bspline`, both `lesson: false` until L1/L2 (F3). Files: `demonstrations.ts`, `graphFactories.ts`, `sl.ts`/`en.ts` (`b_splines`, `bspline_basis_title`, `bspline_deboor_title`, `prompt_bspline_basis`, `prompt_bspline_deboor`).
- `bsplinePresetCollection` (key `bspline-curve`) is listed once in `PresetImport.ts`; both graphs return it, so both share the browser-local list `preset-bspline-curve` and one export/import contract. The importer routes by key only, so no routing change was needed. `PresetCatalog.test.tsx` forbade a shared collection; it now allows exactly these two ids.
- `'deboor'` joined `LESSON_ANIMATION_IDS` (`learning/model.ts`).
- `BSplineBasisGraph` and `DeBoorGraph` override `lessonFixtureData`: fixture points and `degree` give the clamped uniform knot vector for that count (the fixture has no knot field); the collection check still rejects invalid data. `DeBoorGraph.test.tsx` now drives the real path; a matching basis test was added.
- Posters pending (`demonstrationPosterPending.ts`, `DemonstrationsPage.test.tsx`), preview recipes in `scripts/demonstration-preview-recipes.cjs` (no capture). Added the graphs to the scene-replacement figure families; the transient-state contract covers every factory.
- No existing route or stored Preset changed.

## Checks

`just typecheck` and `just lint` pass. The full unit run (`src/graphs`, `src/learning/runtime`, demonstration tests, localization) found B-spline failures that were fixed: the collection lacked `checkGraphState` (a stored `graphState` holds the `knots` and `points` arrays), `perturbModel` did not edit B-spline data, the basis scene's slider segment left two implicit points on the board, and `resetDisplay` forced aspect on a free-axes plot. After the fixes the affected files pass (466 s focused re-run, transient contract for both ids). Mutation: dropping `bsplinePresetCollection` from `PresetImport.ts` failed 4 `PresetCatalog` tests; reverted.
Not caused by this slice and not fixed: `GraphTransientState.part1` patch-coons (camera distance after the lesson default scene) and `part4` inscribed-angle (rollback `t`) failed in the full run.

### Handler 19 verification (c2b479a1 plus the follow-up commit)

- Full scope unit run (`src/graphs src/learning src/demonstrations.test.ts src/DemonstrationsPage.test.tsx src/demonstrationPreviewAssets.test.ts src/localization`): 5928 passed, 2 failed. `LearningPage` "every family chapter" failed because the new family had no chapter. Fixed by adding `/bezeg-2.0/bspline` to `FAMILY_CHAPTER_PENDING`, which BS-A-3…6 removes. The other failure is `part4` inscribed-angle rollback, which has failed on master since `c8b27a2a`. The patch-coons `part1` failure was fixed on master by `f66e274b`.
- `just typecheck`, `just lint`, `just check-localization` (typecheck and production build) pass.
- Engineering review (Sonnet): no high or medium findings. It found the contract-test edits narrow and non-vacuous: `resetDisplay` keeps aspect for every graph whose `equalAxisUnits` is not `false`, and only four free-axis graphs override that. It reported three lows, all deferred: `DemonstrationsPage.test.tsx` duplicates the poster-pending ids instead of reading `POSTER_PENDING`; `checkGraphState` reports only `invalid_value` for knots and points, while `check()` validates `data`; and `perturbModel` assumes `knots[degree+2]` exists.
- Browser smoke (Sonnet `bezeg-smoke`, production preview of c2b479a1, Chromium 1440×900): both routes render with no console errors. The SL catalog lists the family "B-zlepki" and its two entries. A knot edit changes the basis curves. Dragging a ringed control point changes the de Boor curve, and "Naslednja raven" moves the level from 0 to 1 of 2. A live SL→EN switch translates the breadcrumb, panel, knot labels and level status. The Bézier baseline loads. The preset switch was not exercised, because only the default Preset exists (as designed). The family path `/bezeg-2.0/bspline` is not a route, as for other families. Knots were edited through the field, not by a pixel drag on the t axis.

## Gaps

- The inscribed-angle contract failure remains (not ours).
- A fixture cannot express non-clamped or non-uniform knots; L1/L2 may need a knot field on `LessonCurveFixture`.
- Both Demonstrations share one saved-Preset list: a basis Preset (placeholder points) appears in the de Boor list.
