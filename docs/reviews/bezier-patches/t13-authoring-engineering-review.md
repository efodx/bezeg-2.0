# Task 13 engineering review

Reviewed the current `worktree-bezier-patches-r2` diff against `78002a8`, task 13 and the patch chapter spec. Scope covered registry/card integration, route and ownership resolution, prerequisite rendering, moving iso-curve state updates, and lifecycle assertions. No implementation edits made.

## Findings

- **P2 — media/presentation acceptance remains open for the four new examples.** The registry explicitly keeps these examples outside retained media homes until capture assets exist (`src/learning/content/patchGuidedExampleRegistry.ts:4-5`). The card renderer asks `resolveGuidedExamplePreview`, whose copy and image lookup are retained-home keyed (`src/learning/chapter/guidedExamplePreviews.ts:35-55`), and its published ID inventory is still exactly `retainedExampleHomes` (`:58-59`). Therefore the four new cards resolve and render text/action but no example-specific still or motion preview; the chapter's existing catalog figures are separate images, not captures of these lesson scenes. This is a declared gap, not evidence that preview capture/presentation acceptance passed. The 56-home baseline remains independently asserted while chapter coverage now accounts for 60 references.

- **P2 — generic catalog availability does not include the new patch lessons.** The new route resolver handles explicit patch lesson context, and a bare `?learn=1` resolves via the canonical `patch-tensor` owner. However, `isGuidedLessonAvailable` is driven by `GUIDED_LESSON_AVAILABLE_IDS`, where `patch-tensor` remains absent (`src/learning/runtime/lessonAvailability.ts:4-19`); catalog/homepage lesson affordances use that allowlist. Actual chapter cards remain available via `getChapterGuidedExamples`. If catalog-level guided entry is part of task 13's preserved catalog behavior, this work does not expose it through that consumer; the direct graph route remains available.

## Evidence reviewed

- Registry tests cover all four stable IDs, valid section links, canonical/legacy query resolution, invalid section/prototype strings, mismatched demonstration rejection, and lesson identity stability (`src/learning/chapter/guidedExamples.test.ts:5-26`). The chapter coverage test adds four to the established 56 while preserving the baseline expectation (`src/learning/chapter/authoredChapterCoverage.test.ts`).
- Actual chapter rendering consumes the ordered example block through `ChapterGuidedLessons`; its link path is generated from the registry and stores the reader return/focus target. Prerequisite links render as normal localized React Router links.
- The `v` update now marks geometry changed; tests compare actual rendered sweep polyline and derived controls at the new parameter. Lesson tests verify non-vacuous movement, scheduler cancellation, and full starting-state restoration on close. Camera is not part of the geometry revision condition, consistent with the existing camera-only test.
- No production browser smoke evidence was reviewed here; route, keyboard/focus return, and media acceptance still need the assigned smoke coverage.

## Handler 25 disposition

The media/inventory and generic catalog availability findings remain explicit task13 integration gaps; no required criterion is waived. A later repair gates the moving overlay by the lesson sweep to preserve unrelated scene counts. Focused regressions passed, but this review predates that repair; independent lifecycle confirmation and real browser checks remain open. Registry/rendering/prerequisite changes remain uncommitted in the exact worktree pending those checks.
