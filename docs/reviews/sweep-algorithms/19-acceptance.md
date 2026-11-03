# Sweep task 19 acceptance: monotone partition lesson C3

Accepted 2026-11-03 by geometry handler 37. Task: [19](../../tasks/sweep-algorithms/19-monotone-partition-lesson.md). Brief: [19-brief.md](19-brief.md). Worker commit `b26851fc` and handler count fix `615bfb83` were cherry-picked onto `6eaaa9cc` and then rebased onto `b2720659` as `a75cada1` and `2621d92d`. The rebase conflict in `lessonCatalog.test.ts` was mechanical: master added `prob-binomial-normal` to the lesson opt-outs and this lesson removed `monotone-partition`, so both changes were kept.

## Reviews

- **Engineering (handler 36, main chat):** accept. Lesson text, scene actions and the smoke row are fine. The worker's mutation gaps are accepted: the scene-change test was not mutation-verified, and the helper at step 7 is caught only by the scenes test.
- **Mathematics (handler 36, exact arithmetic):** the quoted values match the spec. Example 1: two pieces of area 20, diagonal \((4,3)(8,5)\). Example 2: area 58 = 10 + 42 + 6, diagonals \((7,7)(3,7)\) and \((8,5)(7,7)\).
- **Interim owner:** `bezier-curves/geometric-properties`, as the S1 precedent `b7b856af`, until task 21 moves the lesson into the sweep chapter.

## The preview-test blocker was a stale Vitest cache

Handoff 36 recorded "publishes the projective-conics example cards…" failing only on the lesson branch. Handler 37 found it failing on master `6eaaa9cc` too, and on the branch base `9e3d354f`, so the lesson did not cause it. In the probe, the five-point copy resolved and a fresh `import.meta.glob` listed the PNG, but `resolveGuidedExamplePreview` still returned nothing. The cause was Vitest's filesystem transform cache (`node_modules/.vitest-cache`). It held a transform of `guidedExamplePreviews.ts` from before the K4 and K5 PNGs were added (`29730ac3`), and the cache is keyed on the module's source, so the old glob result stayed. With the cache moved aside, all 8 tests in the file passed. Two earlier records describe the same failure (`docs/reviews/illustrated-chapter-examples/acceptance.md`); the command guide now names it. The agent worktree's `node_modules` is a junction to the main checkout, so it shares that checkout's cache.

## Handler checks (revision `2f18c123`)

- `just unit src/learning src/demonstrations.test.ts src/Routes.test.tsx src/graphs/compgeo`: 146 files, 2302 tests passed, 3 skipped ([log](19-unit.log); summary in `.command-logs/2026-11-03T00-13-01-520Z-6160-127fc389.log`).
- `npx tsc --noEmit --pretty false`: clean. `just build`: passed.
- `just smoke-lesson monotone-partition`: 2 of 2 passed ([log](19-smoke.log)). The row walks all 8 steps in Slovenian and in English, with the exact titles and the trace step probed on each step. The live header language switch is shared runtime behaviour and is covered by the guided-lessons spec's shared rows, not per lesson.
- After the rebase (revision `99ee8f70`): `just unit src/learning src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/graphs/base/presets/PresetCatalog.test.tsx src/graphs/compgeo/MonotonePartition`: 104 files, 1869 tests passed. tsc clean.
- Not rechecked: eslint after the cherry-pick (the diff is unchanged from the worker branch, where eslint passed).
