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

## Gaps

- Two unrelated contract failures above remain.
- Not smoke-tested or built; SL/EN titles and prompts not browser-checked.
- A fixture cannot express non-clamped or non-uniform knots; L1/L2 may need a knot field on `LessonCurveFixture`.
- Both Demonstrations share one saved-Preset list: a basis Preset (placeholder points) appears in the de Boor list.
