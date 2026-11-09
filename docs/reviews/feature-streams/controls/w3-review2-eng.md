# Wave 3 review 2 (engineering) of 42d85cbb

No high finding.

## Findings
- MEDIUM src/graphs/compgeo/VoronoiGraph.tsx (atExample, ~L420-428 vs resetExample L436-441): resetExample clears ALL overlays (`overlays: {}`), but atExample ignores every overlay except delaunay. Toggling only the diagram (or any other) overlay leaves "Reset example" unavailable ("already shows the example") although Reset would change the scene. Expected: compare the overlays with the defaults that `overlays: {}` yields. The doc comment says "overlays are not compared" yet delaunay is. No Voronoi test covers atExample.
- LOW src/graphs/compgeo/VoronoiGraph.tsx status(): `private status(): VoronoiStatus {        const points` joined line (formatting).
- LOW src/learning/playground/collisions/CollisionPlayground.tsx pauseForEdit: uses React `playing`, which lags the worker echo; Play then an immediate edit sends no pause. Order pause, then setting is safe: useCollisionWorker.ts L116-125 posts in call order. Count/method pause verified.
- LOW src/graphs/functions/EpicycleGraph.tsx: reducedMotion() is read live in play() and at render (playBlock); a setting change while Play runs does not stop it, and the button reason updates only on the next render.
- LOW (vacuous) EpicycleGraph.host.test.tsx: test title "Pause stays available while a run plays" asserts nothing about Pause; second half of the first test never asserts `playing` true after the second click, so it passes even if Play did not start.
- LOW EpicycleGraph/Euler/V1 tests: no failure recorded against pre-change code (P2a, V1); ResetExampleButton and ChoiceSelect tests are new components, so non-vacuous by construction.

## Cleared
- P2b: compgeo hosts return void so `outcome ?? (next >= last ...)` equals the old expression; functions: runLength = index + (canAdvance ? 2 : 1) makes next = index+1 and uses transition's outcome; at end atEnd refuses both Next and Play; same step reached.
- Removed maxIterations: Bisection/RootFinding/FixedPoint end by `termination` (iteration-limit at 60 in the history), Sequence (40 terms), Series (50), CLT (n<N_MAX) via model-bounded canAdvance. Run cannot exceed old cap; 100000 limit is unreachable.
- De Boor: resetTrace/play/restoreTo(level), settle(edit,false) keeps level; Subdivision pause() on each edit site (L231-319), restoreTo in reset/setRule/import; unmount/mount via playback.
- B-spline atOrigin (exact float compare of copied data) and Linear map identity condition are consistent with their resets; ChoiceSelect aria-disabled only when `reason` given, existing callers unchanged.

## Not verified
Tests not run; no browser.
