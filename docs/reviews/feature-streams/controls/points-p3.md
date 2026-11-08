# Controls task 2, slice P3: evidence (Interpolation pilot)

Worker result for `points-p3-brief.md`. Not committed.

## Files
- `src/graphs/curves/interpolation/InterpolationGraph.tsx`: count control is `PointCollection` (remove-last, same label); `addPoint(at?)` uses `placeNewPoint` and returns the model refusal; add and typed edit use `refitFor` (`refitWhenOutside`); `movePoint` clamps via `constrainPoint`; lesson `add-point` takes `x`, `y`.
- `src/graphs/curves/hermite/HermiteGraph.tsx`: `addPoint(at?)` with `placeNewPoint`, coincident check before the tangent, `refitWhenOutside` framing the new point and its tangent tip; `editPoint` uses the same refit; count control swapped to `PointCollection` (one-line swap, no other panel touched); lesson `add-point` takes `x`, `y`.
- `src/graphs/functions/CorrelationGraph.tsx`: `addPoint(at?)` (default point, then `moveCorrelationPoint` snaps and range-checks, one commit); lesson action takes `x`, `y`; keeps its own view rule.
- `src/learning/model.ts`: optional `x`, `y` on the three `add-point` actions (+ docs). No other validator exists: shapes are checked in each graph's action handler (non-finite, lone x or y: thrown error; model refusal: `DomainError`).
- Tests: `src/graphs/curves/interpolation/SharedPointDecisions.test.tsx` (new), `src/learning/content/interpolationLessonViews.test.ts` (new), `src/graphs/base/sharedControls.graphs.test.tsx`, `src/graphs/functions/CorrelationGraph.host.test.tsx`.

## Lesson views (nominal boxes `[left, top, right, bottom]`, part 3b)
- `interp-fifth-point-added`: before `[-1.8, 4.8, 5.8, -1.8]`; after the change unchanged (was `[-2.25, 5.25, 7.25, -2.25]`).
- `hermite-locality-six`: before `[-1.95, 5.45, 6.95, -4.95]`; add 1 unchanged; add 2 refits because the tip (7, 0) is past 6.95 (was a refit at both adds, final `[-2.1, 5.6, 9.1, -3.6]`).
- The jsdom canvas aspect widens the fitted box (Hermite default scene fit gave x -4.175..9.175, which already contains the tip), so the test sets the nominal box after the default-scene action (keepaspect off) and asserts unchanged / changed.

## Shared behaviour
- `interp-lagrange` and `interp-hermite` run `pointCollectionBehaviour` (remove-last, no typed entry); Interpolation runs `pointListBehaviour` (no removal, no count bound). All passed; the 2 skips are the helper's stated skips (no count bound, no typed entry). No knownGap.

## Results (observed)
- Passed (observed): `just unit` on curves/interpolation + curves/hermite; src/graphs/base + CorrelationGraph; the new decision, lesson-view and shared-graph tests. `just typecheck` after the first batch of edits: only errors under `src/graphs/compgeo` (other worker). Not observed to finish after the last edits: `just unit src/learning`, `src/inputs`, final `just typecheck`, `just lint` (machine overloaded, runs still queued).
- Mutations (each failed as expected, then reverted): Interpolation add refits unconditionally: both lesson-view tests and the decision-6 Interpolation add test failed; drag clamp bounds changed to 500: decision-3 test failed; Hermite framing only the point (not the tip): `hermite-locality-six` and the tip test failed. (A first version of the tip test used `not.toEqual` and passed spuriously on float noise, 6.950000000000001; it now asserts right edge > 7.)

## Decisions
- Hermite coincident check runs before the Catmull-Rom tangent, since the kernel throws a RangeError for coincident neighbours.
- A lesson add at the point maximum stays a silent no-op (as documented); a coordinate-given add the model refuses throws `DomainError`.

## Not verified
- No browser smoke of the real panel (PointCollection in the live Interpolation and Hermite inspectors); no visual check. Second graph for the typed-entry cases of `pointCollectionBehaviour`: none yet (P4 PointSet).
