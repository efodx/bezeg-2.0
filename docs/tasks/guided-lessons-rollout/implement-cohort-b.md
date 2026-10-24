# Implement Cohort B Guided lessons

**Source spec:** [Guided lesson content expansion blueprint](../../specs/guided-lessons-content-expansion.md) — the `bernstein` contract and the Cohort B implementation contract

**Dependencies:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md); the implemented lesson runtime and Cohort A drafts

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

## Goal

Add draft Guided lessons for `bernstein` and `rational-elevation`, each backed by tested graph-owned actions, and allowlist them as drafts once the route-level gates in the blueprint pass.

## Slices

Slices 1 and 2 can run in parallel. Slice 3 can start once the action names below are agreed, but its integration step waits for slices 1 and 2.

1. **Bernstein graph seam** — owns `src/graphs/bernstein/`.
   - Add `prepareLessonDefaultScene` that resets to degree 1 without the stacked-area view and regenerates graph-owned objects from a clean board.
   - Handle typed `bernstein-degree` (integer degree 0–5, mapped to `n = degree + 1`) and `bernstein-stacked-area` (boolean) actions; reject invalid degrees before mutation.
   - Clear stale object references on regeneration so repeated changes do not accumulate.
   - Tests: action mapping and bounds, default-scene preparation, no object accumulation across repeated changes, and basis checks for degrees 0–5 (count `degree + 1`, nonnegative on `[0,1]`, sum 1 within tolerance).
2. **Rational elevation graph seam** — owns `src/graphs/curves/rational/RationalElevationGraph.tsx` and its new test.
   - Mirror `ElevationGraph`: handle `degree-elevation` and reapply disabled generic Bézier controls in the prepared default scene.
   - Confirm elevation uses the effective (evaluation) weights.
   - Tests: action ownership; the blueprint's worked values for weights and `Q₁…Q₃`; shape agreement after one and two elevations; checkpoint restoration of degree, points, and weights.
3. **Content and integration** — owns a new `src/learning/content/foundationGuidedLessons.ts` with its test, plus the shared integration files `src/learning/model.ts`, `src/learning/runtime/lessonCatalog.ts`, and `getGuidedLesson` registration in `src/learning/content/guidedLessons.ts`.
   - Add `LessonAction` variants `{kind: 'bernstein-degree'; degree: number}` and `{kind: 'bernstein-stacked-area'; visible: boolean}`, with scene actions `set-bernstein-degree` and `show-bernstein-stacked-area` validated in the catalog adapter.
   - Write 4–6 step Slovenian-first lessons with English counterparts, at least two sources each (including implementation correspondence), and the worked examples/invariants from the blueprint.
   - Add both IDs to `GUIDED_LESSON_AVAILABLE_IDS` only after slices 1–2 and the content tests pass.
   - Follow the localization guardrail in `AGENTS.md` if any UI catalog message changes.

## Acceptance criteria

- Blueprint route-level criteria 1–4 and 6 pass for both routes; criterion 5 owner language and classroom review are recorded as pending.
- Lesson Exit/Cancel restores the pre-lesson degree, stacked-area state and its switch, and rational points and weights; repeated entry and exit do not accumulate board objects.
- Routes, Preset identifiers, stored presets, import/export formats, and curve algorithms are unchanged.
- `npx tsc --noEmit --pretty false`, the focused Jest suites, and the production build pass; a browser smoke run covers `?learn=1` deep links for both routes, Back/Next/Exit, both languages, and desktop and narrow widths.
- Capability, rollout-matrix, and roadmap documents record the new draft status.

## Verification

Implemented by Sonnet workers (the owner's chosen fallback for unavailable GPT-6 Luna Max) with handler review. Handler review corrected one mathematical claim (the Bernstein sum is 1 for every t), removed references to never-visible Bernstein labels, and fixed Slovenian terminology (*neuteženo povprečje*, *razčlenitev enote*, *naloženi ploščinski grafikon*).

- `npx tsc --noEmit --pretty false` passed; the full Jest suite passed (39 suites, 195 tests) after updating catalog link counts (36 links, 10 Learn links) and moving the lesson-free workspace test from `bernstein` to `subdivision`; the production build compiled with existing warnings.
- Rational elevation now uses effective weights, so Farin-slider weights are not ignored, and rebuilds Farin sliders and weight labels for the new degree.
- `tests/guided-lessons-cohort-b.smoke.spec.cjs` (17 Chromium checks) covers deep links, full Next/Back traversal, stacked-area state, no board-object growth across stepping and three re-entries, Exit restoring a user-changed degree and four rational points, weight labels, English titles, 390-pixel layout, keyboard activation, and elevation with weight labels and with a Farin preset. The full built smoke suite passed (51 tests).
- The smoke run found two shared-runtime defects, both fixed in lesson CSS: MathJax formulas widened the page at 390 pixels, and JSXGraph HTML labels covered the compact Continue prompt.
- Not covered: physical touch devices, projector/presentation-mode layout, and owner/subject-matter review. The Farin switch is not exposed on the elevation route, so Farin-plus-elevation is reachable only through an imported preset.
