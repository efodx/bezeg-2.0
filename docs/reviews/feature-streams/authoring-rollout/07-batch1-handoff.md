# Task 07 batch 1 handoff (partial, budget signal)

State: Phase A and Phase B code complete and green; checks and evidence tidy-up not finished.

## Done
- `src/graphs/curves/bspline/standaloneSceneLifecycle.test.tsx`: SUBJECTS now Blossom, NURBS, DeBoor, Insertion, Extraction. New describes: same-shape different knots (3 curve graphs); same-tick sequences with rollback via fixture actions (all four); Insertion/Extraction graph-action ticks; DeBoor playback frame cannot reach a replaced scene; a Basis lifecycle suite (entries, figure releases, same-shape keep, ordinary commit, remount, construction failure, inert marker drag); inert point drag after a figure return (3 curve graphs).
- Migration of BSplineBasisGraph, DeBoorGraph, BSplineInsertionGraph, BSplineExtractionGraph to `sceneDeclaration()` with `constructOrSweep`, empty `initialize()` (Basis keeps `fit()`), private `scene` getter over `ownedScene`. Deleted: ensureScene, removeScene, syncReplacedScene, disposeFigureScene, the unmount removeScene, the fits-or-sync block in onStateChange, and the ensureScene calls in importPresetData. DeBoor keeps mount/unmount playback and liveReadout.cancel. A `disposed` guard was added to the drag handlers in the four scene files.
- `just unit src/graphs/curves/bspline`: passed (11 files). `npx tsc --noEmit`: only errors are in unrelated `projective/projectivePersistence.host.test.tsx`.

## Pre-change failures observed (unmigrated code, 24 of 99 tests in the lifecycle file)
- Basis: figure entry-and-return releases 4 scenes (not 2); same-shape import rebuilds; remount releases 2 (not 1); old marker drag calls `dragKnot` (defect).
- DeBoor, Insertion, Extraction: same-shape import rebuilds; figure entry-and-return releases 4 (not 2); remount releases 2; old point drag throws RangeError (defect); figure return with different knots (DeBoor, Insertion, Extraction); Preset import with different knots (Insertion, Extraction, after the probe fix the failure was the drawn-knots check); Insertion/Extraction "same sequence without rollback" failed before the probe-fraction fix only (test bug, fixed).
- The two "graph actions in one tick" tests: first version asserted board state mid-tick after an ordinary commit (invalid by design; host draws after the tick), then rewritten. The rewritten versions were not run against unmigrated code.
- Already passing pre-change: Basis reset/import/checkpoint/figure entries and construction failure; DeBoor playback test; same-shape ordinary commit keeps scene; checkpoint restore with different knots; construction failure for the three curve graphs; fixture sequences with rollback.

The exact 24-name list was saved at `/tmp/phaseA.fails.keep` (machine-local, may be gone).

## Not done
- `just lint`, teardown sweep (`BEZEG_GRAPH_TEARDOWN=all`, `just unit src/graphs/base/graphTeardownContract.test.tsx`), `just build`.
- Pre-change run of the two rewritten action tests (migrated copies backed up in `/tmp/mig`; working tree holds the migrated files).
- `07-batch1-evidence.md` (this note replaces it).
