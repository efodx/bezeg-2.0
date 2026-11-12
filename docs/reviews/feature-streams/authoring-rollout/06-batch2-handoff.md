# Task 06 batches 2, 6, 7 handoff (partial, budget signal)

Implementation is complete; verification is not. See `06-batch2-evidence.md` for changes and owner derivation.

## Observed
- Pre: 3 composition files failed to resolve; with family files but unedited roots, 40 failed / 28 passed.
- Post run (12 paths, /tmp/b2post.log): 83 files passed, 6 failed (2367 passed / 6 failed tests). Failures were test bugs, both now fixed but NOT re-run:
  1. five `registrationLoading` "legacy route" cases used `/bezeg-2.0/bezier`; the real path is `/bezeg-2.0/bezier/curve` (sed-fixed in all five files).
  2. basics composition owner test used `getGuidedLessonOwner('bernstein')`, which canonicalizes to the retained home `foundations#reading-bernstein`; changed to `getGuidedLessonOwners(id)[0]` (the primary).
- `just lint` on changed paths: passed. `npx tsc --noEmit`: only error is the other worker's `src/graphs/curves/pointCountSceneLifecycle.test.tsx(143,105)`.

## Remaining
1. Rerun `just unit src/graphs/basics src/graphs/bernstein src/graphs/complex src/graphs/curves/ph src/graphs/curves/parametrisations src/graphs/curves/curvePresetCollections.test.ts src/graphs/functions/functionPresetCollections.test.ts src/graphs/registrationIntegrity.test.ts src/learning/chapter src/graphs/base/presets src/graphs/curves/bspline src/graphs/projective`; expect green.
2. `just lint` on the edited test files again, `npx tsc --noEmit --pretty false`, `just build`.
3. `node --test scripts/probe-demonstration-clip-routes.test.cjs scripts/capture-guided-example-previews.test.cjs` (rowSource edited, not run).
4. Append post results to `06-batch2-evidence.md` (its Tests section says "Post: see below"); update docs/tasks status if the handler wants.
5. Browser smoke not done.
