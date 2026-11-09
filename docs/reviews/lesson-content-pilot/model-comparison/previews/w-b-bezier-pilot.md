# w-b bezier-pilot deviations

1. Step 2 scene (draft: polygon, no hull) → polygon only, new scene id `bezier-control-polygon-only`; matches the draft, but `lessonCatalog.test.ts` pins the old polygon+hull scene (shared test fails, see report).
2. Step 4 frame order (draft: explanation, observation, calculation) kept as drafted; owned `guidedLessons.test.ts` relaxed so `bezier-evaluation` may end on a calculation frame.
3. Draft "Uvod" → lesson `summary` (shown at step 1, frame 1). Frame titles equal the step title (runtime has one title per step).
4. Draft has no formula blocks → all `formulaIds` emptied; prerequisites, learning goals, sources, edge cases, `purpose` fields left from the old lesson (not in draft). English text is my translation of the draft.
5. Second worked example (`bezier-asymmetric-midpoint`) removed; step 5 has no calculation in the draft. `bezierExamples.test.ts` still references it and the old step prose (shared test fails).
6. Draft "Konec" screen not ported (runtime supplies its own).
