# Registry and Foundations implementation handoff

Completed the registry/Foundations slice in the consolidated-learning worktree. Runtime home and alias tables remain explicit in `src/learning/chapter/retainedExamples.ts`; the audit JSON is imported only by the regression test. The 175 baseline rows and 56 retained homes are checked by their actual stable key, destination, path, route owner, and corresponding chapter link. The rational extrapolation home now belongs to `investigate-rational` while retaining its legacy lesson route and source ID.

Foundations now has authored ordered sequences for `reading-bernstein`, `worked-weight`, and `complex-plane`; the other two Foundations sections remain prose-only. The worked-weight example opens at Bernstein degree two with stacked area hidden. Bézier “next ideas” now inserts at the exact bilingual concluding sentence in each locale. `ChapterPage.test.tsx` checks all 12 retained cards in authored order, with stable preview IDs and Slovenian/English alt text and captions.

Verification evidence:

- `just unit` passed for retained registry, guided examples, lesson ownership, Foundations chapter content, Bézier chapter content, and lesson math notation tests.
- `just unit src/learning/ChapterPage.test.tsx` passed after updating the six-preview expectation to the 12 retained cards.
- A temporary mutation changed the Foundations degree from two to three; the focused test failed on that exact action mismatch. The source was restored to degree two.
- `npx tsc --noEmit --pretty false` passed before the final tuple and ChapterPage test edits. A later duplicate typecheck was stopped while the handler’s full check was running.
- No build or browser capture was run in this slice; the handler owns integrated verification and capture.

The earlier notation-test failure came from concurrent edits in `familyChapterSequences.ts` and `guidedExamplePreviewCopy.ts`; both were corrected before the passing focused notation run. No commit or push was made.
