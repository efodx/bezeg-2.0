# Task 13 — Patch basics registry worker handoff

Implemented the first four prepared Bézier patch guided examples as a section-owned registry, separate from `retainedExampleHomes`; the audited 56 retained media-home inventory stays unchanged. Cards are added to each of the four section reading sequences, with the existing text, formulas and figures preserved.

Exact canonical keys are `bezier-patches.<section>.patch-tensor`, with canonical lesson identities `lesson.bezier-patches.<section>.patch-tensor`. Exact section lookups work for canonical `example=`, `learn=1` ownership, and legacy `explore=`. Lookup rejects unknown/prototype keys and a mismatched demonstration. Owner/title/return helpers now recognize patch chapter sections. No scene, graph, asset, capture, or preview manifest changes were made by this slice.

Observed-red: the new guided route/card regression failed before production changes because the first section had no card (`undefined to be defined`). After implementation, focused unit tests pass:

`just unit src/learning/chapter/guidedExamples.test.ts src/learning/chapter/guidedLessonOwnership.test.ts src/learning/chapter/authoredChapterCoverage.test.ts src/learning/content/patchChapter.test.ts`

Lint passed for the changed implementation and test files. `git diff --check` passed. `just typecheck` remains blocked by errors in concurrently changed worker files: `src/learning/content/patchGuidedExamplesBasics.test.tsx` accesses `.patch` on the broad prepared-scene union (lines 133, 138, 142), and `src/learning/content/patchGuidedExamplesEvaluation.test.tsx` calls missing `TensorPatchGraph.setDecasteljauOrder` (line 58). These are outside this registry slice; no type errors were reported in the registry/routing files.

Remaining acceptance belongs to task13/handler: media previews and captures, preview inventory linkage, browser smoke, integrated checks, reviews and commit. The route/card integration itself is covered by the focused tests above.
