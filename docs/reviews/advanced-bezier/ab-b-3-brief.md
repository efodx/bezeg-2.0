# AB-B-3 D2 guided lesson: brief (handoff-v12)

- **Role:** implementation. Edit the files named below. No commits, no pushes. The handler reviews and commits.
- **Goal:** the eight-step guided lesson of `bezier-clipping` (spec `docs/specs/advanced-bezier-lessons.md`, D2 "Steps", lines 73-88; plan `docs/tasks/advanced-bezier/README.md`, Batch B plan). Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31): write it once, in Slovenian and English, after the scenes work, from the D2 contract. Use *Bézierovo rezanje* and *debela premica* as written.
- **Template:** `src/learning/content/degreeReductionGuidedLessons.ts` with its `.test.tsx`, and commit `d2d86252` for the wiring it needed. For trace scenes (`algorithm-trace`, `next-step`, step-numbered scenes), see `bezierHullsScene` at `src/learning/content/compgeoGuidedLessons.ts:3150`.
- **Scope:** new `src/learning/content/bezierClippingGuidedLessons.ts` and its test; `guidedLessons.ts`; `src/demonstrations.ts` (remove `lesson: false` from `bezier-clipping`); `guidedLessonOwnership.ts` (interim owner `bezier-curves/geometric-properties`, as the D1 and D3 lessons had; the id stays in `CHAPTER_LINK_PENDING`); `lessonMathNotation.test.ts` (add the lesson to the scan; never weaken it); `guidedExamplePreviewCopy.ts` and its test; `lessonCatalog.test.ts` (opt-out list empty again); a `bezier-clipping` row in `tests/guided-lessons.smoke.spec.cjs`. Add graph code only if a scene truly cannot be expressed; flag it first in your reply.
- **Context:** lesson operations already exist: `load-model` (whole model, needed for the half-integer offset pair; do not use `set-points`) and `set-clip-tolerance`, both in `BezierClippingGraph.applyPointSetAction`. Scene actions run synchronously in one tick; test multi-action scenes in one synchronous sequence. Preset and route data stay valid; no stored format changes. Run tests through `just`, never bare vitest.

## Checked numbers: quote only these

Observed in the browser on `8f6fb8fb` and matching `docs/reviews/advanced-bezier/ab-1d-kernel.md`. The spec's reference counts (22, 26, 66, 122, 7) are of a different rule: **do not quote them.**

| Pair | Tolerance | Clips | Status | Result |
| --- | --- | --- | --- | --- |
| Crossing \(B=(0,3),(2,-1),(4,3)\) | \(10^{-3}\) | 17 | `found` | \(t=0{,}25\), \(t=0{,}75\) on both curves |
| Crossing | \(10^{-6}\) | 21 | `found` | same; step 26 of 26 |
| Tangent \(B=(0,4),(2,0),(4,4)\) | \(10^{-3}\) | 53 | `found` | one range around \(0{,}5\) |
| Tangent | \(10^{-6}\) | 113 | `found` | one range around \(0{,}5\) |
| Tangent | \(10^{-10}\) | 200 | `limit` | one result, 28 unresolved pairs: 26 near \(0{,}5\), two wide and never processed (corrected by handler 64; the result lies about \(5\cdot10^{-7}\) below \(t=\tfrac12\) and does not contain it) |
| Offset \(B=(0,4.5),(2,0.5),(4,4.5)\), `gridStepExponent` \(-1\) | \(10^{-6}\) | 17 | `empty` | no range; hulls overlap at the start |

\(A=(0,0),(2,4),(4,0)\) throughout. Tangent over crossing at \(10^{-6}\): \(113/21\approx5{,}4\). Touching point \((2,2)\), crossings \((1,1{,}5)\) and \((3,1{,}5)\). Vertical gap of the offset pair \(4{,}5-16t+16t^2\ge0{,}5\).

## Steps

As the spec lists them: (1) curves and hulls, overlapping, predict; (2) fat line of \(B\) and distance graph of \(A\); (3) clipped range of \(A\), discarded pieces; (4) swap roles, clip \(B\); (5) repeat to tolerance, read widths; (6) tangent pair: slowing down, then `limit` at \(10^{-10}\); (7) offset pair: overlapping hulls, no intersection; (8) free exploration. Spec acceptance 3 and 6 are prose notes: a tolerance is a stopping rule, not a proof; hull overlap is necessary, not sufficient; a finite run illustrates and proves nothing.

Each scene that names a state must land on it: read the real step numbers from the graph's run in a test rather than guessing.

## Checks

- Lesson test: step count, each scene's board state (status, step, tolerance, loaded pair) by real `LessonSession` or the template's method, decimal whitelist in both languages (one mistyped copy fails), tolerance and pair restored by the next scene. Report at least three mutations and their failures.
- `just typecheck`, `just lint` on touched files, `just unit` on the new test, `lessonMathNotation`, `guidedExamplePreviewCopy`, `lessonCatalog`, `src/learning/chapter`, `src/demonstrations`.
- Do not run the browser smoke row; the handler does, because it owns the preview.

## Return

Reply in at most 30 lines: files, scene list with the step each lands on, test and mutation results, anything flagged with `file:line`. If a brief number differs from what the graph produces, stop and report it.

Budget: past about 30 turns, or on `HANDOFF`, stop at a consistent point, write `docs/reviews/advanced-bezier/ab-b-3-worker-handoff.md`, and return it as partial.
