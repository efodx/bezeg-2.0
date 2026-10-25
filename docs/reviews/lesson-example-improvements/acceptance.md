# Lesson example improvements: acceptance record

**Result:** accepted 2026-10-25 with the gaps recorded below. Spec: [lesson-example-improvements](../../specs/lesson-example-improvements.md). Tasks: [index](../../tasks/lesson-example-improvements/README.md). This record is based on automated checks and screenshot review. It is not classroom validation.

## Revision

- Code accepted at d020abc on branch `worktree-lesson-example-improvements`, with a clean `src/`. Later commits on the branch change documentation only.
- Viewports: 1440×900 and 390×844. Languages: Slovenian and English, including a live language switch.
- Target: the production build (`just build`, `just preview 4392`), in Playwright Chromium with a fresh context per run and `reducedMotion: reduce`.

## Commands and results at d020abc

| Check | Result |
| --- | --- |
| `just check` (typecheck, unit tests, provenance build) | Passed: 165 files, 3426 tests |
| `just smoke-built tests/guided-lessons.smoke.spec.cjs --port 4391` | 164 passed: all 45 lessons (SL forward walk, EN exit/re-entry, 390 px) plus the shared runtime block |
| Lesson reconciliation | The task index's lesson IDs match the 45 `GUIDED_LESSON_AVAILABLE_IDS` exactly once each, and every lesson has a smoke row |
| Visual and interaction review, 12 changed lessons × 2 languages × 2 viewports (48 walks) | No page overflow and no console or page errors. Every contact sheet was reviewed by eye after the view fix. See [09-visual-acceptance](09-visual-acceptance.md) |
| Runtime controls (Back/Next, hide/reopen, language switch, exit/re-entry, preset restore, Reset, animation control) | Passed. See [09-visual-acceptance](09-visual-acceptance.md) sections B–D |

Per-task numerical and mutation evidence is in the `0N-evidence.md` files in this folder. Smoke-row repairs are in [09-smoke-repair](09-smoke-repair.md).

## Findings and disposition

Fixed during task 09:
- Five unit tests still pinned the old function-lesson sequences (a0312dc).
- The Bézier \(B(1/2)\) formula overflowed at 390 px; it is now a 3-line display (a446ecc).
- 16 smoke failures. All but the Bézier overflow came from test assumptions (ad7ab7a).
- **Runtime defect:** a lesson view whose aspect differed from the canvas was clipped. `BaseGraph.applyLessonView` now widens the view around its centre (d020abc), and wide/tall tests in `lessonFixtureScene.test.tsx` fail without the fix.

Deferred, minor and legible:
- Crowded labels: rational-extrapolation \(w_0\)/\(w_3\), the spline-g1 step-8 joint, the spline-parameterization start, circle \(n=12\), ph-cubic \(B(1/2)\), affine and spline-c1 labels at 390 px, and the ph-cubic arc-length readout next to an axis tick.
- At 390 px, wide calculation rows scroll inside their box.
- The keyboard path to Next is long in formula-heavy frames, because each MathJax expression is a tab stop (spline-g1 takes 27 Tab presses). This is an accessibility follow-up.
- Earlier reviews: engineering #1 (a second `boardUpdate` on default-scene views), #2 (a generic "does not support" message), #4 (the rejection test checks only the message pattern); spline review #4 (two internal scene ids do not match their sample counts).
- Product gaps: rational elevation has no polygon overlay comparing the original and elevated curves; the affine graph does not draw its pivot; the `transform-shape` chapter activity opens the plain affine default.

Deferred, pre-existing localization issue (worth a follow-up spec):
- Formula fields (`latex`, `calculationLatex`, `resultLatex`) are single strings shared by both languages. In Slovenian, words in `\text{...}` therefore appear in English (rational-extrapolation "has points … and weights", sequence "for every", and others: 25 lines on master), and decimals use points. This branch kept the pattern. A fix needs localizable formula rows or symbol-only rows across all lessons.

## Gaps in this acceptance

- The language-switch and exit screenshots were lost before review. Programmatic assertions cover those behaviours instead.
- Runtime controls (B–D) ran at ad7ab7a. d020abc changes only view framing, which the automated rows and the Back-walk view comparison cover.
- There was no classroom or projector trial and no screen-reader pass.

## Impact

Routes, stored Presets, free-exploration defaults, Reset and catalogue previews are unchanged. Lesson views now always show the whole requested box, with a small margin. There is no breaking change.
