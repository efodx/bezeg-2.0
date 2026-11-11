# Open items: Hermite consumerRefusal, FivePoint lastUnique (worker note)

A. Hermite `consumerRefusal` was redundant: `hermitePresetCollection.check` (hermitePresetCollection.ts:25, `checkFields`)
ends in `hermiteRejection(data)`, and `checkPersistedPreset` runs the collection check before `consumerRefusal`. Override
removed from HermiteGraph.tsx (`importPresetData` keeps its own check for direct callers).
Test: HermiteGraphReal.test.tsx "a Preset breaking the Hermite limits is refused by the collection check ..." (coincident
points; tangent over cap) via `importPreset`; state and owned elements unchanged. Passes with the override removed.

B. FivePoint `lastUnique` graph-level test: projectivePersistence.host.test.tsx "lastUnique keeps the previous unique conic
through a degenerate move ...". parabola (unique) -> three collinear (0,0),(60,60),(30,30)/15 on y=x -> four collinear
(add (45,45)/15; four collinear points leave a family of conics): lastUnique stays the parabola points. importPreset of the
`four-collinear` example and `loadExample('four-collinear')` give `lastUnique` undefined (`nextLastUnique(undefined, ...)`).
Fixtures asserted `status !== 'unique'` in the test. Model-level tests already existed (fivePointModel.test.ts:297).
Mutation: nextLastUnique returning the current points always made the new test fail; restored (git diff clean).

Checks: focused unit pass (.command-logs/oi-a.log). `just check-changed` fails in typecheck only on the concurrent
`figurePresetGraphState` signature work (StoredGraphState errors in other graphs); not mine (.command-logs/oi-cc.log).
Not run: unit tests after typecheck, because check-changed stopped there.
