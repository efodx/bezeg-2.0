# Controls task 2, slice P4 and P4b: PointSet pilot evidence

Branch worktree-stream-controls, uncommitted. Briefs: [P4](points-p4-brief.md), [P4b](points-p4b-brief.md); handoff: [worker-p4-handoff.md](worker-p4-handoff.md).

## P4 (previous worker, see the handoff for the full list)
- `src/graphs/compgeo/PointSetControls.tsx`: `PointCollection` + `PointListInput` + `NumberInput` + `BooleanField` replace the raw inputs; removed from `controlExemptions` (`eslint.config.mjs`).
- `src/graphs/compgeo/PointSetGraph.tsx`: keys via `pointKeyCommand` (step 1, Shift 10, Escape, Delete), drag clamp by `constrainPoint`, add via `placeNewPoint`, refit after an accepted add or typed edit (`refitFor`, ~line 219).
- New tests: `PointSet.sharedControls.test.tsx`, `src/compgeo/pointSetModel.clamp.test.ts`.
- Mutations observed to fail (P4): no drag clamp, raw nudge, refit disabled, default add at origin; each failed exactly decisions 1, 3, 6, 7.

## P4b
1. Three failures of the handler's run:
   - Fortune "C-5 Add at twelve sites ...": a real code bug. The pressed reason in `PointCollection` was stored as translated text and stayed Slovenian after `setLanguage('en')`. Fixed in code (item 2); the test's assertion is unchanged.
   - Voronoi "a live language switch ...": assertion encoded the old DOM (`overlaySwitch().closest('label')`; the `BooleanField` input is not inside its label). Now reads `label[for=<input id>]`. Intent (label text switches to "Duality") unchanged.
   - DegenerateSites "arrow keys move ...": the arrows pass; the failing line used `input[aria-label="P3, y"]` and the shared `NumberInput` names its field with a `<label>`, not `aria-label`. Now `screen.getByLabelText('P3, y')`. Same field, same entries.
   - Lint: unused `t` import removed, `BezierHullsGraph.host.test.tsx:12`.
2. Pressed reason language: `src/inputs/PointCollection.tsx` keeps the reason as a function (`pressed.reason`, line 71) and calls it while rendering (line 145); each button hands over `stored(...ReasonOf)`. Test: `src/inputs/PointListInput.props.test.tsx`, "a pressed reason is shown again in the new language after a switch". Failing first, observed: with the reason frozen to its text at press time (the old behaviour) the test failed; restored, it passes.
3. One fit path: `BaseGraph.fitToVisiblePoints(extra = [])` (`src/graphs/base/BaseGraph.tsx:755`) holds the point gathering, `fitView`, `setBoundingBox` and `applyZoom`; `navigateBoard('fit')` calls it (line 772) and `PointSetGraph.refitFor` is `refitWhenOutside(box, [point], () => this.fitToVisiblePoints([point]))` (line 223). Host Fit behaviour is the same code path with empty `extra`.

## Results (observed)
- `just unit src/graphs/compgeo src/compgeo src/inputs src/graphs/base`: passed (687 s), log `.command-logs/2026-11-08T09-54-56-600Z-39288-0cedb9f6.log`.
- `just lint` on those paths plus `eslint.config.mjs`: passed. `just typecheck`: passed. `just build`: passed (with warnings in the log; not read).

## Known gaps
- Segments and intervals modes keep their own add buttons and count lines (not `PointCollection`); to be handled in the compgeo sweep.
- Not smoke-tested in a browser.
- `PointCollection` reason functions close over the render that pressed them; a count change drops the reason, other prop changes (min or max alone) would not refresh it.
