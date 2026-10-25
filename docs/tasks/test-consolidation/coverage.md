# Test consolidation coverage and evidence record

Working record for the [work queue](README.md) under the [specification](../../specs/test-consolidation.md). Consolidate under the documentation retention policy at closeout.

## Baseline

Revision `a2216c4` (clean), `just build` then `just smoke-built --port 4517 --reporter=json`, Chromium, 6 local workers (12 logical CPUs), Windows 11 developer machine.

| Run | Tests | Wall | Summed | `en: Exit` ×45 | `sl:` walk ×45 | narrow walk ×45 | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 280 passed | 665 s | 3914 s | 1245 s | 1029 s | 679 s | Overlapped one Vitest file run; repeat at a quiet checkpoint before comparing. |

Guided-lesson file summed 3204 s; `lesson-experience-checks.cjs` 122 s; `standalone-learning` 116 s. Unit baseline: `GraphTransientState.test.tsx` alone (366 cases) took 550 s while the browser run was active, with three `subdivision` timeouts (15 s test limit, 1 s `waitUntil`) that pass when rerun alone (29 s for that graph). Re-measure the full unit suite on an idle machine; load sensitivity of this file is itself a risk for consolidation that moves work into it.

## Task 1 inventory: per-row exit/re-entry hooks

Every row also runs the template's shared parts: Back/Next one frame at `exitStep` with `stepProbe`, Exit dialog focus on Continue, Escape keeps the frame, confirmed exit, and two re-entry rounds comparing board curves/points/total. Defaults: exit/re-entry step 3.

| Row | Edit before entry | During lesson | Restored after Exit | Extra stable fields | Exit/re-entry | Unusual |
| --- | --- | --- | --- | --- | --- | --- |
| bezier | polygon off | polygon on | polygon off | polygon | 3 | control polygon switch |
| decasteljau | t = 0.8 | t ≈ 0.25 | t ≈ 0.8, points | t | 5 | per-degree point counts |
| affine | polygon off | polygon on | polygon off | polygon | 3 | affine image |
| elevation | Elevate degree (+2 points) | base points | elevated points | points | 2 | elevated point count |
| rational | none (weights [1,2,1,1]) | weights [1,4,1,1] | weight labels, curves | weight labels | 3 | weight labels |
| rational-decasteljau | t = 0.8 | t ≈ 0.5 | t ≈ 0.8, curves | t | 3 | |
| ph-cubic | none | none | none | none | 3 | no user-state check; hodograph child board untested here |
| ph-quintic | none | none | none | none | 3 | as ph-cubic |
| bernstein | degree 1→2 | degree 3, stacked on | degree 2, stacked off | degree, stacked | 4 | Display-tab switch |
| rational-elevation | none (4 points) | elevation actions, ≥5 points | 4 points | points | 1 | in-lesson elevation buttons |
| weighted-parameterization | alpha 0.8, samples 7 | samples 3 | alpha, samples | samples | 3/4 | |
| uniform-parameterization | alpha 0.8, samples 7, mode uniform | samples 3 | mode, alpha, samples | samples | 3/4 | mode select |
| subdivision | Subdivide; t = 0.7 | none | t, drawn curves, points | t | 3 | drawn pieces |
| repeated-subdivision | Subdivide ×2 (4 curves) | 8 curves | 4 curves; another Subdivide gives 8 | none | 4 | follow-up interaction after restore |
| rational-subdivision | t = 0.7 | none | t, drawn curves, labels hidden | t | 3 | |
| extrapolation | slider 1.4 | none | slider, curves, points | t | 3 | |
| rational-extrapolation | slider 1.4 | weights [1,2.2,0.52,1.14] | slider, labels hidden | t | 3 | |
| decasteljau-alternative | t = 0.8 | t ≈ 0.25 | t, curves, points | t | 5 | animation graph |
| farin | Farin on; sliders 3 | switch trio | switches, sliders, labels | farin/weights/standard | 1/5 | standard form, effective weights |
| circle | pieces 3→5 | 4 pieces | 5 pieces | pieces | 3 | |
| spline-cn | degree 2→3, labels off | degree 2, labels on | degree, continuity, switches, points | continuity, degree, switches | 2/3 | |
| spline-c1 | hide fixed on, labels off | labels on, hide fixed off | switches, points | switches | 2/3 | derived points |
| spline-c2 | as spline-c1 | as spline-c1 | as spline-c1 | switches | 2/3 | derived points |
| spline-g1 | b0 = 1.5 | b0 ≈ 0.25 | b0, b1 = 1, points | b0 | 3 | |
| spline-g1-symmetric | beta0 = 0.3 | beta0 ≈ 0.75 | beta0, points | b0 | 3 | |
| spline-parameterization | alpha 0.8, samples 7 | alpha ≈ 0, samples 10 | alpha, samples, hide fixed on | alpha, samples | 3/4 | |
| linear-function | x₂ = 3 | point (2,2) | equation, x₂, total | equation | 3 | |
| exponential-function | a = 3 | a 0.5 | a, point (1,3), total | a | 3 | |
| trigonometric-functions | frequency 2 | lesson equation | equation, total | equation | 6 | |
| continuity | value 2.5 | value 1 | value, point, total | value | 3 | |
| derivative | h = −1.5 | h 0.1 | h, point Q, total | h | 3 | |
| definite-integral | n = 20 | n 4 | n, total | n | 3 | task 5 exclusion |
| area-between-curves | b = 2.5 | b 3.22 | b, point, total | b | 3 | task 5 exclusion |
| arc-length | n = 20 | n 10 | n, total | n | 3 | task 5 exclusion |
| bisection | next-step, b = 3, next-step | step 3, width | step 1, mid, playback stopped | step | 3 | playback |
| mean-value | c = 1.2, reveal | c 1.5, hidden | c, revealed | c | 3 | |
| accumulation | x = 1.2, reveal | x π, hidden | x, revealed, integral | x | 3 | task 5 exclusion (checkpoint) |
| darboux | n = 16, hide upper | n 8 | n, upper hidden, lower sum | n | 3 | task 5 exclusion |
| extrema | b = 1.5, reveal | b 1, hidden | b, revealed, max | b | 3 | |
| convexity | t = 1.8, reveal | t 0.5, hidden | t, statuses | t | 4 | |
| taylor | degree 7, reveal bound | degree 3, hidden | degree, revealed | degree | 4 | |
| sequence | next-step ×2, N = 11, reveal | terms 40, N 5 | terms, N, statuses, playback stopped | terms, N | 3 | playback |
| uniform-convergence | n = 7, ε = 0.05, reveal | n 11, ε 0.1 | n, ε, statuses | n, ε | 6 | |
| complex-multiplication | Re z = 0.5, reveal | z 1+i, w −1 | z, product, statuses | z, product | 3 | |
| fixed-point | tolerance 5, next-step ×2, reveal | step 3, tol 10⁻³ | step, tol, statuses, playback stopped | step, tol | 3 | playback; task 5 exclusion |

## Task 1 progress

- `531ebe6`: scene-change/observation helpers moved to `src/graphs/base/realGraphScenes.ts` for reuse by the session contract.
- `5dbf00c`: session-driven contract `src/learning/runtime/lessonRestorationContract.tsx`, run by `lessonRestoration.part1–4.test.tsx` (round-robin quarters of `GUIDED_LESSON_AVAILABLE_IDS`, one worker each; a single file ran out of worker memory). Per lesson: edit (`changeScene 'a'`); session 1 walks every frame, one commit per transition (observation frames: `showContent`/`explore`, then the 'b' scene actions, compounding subdivide/elevate once per walk, subdivide after the parameter), frame actions, animations, back/next at the end, last animation replayed before close; session 2 re-enters and crosses one scene boundary each way. After each close: `full()` unfiltered equals the edited scene, and resources (owned board objects, PH hodograph objects, live JSXGraph boards, running `AnimationDriver`s) equal the baseline. Then a twin graph receives the same switch flips and 'b' actions (scene and resources equal), the lesson finishes (one-tick walk, a learner change, `next` to complete) and close keeps the final scene; a separate case closes after unmount.
- Baseline choices: tick labels are excluded from object counts (JSXGraph pools them by render history; rational/extrapolation family differed only there). The resource baseline is the edited scene after a restore through its own checkpoint, because the Elevation edit path leaves four hidden segments that a restore does not rebuild; the twin check showed identical scenes and object kinds after a follow-up change, so this is no lost state. Counts were stable across rounds in every case.
- Run (idle, 4 files in parallel): 90 passed, 173 s wall, 652 s summed; slowest `circle` 45 s (about 0.7 s per transition alone), then subdivision family, `farin` and `spline-parameterization` around 30 s; per-test limit 120 s. With `LessonSession.test.ts`: 103 passed, 168 s (`just unit`). Typecheck and lint clean.
- Faults, representatives bezier, linear-function, ph-cubic, decasteljau-alternative, bisection, farin, spline-c1, repeated-subdivision: (1) `close` without `restoreState`: all 8 fail at the restored-scene comparison; (2) a hidden point created by the `demonstration-default` prepared-scene handler: 7 fail at the resource comparison, ph-cubic passes because its scenes use `lesson-fixture`; the same leak in the fixture branch fails ph-cubic and bezier; (3) `close` without `stopAnimations` (decasteljau, bisection, fixed-point, sequence, with a running driver asserted before close): not detected, and no animation is left running, because graph `restoreState` stops playback and `next` stops it before completion; the line is defense in depth with no reachable observable effect. All faults reverted.
- Open: browser sample selection and the deletion mapping (step 3 of handoff 1); final timing at a quiet checkpoint.

## Task 5 disposition

Implemented in `1653fbb` by a Sonnet 5.5 worker (dispatched 2026-10-25T13:55Z, handoff-v11, own worktree), reviewed and integrated by the handler. Re-read list at start: accumulation checkpoint/rollback; arc-length, area-between-curves, darboux, definite-integral, fixed-point default; area-between-curves batch.

| Exclusion | Reproduction with list emptied | Root cause | Disposition |
| --- | --- | --- | --- |
| arc-length, darboux, definite-integral, fixed-point, area-between-curves default | Curve lines differed, e.g. arc-length `curve n=4 … 3.641593,-0.479426` vs expected `n=3 … 3.14,0`, with the model already reset to `{a:0,b:π,n:2}` | Harness: `boardSignature` read `curve.points` past `numberPoints`; JSXGraph keeps undrawn tail entries after `updateDataArray` shrinks | Removed |
| accumulation checkpoint/rollback, area-between-curves fills | Extra `curve empty` line | Harness: a fill that shrinks to zero points stays `visPropCalc.visible`; a fresh one is hidden; both draw nothing | Removed |
| area-between-curves batch | 15 s timeout under load, not a drawing difference | Load | Removed; passes |

`fillCache` is keyed by the model, but view clamping runs inside `updateDataArray`, so no stale view geometry was found. Evidence: worker's `boardSignature.test.tsx` cases fail against the old harness (`n=5` vs `n=3`; `curve empty` vs `[]`), and all three pass after the fix. Handler rerun after integration: `GraphTransientState.test.tsx` plus `boardSignature.test.tsx`, 369 passed, unfiltered, 204 s idle (`.command-logs/task5-unfiltered.log`, not committed); typecheck and lint clean. Worker: `src/graphs/functions` 932 passed.

Gaps: no dedicated zoom/pan/resize-at-unchanged-model regression (only `changeScene`'s bounding-box change exercises it); no browser smoke or drag/slider measurement, because no app code changed. The signature deliberately treats visible-but-empty and hidden curves alike. No task 1 browser row needs to be retained on task 5's account.
