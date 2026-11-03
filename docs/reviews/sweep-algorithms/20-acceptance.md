# Sweep task 20 acceptance: monotone triangulation lesson C4

Accepted 2026-11-03 by geometry handler 37. Task: [20](../../tasks/sweep-algorithms/20-monotone-triangulation-lesson.md). Brief: [20-brief.md](20-brief.md). The worker stopped at its 135k budget with commit `058f474c` (handoff note in its worktree); the handler finished the checks and committed it as `17987a57`, rebased onto `5672afd3` as `ae56ab51`. Master's quadrature lesson N4 and binomial-normal lesson P2 moved the same counts: git kept one of the two identical preview-count bumps, so the handler set them to 91 lessons and 98 copy entries (the lesson opt-out list is now empty) and merged the opt-out and notation lists by keeping both sides.

## Review (handler, main chat)

- **Design:** the lesson runs on the whole C3 polygon (trace steps 0–43), so the vertex names \(v_1\)–\(v_6\) match C3 and the partition diagonal \(v_2\)–\(v_5\) is present from the start; step 1 shows piece 1 \((0,0),(4,3),(8,5),(4,8)\) with its chains at trace step 15. Accepted: it meets item 1 and keeps the two lessons consistent.
- **Mathematics:** the host test (`MonotoneTriangulationLessonActions.host.test.tsx`, 9 tests) reads every quoted value from the graph at its step: piece 1 has 2 triangles (\(n-2\), \(n=4\)); at step 43, 4 triangles (\(n-2\), \(n=6\)) and diagonals \(v_2\)–\(v_5\), \(v_2\)–\(v_6\), \(v_3\)–\(v_5\); counts 11 (monotone) against 21 (ear clipping), equal to `partitionAndTriangulate(...).counts`.
- **Counts decision:** the comparison step also states that on piece 1 alone the order reverses (7 against 3) and that the advantage shows only for large \(n\), with the "illustrates, does not prove" caveat. That follows the task's decision; the worker tested both counts against the kernel.
- **Text:** \(O(n^2)\) for ear clipping, \(O(n)\) per monotone piece after sorting, \(O(n\log n)\) for the whole method. The ear-clipping kernel in the app is worse than textbook (see 17-acceptance); the text keeps the textbook statement, as task 17 decided.
- **Mutation evidence (worker):** a moved trace step and a swapped count each failed host tests; files restored byte-identically.

## Handler checks (revision `17987a57`; after the rebases, `5869b47c`)

- `just unit src/learning src/graphs/compgeo src/localization src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/graphs/base/presets/PresetCatalog.test.tsx`: 151 files, 2525 tests passed, 3 skipped ([log](20-h-unit.log)).
- `npx tsc --noEmit --pretty false` and `npx eslint` on the touched files (including the smoke spec): clean. `just build`: passed.
- `just smoke-lesson monotone-triangulation`: passed in SL and EN (2 of 2) on `a220e75b` and again on `5869b47c` ([log](20-smoke.log)).
- After the rebase: `just unit src/learning/content src/learning/runtime src/demonstrations.test.ts src/Routes.test.tsx`: 78 files, 1374 tests passed; tsc clean; `just build` passed.
