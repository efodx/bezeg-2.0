# Owed batch 1 (task 08)

1. ReadoutsBody duplicate title: nothing to remove. `src/workspace/cards/ReadoutsBody.tsx:171` renders a group title only when there is more than one group (commit 77a95b44f); `cardBodies.test.tsx:109-123` covers it. No change.
2. `sharedControls.graphs.test.tsx:31-33`: the fixed 200 ms wait is now `waitUntil` on the Uredi tab being pressed and `#inspector-edit` present. 3 runs passed.
3. geometric-series animation-write fix (`GeometricSeriesGraph.tsx:193`): test added in `GeometricSeriesGraph.host.test.tsx` ("a lesson morph of q ... does not refit the view"), plus a `morphQ` helper. With the guard removed it failed with UntaggedWriteError ("view changed by an animation that does not lease it"); restored, 17/17 pass.
4. Recipes: extrapolation puck is named "Ekstrapolacija t" (name plus symbol). Repointed `demonstration-preview-recipes.cjs:21` and `demonstration-preview-curve-motion.cjs:238`. Left alone: prob-clt "Število kopij n" (already a count puck); prob-correlation "Točka 4, y" (PointListInput in Orodja, not a puck); repeated-subdivision button, rational-extrapolation, rational-subdivision (unconverted). Not run against a browser.
Checks: node --check OK; `_rows.test.cjs` 19 pass / 3 fail (stored evidence, assertRowEvidence, R1; not compared with before); `just typecheck` pass; `just lint` on changed files pass.
