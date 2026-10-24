# Implement Cohort D Guided lessons

**Source spec:** [Guided lesson content expansion blueprint](../../specs/guided-lessons-content-expansion.md), Cohort D implementation contract

**Dependencies:** [Cohort C](implement-cohort-c.md); the data-driven lesson smoke spec that replaces the per-cohort specs

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

## Goal

Add draft Guided lessons for `subdivision`, `repeated-subdivision`, `rational-subdivision`, `extrapolation`, and `rational-extrapolation` in one batch. The lessons depend on generated-curve ownership and are verified by a single browser smoke pass.

## Slices

Slices 1–3 run in parallel. Slice 4 waits for them.

1. **Subdivision seam** owns `src/graphs/curves/bezier/SubdivisionGraph1.tsx` (also used by `RationalSubdivisionGraph2`), the rational subclass if needed, tests, and four `LessonAction` variants in `src/learning/model.ts`:
   - `{kind: 'subdivision-parameter'; value: number}`
   - `{kind: 'subdivide'}`
   - `{kind: 'extrapolation-parameter'; value: number}`
   - `{kind: 'extrapolate'}`

   Own and rebind the orange remainder curve across scene preparation and restore, keep the scheme switch in sync with state, and test both the polynomial and the rational split identities.
2. **Repeated subdivision seam** owns `src/graphs/curves/bezier/SubdivisionGraph.tsx` and its test. Handle `subdivide` with the five-step cap, include `stepsDone` in the lesson checkpoint and reset it in the default scene, and remove the leftover `console.log`. Test the `2^k` curve count, coverage of the original curve, and the decreasing distance from polygon to curve.
3. **Extrapolation seam** owns `src/graphs/curves/bezier/ExtrapolationGraph.tsx`, `src/graphs/curves/rational/RationalExtrapolationGraph.tsx`, and their tests. Handle the parameter and extrapolate actions, recreate the extrapolation point in the prepared scene, test $E(u)=B(tu)$ for both, and check the rational weights against the contract: one becomes negative above $t\approx1.366$, while the original denominator stays positive, so there is no pole.
4. **Content and integration** owns a new `src/learning/content/constructionGuidedLessons.ts` and its test, scene-action mapping, registration, allowlist, catalog-count tests, and new route rows in the data-driven lesson smoke spec. Each lesson has 4–6 steps, Slovenian first, with delimited inline math and worked values recomputed in tests.

## Acceptance criteria

- Blueprint route-level criteria 1–4 and 6 pass for all five routes; criterion 5 owner language and classroom review stay pending.
- Exit restores exactly the pre-lesson curve set, control points, weights, parameters, and repeated-subdivision step count; repeated entry and exit leave no generated curves or stray auxiliary objects.
- Routes, Preset identifiers, stored presets, import/export formats, and subdivision/extrapolation algorithms are unchanged.
- `npx tsc --noEmit --pretty false`, the full Jest suite, the production build, and one full built smoke run pass.
- Capability, rollout-matrix, and roadmap documents record the draft status.

## Verification

Built as one batch by Sonnet workers with handler review, then verified in a single browser pass with the new data-driven lesson smoke spec.

- `npx tsc --noEmit --pretty false` passed; the full Jest suite passed (48 suites, 316 tests); the production build compiled with existing warnings; the full built smoke suite passed (see the final run recorded in the commit message).
- Discovery fixes: subdivision scene wiring (remainder curve, interval end, disabled controls) and extrapolation points were set only in `initialize()` and are now rebound after every import; repeated-subdivision steps are part of lesson checkpoints.
- The browser pass found defects that fake-board unit tests missed, all fixed: subdivision scenes read React state written earlier in the same scene (now a synchronous `pendingT`), the right piece of a rational split lacked weight labels, and the rational-extrapolation step asked learners to find a control point far off-screen (now described with zoom-out guidance).
- The rational-extrapolation lesson explains that the third weight $1+2t-2t^2$ turns negative above $t\approx1.366$ while the denominator $1+3s(1-s)^2\ge1$ rules out a pole.
- Pending owner review: Slovenian terms (*subdivizija*, *homogene koordinate*, *ekstrapolacija*) and the quadratic-convergence claim for repeated subdivision. Not covered: physical touch devices and projector/presentation mode.
