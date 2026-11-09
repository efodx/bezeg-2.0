# Wave 3 slice P2b brief: one trace playback policy

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `p2b`. Decision 61 (search `^61\.`) and 57; the policy's contract is in `docs/tasks/mathematical-runtime-contracts/03-shared-trace-playback.md` and its evidence file beside it (read the behavior matrix by section).

## Rows (from `w3-triage.md`)

C24-01 (IterativeFunctionGraph and its subclasses), C24-02 (De Boor), C24-03 (SubdivisionCurve), C24-04 (the compgeo graphs' imports only).

## Owned paths

`src/graphs/compgeo/tracePlayback.ts` → `src/graphs/base/tracePlayback.ts` (and its tests, moved with `git mv`), the import lines in every file that imports it (compgeo graphs and tests), `src/graphs/functions/IterativeFunctionGraph.tsx` and its subclasses' wiring where needed, `src/graphs/curves/bspline/DeBoorGraph.tsx`, `src/graphs/curves/subdivisionCurves/SubdivisionCurveGraph.tsx`, tests beside them. No localization change expected. In the compgeo files edit only the import line.

Two other workers run at the same time: P2a (Euler, Epicycle, collision) and V1 (`VoronoiControls.tsx`, B-spline Extraction/Insertion/Nurbs, Linear map, ComplexRoots, Pascal, `ChoiceSelect`, `PointCollection`). Do not touch their files; `VoronoiGraph.tsx` import line is yours.

## Work

1. Move the policy (decision 61). Keep its behaviour and tests unchanged.
2. Before changing a graph, write a short behaviour matrix in your evidence file for IterativeFunctionGraph (and each subclass that overrides playback), De Boor and SubdivisionCurve: Next, Play, end, Reset, edit while playing (pause? step kept or 0?), export busy, Preset restore, lesson actions, unmount. Then implement each graph's `TracePlaybackHost` with the index where it lives today (model), and delete the hand-copied guards.
3. Keep every row of that matrix unchanged unless decision 57 requires it (an accepted edit pauses). Where the policy's "a new model returns to step 0" conflicts with a graph's current edit behaviour (De Boor keeps the revealed level), keep the graph's behaviour through its host; if the policy cannot express it without changing `tracePlayback.ts` semantics for compgeo, stop and report with the smallest proposal.
4. CLT: the triage did not verify whether `CltGraph` derives from `IterativeFunctionGraph`; check and include it if it does.

## Checks

Common checks plus: all moved policy tests, the compgeo trace host tests (`just unit src/graphs/compgeo`), the function iteration graphs' tests and their lesson tests, De Boor and SubdivisionCurve tests and the curve lesson tests that drive them, and a Preset/checkpoint restore test for one function graph and De Boor. Mutation: for each removed guard, show a test that fails if the policy's equivalent guard is bypassed for that graph (export busy, at end).
