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
- `5ebb45e`: session-driven contract `src/learning/runtime/lessonRestorationContract.tsx`, run by `lessonRestoration.part1–4.test.tsx` (round-robin quarters of `GUIDED_LESSON_AVAILABLE_IDS`, one worker each; a single file ran out of worker memory). Per lesson: edit (`changeScene 'a'`); session 1 walks every frame, one commit per transition (observation frames: `showContent`/`explore`, then the 'b' scene actions, compounding subdivide/elevate once per walk, subdivide after the parameter), frame actions, animations, back/next at the end, last animation replayed before close; session 2 re-enters and crosses one scene boundary each way. After each close: `full()` unfiltered equals the edited scene, and resources (owned board objects, PH hodograph objects, live JSXGraph boards, running `AnimationDriver`s) equal the baseline. Then a twin graph receives the same switch flips and 'b' actions (scene and resources equal), the lesson finishes (one-tick walk, a learner change, `next` to complete) and close keeps the final scene; a separate case closes after unmount.
- Baseline choices: tick labels are excluded from object counts (JSXGraph pools them by render history; rational/extrapolation family differed only there). The resource baseline is the edited scene after a restore through its own checkpoint, because the Elevation edit path leaves four hidden segments that a restore does not rebuild; the twin check showed identical scenes and object kinds after a follow-up change, so this is no lost state. Counts were stable across rounds in every case.
- Run (idle, 4 files in parallel): 90 passed, 173 s wall, 652 s summed; slowest `circle` 45 s (about 0.7 s per transition alone), then subdivision family, `farin` and `spline-parameterization` around 30 s; per-test limit 120 s. With `LessonSession.test.ts`: 103 passed, 168 s (`just unit`). Typecheck and lint clean.
- Faults, representatives bezier, linear-function, ph-cubic, decasteljau-alternative, bisection, farin, spline-c1, repeated-subdivision: (1) `close` without `restoreState`: all 8 fail at the restored-scene comparison; (2) a hidden point created by the `demonstration-default` prepared-scene handler: 7 fail at the resource comparison, ph-cubic passes because its scenes use `lesson-fixture`; the same leak in the fixture branch fails ph-cubic and bezier; (3) `close` without `stopAnimations` (decasteljau, bisection, fixed-point, sequence, with a running driver asserted before close): not detected, and no animation is left running, because graph `restoreState` stops playback and `next` stops it before completion; the line is defense in depth with no reachable observable effect. All faults reverted.
- Open: browser sample selection and the deletion mapping (step 3 of handoff 1); final timing at a quiet checkpoint.

## Task 1 deletion mapping

The 38 rows below lost their `en: Exit restores...` test (hooks deleted); the 7 sampled rows (linear-function, repeated-subdivision, farin, spline-c1, ph-cubic, decasteljau, bisection) keep it. The template parts shared with that test (Back/Next at `exitStep`, Exit dialog focus, Escape) now run on the sampled rows only. Contract: `src/learning/runtime/lessonRestorationContract.tsx`. `full()` = after each close the unfiltered board/scene signature equals the edited scene, which covers restored controls, values, switches and counts. `resources` = owned board objects, PH hodograph objects, live boards and running AnimationDrivers equal the baseline, which covers stable counts across rounds. Twin check = restorable state that only shows after a later change (follow-up Subdivide/Elevate).

| Row | Removed browser check | Contract coverage |
| --- | --- | --- |
| bezier | Polygon switch off, on in lesson, off after Exit; polygon stable. | `full()` equals the edited scene after each close (switch state); `resources` equal the baseline. Sampled analogue: spline-c1. |
| affine | Same polygon switch check on the affine image. | As bezier. |
| elevation | Elevate degree (+2 points), base points in lesson, elevated points after Exit. | `full()` equals the edited scene after each close (point set); `resources` equal the baseline; twin check for a follow-up Elevate. Sampled analogue: repeated-subdivision. |
| rational | Weights [1,2,1,1] replaced by [1,4,1,1], restored; weight labels and curves. | `full()` equals the edited scene after each close (weights, labels, curves); `resources` equal the baseline. |
| rational-decasteljau | t = 0.8, lesson t about 0.5, t and curves restored. | `full()` equals the edited scene after each close (t, curves); `resources` equal the baseline. Sampled analogue: decasteljau. |
| ph-quintic | No user-state check; board counts stable over rounds. | `resources` equal the baseline (including PH hodograph objects), which is the stable-counts check. Sampled analogue: ph-cubic. |
| bernstein | Degree 1 to 2, lesson degree 3 and stacked on, restored; Display-tab switch. | `full()` equals the edited scene after each close (degree, stacked switch); `resources` equal the baseline. |
| rational-elevation | 4 points, in-lesson elevation actions (at least 5 points), 4 points after Exit. | `full()` equals the edited scene after each close; `resources` equal the baseline; twin check. In-lesson elevation actions run in the contract walk. |
| weighted-parameterization | alpha 0.8 and samples 7, lesson samples 3, restored. | `full()` equals the edited scene after each close (alpha, samples); `resources` equal the baseline. |
| uniform-parameterization | As weighted, plus mode select (uniform). | `full()` equals the edited scene after each close (mode, alpha, samples); `resources` equal the baseline. |
| subdivision | Subdivide, t = 0.7, restored t, drawn curves, points. | `full()` equals the edited scene after each close; `resources` equal the baseline; twin check for follow-up Subdivide. Sampled analogue: repeated-subdivision. |
| rational-subdivision | t = 0.7, restored t, drawn curves, labels hidden. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| extrapolation | Slider 1.4, restored slider, curves, points. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| rational-extrapolation | Slider 1.4, lesson weights, restored slider and hidden labels. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| decasteljau-alternative | t = 0.8, lesson t about 0.25, restored t, curves, points; animation graph. | `full()` equals the edited scene after each close; `resources` equal the baseline (running AnimationDrivers). Sampled analogue: decasteljau. |
| circle | Pieces 3 to 5, lesson 4 pieces, 5 after Exit. | `full()` equals the edited scene after each close (piece count); `resources` equal the baseline. |
| spline-cn | Degree 2 to 3, labels off; restored degree, continuity, switches, points. | `full()` equals the edited scene after each close; `resources` equal the baseline. Sampled analogue: spline-c1. |
| spline-c2 | As spline-c1: hide fixed on, labels off, restored switches and points. | `full()` equals the edited scene after each close; `resources` equal the baseline. Sampled analogue: spline-c1 (shares the factory, now without hooks). |
| spline-g1 | b0 = 1.5, lesson b0 about 0.25, restored b0, b1 = 1, points. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| spline-g1-symmetric | beta0 = 0.3, lesson about 0.75, restored beta0, points. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| spline-parameterization | alpha 0.8, samples 7, lesson alpha about 0, samples 10; restored, hide fixed on. | `full()` equals the edited scene after each close (alpha, samples, switch); `resources` equal the baseline. |
| exponential-function | a = 3, lesson a 0.5, restored a, point (1,3), total. | `full()` equals the edited scene after each close; `resources` equal the baseline. Sampled analogue: linear-function. |
| trigonometric-functions | Frequency 2, lesson equation, restored equation and total. | `full()` equals the edited scene after each close; `resources` equal the baseline. Sampled analogue: linear-function. The DOM equation readout is not compared directly (see gaps). |
| continuity | Value 2.5, lesson 1, restored value, point, total. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| derivative | h = -1.5, lesson 0.1, restored h, point Q, total. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| definite-integral | n = 20, lesson 4, restored n and total. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| area-between-curves | b = 2.5, lesson 3.22, restored b, point, total. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| arc-length | n = 20, lesson 10, restored n and total. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| mean-value | c = 1.2 and reveal; lesson c 1.5 hidden; restored c and revealed state. | `full()` equals the edited scene after each close; `resources` equal the baseline. Revealed state counts only where it lives in the scene (see gaps). |
| accumulation | x = 1.2 and reveal; lesson x = pi hidden; restored x, revealed, integral. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| darboux | n = 16, upper hidden; lesson n 8; restored n, upper hidden, lower sum. | `full()` equals the edited scene after each close (n, hidden upper); `resources` equal the baseline. |
| extrema | b = 1.5 and reveal; lesson b 1 hidden; restored b, revealed, max. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| convexity | t = 1.8 and reveal; lesson t 0.5; restored t, statuses. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| taylor | Degree 7 and reveal bound; lesson degree 3 hidden; restored degree, revealed. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| sequence | Two next-steps, N = 11, reveal; lesson terms 40, N 5; restored terms, N, statuses, playback stopped. | `full()` equals the edited scene after each close; `resources` equal the baseline (running AnimationDrivers). Playback stopped: see gaps. Sampled analogue: bisection. |
| uniform-convergence | n = 7, eps = 0.05, reveal; lesson n 11, eps 0.1; restored. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| complex-multiplication | Re z = 0.5, reveal; lesson z = 1+i, w = -1; restored z, product, statuses. | `full()` equals the edited scene after each close; `resources` equal the baseline. |
| fixed-point | Tolerance 5, two next-steps, reveal; lesson step 3, tol 1e-3; restored step, tol, statuses, playback stopped. | `full()` equals the edited scene after each close; `resources` equal the baseline. Playback stopped: see gaps. Sampled analogue: bisection. |

Residual differences (handler review):

- Playback stopped on Exit (sequence, fixed-point): covered, because `resources` includes running `AnimationDriver`s and must equal the baseline (none running). Only the redundant `stopAnimations` call in `close` is undetectable (see Task 1 progress, fault 3). Bisection keeps the browser check.
- DOM readouts and status attributes (equation text, `data-*-status`, revealed state): the contract compares graph scene/board state; the readouts render from that state. A readout that fails to re-render after a correct restore is caught only on sampled rows (linear-function compares the equation readout; bisection the step readout). Accepted gap.
- Exit-dialog focus on Continue and Escape keeping the frame are shared runtime behavior and run on the 7 sampled rows; task 2 assigns their single owner.

## Task 4 chapter activities

`tests/standalone-learning.smoke.spec.cjs`, Sonnet 5.5 worker (dispatched 2026-10-25T15:27Z, handoff-v12), reviewed by the handler. Before: 17 tests, 24.0 s; after: 18 passed, 18.4 s (indicative, concurrent workers).

- Every activity row (shape-control, curve-parameter, repeated-interpolation, blending-coefficients, geometric-bounds, transform-shape) keeps launch, authored-scene checks, reading context, `activity=<id>` and Continue reading. New "every chapter activity has an authored-scene row" compares the chapter's `#activity-*` ids with `rows`; handler mutation (transform-shape row removed) fails it with the missing id. `activities.test.ts` also pins the catalog.
- The return click, URL and focus, Forward, Reset and reload-with-notice sequence runs on `curve-parameter` (De Casteljau, animation paused at t = 0.75 across Forward, reset to 0.50) and `blending-coefficients` (Bernstein graph and query path); 4 sequences removed. The bezier/curve route keeps refresh and Forward through "chapter launch without a hash…" (geometric-bounds); affine reset through "Bernstein stacked view and affine translation…". Shared lifetime replacements: `useChapterActivity.test.tsx` (history traversal, paused restore, reset), `activities.test.ts`, `ChapterActivityVisit.test.ts` (capture/restore, fresh visit, rollback, lesson handoff, cleanup, ordinary-scene independence). No unit assertions were missing.
- Unchanged: hosted-404 and unknown-chapter recovery, keyboard, narrow and enlarged reading, intermediate widths, lesson handoff, ordinary scene, header styling, validated context.
- Fault: `ActivitySession.ts:15` `restoreState(snapshot)` commented out: 4 unit failures (activities reset/saved visit; ChapterActivityVisit throwing cleanup; useChapterActivity two activities on one graph and departure capture failure) and 3 browser failures (curve-parameter lifecycle "t = 0.75" received "t = 0.50"; lesson handoff; ordinary scene). Reverted, `git diff -- src` empty, rebuilt.
- Gaps: the fault did not separately prove the blending-coefficients sample; savings are modest (about 5.6 s wall).

## Task 5 disposition

Implemented in `1653fbb` by a Sonnet 5.5 worker (dispatched 2026-10-25T13:55Z, handoff-v11, own worktree), reviewed and integrated by the handler. Re-read list at start: accumulation checkpoint/rollback; arc-length, area-between-curves, darboux, definite-integral, fixed-point default; area-between-curves batch.

| Exclusion | Reproduction with list emptied | Root cause | Disposition |
| --- | --- | --- | --- |
| arc-length, darboux, definite-integral, fixed-point, area-between-curves default | Curve lines differed, e.g. arc-length `curve n=4 … 3.641593,-0.479426` vs expected `n=3 … 3.14,0`, with the model already reset to `{a:0,b:π,n:2}` | Harness: `boardSignature` read `curve.points` past `numberPoints`; JSXGraph keeps undrawn tail entries after `updateDataArray` shrinks | Removed |
| accumulation checkpoint/rollback, area-between-curves fills | Extra `curve empty` line | Harness: a fill that shrinks to zero points stays `visPropCalc.visible`; a fresh one is hidden; both draw nothing | Removed |
| area-between-curves batch | 15 s timeout under load, not a drawing difference | Load | Removed; passes |

`fillCache` is keyed by the model, but view clamping runs inside `updateDataArray`, so no stale view geometry was found. Evidence: worker's `boardSignature.test.tsx` cases fail against the old harness (`n=5` vs `n=3`; `curve empty` vs `[]`), and all three pass after the fix. Handler rerun after integration: `GraphTransientState.test.tsx` plus `boardSignature.test.tsx`, 369 passed, unfiltered, 204 s idle (`.command-logs/task5-unfiltered.log`, not committed); typecheck and lint clean. Worker: `src/graphs/functions` 932 passed.

Gaps: no dedicated zoom/pan/resize-at-unchanged-model regression (only `changeScene`'s bounding-box change exercises it); no browser smoke or drag/slider measurement, because no app code changed. The signature deliberately treats visible-but-empty and hidden curves alike. No task 1 browser row needs to be retained on task 5's account.

## Task 2 shared interaction matrix

Handler 4, inventory in [task2-inventory.md](task2-inventory.md). `hideOverlay`/`showOverlay` in `GuidedLesson.tsx` run no lesson-specific scene action (mode, playback pause, overlay phase only), so observe/reopen behaviour is shared runtime; whether board labels cover Next is lesson content.

Representatives by exercised feature:

| Feature | Representative | Owner |
| --- | --- | --- |
| Observation with edits, board identity on reopen and Exit | taylor | `lesson-graph-access` "Taylor…" and touch test |
| Observation lock, unlock, reopen frame, focus, Escape, desktop tab size, Next on top after reopen | extrapolation | `guided-lessons` "Observation flow" (tab size and hit-test moved here) |
| Animation/playback | decasteljau | "Observation flow / playback pauses…"; `GuidedLesson.test.tsx` pause tests |
| Long math, reading position | taylor (en, 1100×540) | `lesson-experience-checks` "same-frame reading position…"; unit reading tests |
| Graph-label overlap | every row | pointer click on Next on every frame of the sl and narrow walks |
| Child board | ph-cubic | `en: Exit` sample (hodograph after Exit) |

Behaviour owners: Back losslessness, Tab+Enter and language switch on `SHARED_RUNTIME_ROWS` (the switch now also requires the same frame numbers and an equal `boardStats` scene); exit dialog focus, trap, Escape and cancellation in `lesson-experience-checks` (Taylor, 14 variants) plus `GuidedLesson.test.tsx` Escape test; exit rollback on the 7-row `en: Exit` sample and the restoration contract; completion retention in "Rational elevation extras" and `LessonSession.test.ts`; touch in the `lesson-graph-access` touch test; reduced motion in the new `GuidedLesson.test.tsx` "reduced motion hides and reopens instructions immediately…" (non-reduced: "rapidly reopening during the closing handoff…"); runtime errors through `failOnRuntimeErrors` everywhere.

Removed → replacement:

- sl walk, every observation frame of 45 rows: graph unlocked after Observe → Observation flow and `DemonstrationWorkspace.test.tsx`; tab ≥ 44 px → Observation flow (desktop) and `lesson-graph-access` 390 px; reopen keeps the frame → Observation flow, Taylor, `GuidedLesson.test.tsx`; Next centre hit-test after reopen → Observation flow; keyboard Next on observation frames → Observation flow `pressOn` and Tab+Enter. Observation frames now take a real pointer click on Next like every other frame (previously keyboard, because of the hit-test), so per-lesson pointer reach is checked on more frames than before.
- `en: Exit` (7 rows): Continue focused on open and Escape keeping the frame → `lesson-experience-checks` and `GuidedLesson.test.tsx`. The short Back/Next block stays: it runs each row's `stepProbe`.

Faults (temporary, reverted, `git diff -- src/learning/runtime/GuidedLesson.tsx` empty afterwards): (A) Next calls `session.next()` twice: `GuidedLesson.test.tsx` fails, 5 of 12 Shared runtime/Observation flow browser tests fail. (B) `showOverlay` also calls `session.back()`: unit fails, 3 of 3 Observation flow tests fail. (C) reduced-motion branch disabled: only the new unit case fails. A first reopen fault (forcing `onModeChange('explore')` in `showOverlay`) was masked by the mode effect at `GuidedLesson.tsx:193` and is not a valid fault.

Unexercised variants: browser `prefers-reduced-motion` emulation; touch on rows other than Taylor; reopen with a child board mounted; language switch while an observation is hidden or the exit dialog is open; browser failure injection.

Verification (2f602d0 + task 2 tree, clean app code, fresh `just build`): `GuidedLesson.test.tsx` 21 passed; typecheck and lint clean; `smoke-built --port 4517 tests/guided-lessons.smoke.spec.cjs`: 130 passed, 4.6 min wall (indicative; 5.4 min on the deletion tree); the 7 `en: Exit` rows passed again after the dialog block was removed. Smoke-tester not run: test-only change.
