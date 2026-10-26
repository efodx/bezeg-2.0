# Preview copy implementation note

Worker scope: bilingual observation captions and useful alternative text for preview cards. Source acceptance: [spec A4, A5 and A7](../../specs/illustrated-chapter-examples.md), with assigned requirements in [task 02](../../tasks/illustrated-chapter-examples/02-preview-pipeline.md) and chapter tasks 03–06. Work started 2026-10-26 13:33:47 UTC in `.worktrees/consolidated-learning` at baseline `2c3df6aa32d906f2e10279f1b45b16a1fb23fa09`.

`guidedExamplePreviewCopy.ts` provides a typed bilingual map for all 45 IDs in `GUIDED_LESSON_AVAILABLE_IDS`, a separate six-entry map for the Bézier activity IDs, and distinct purpose-specific copy for the worked parabola join. Each long-lesson caption was checked against the first `getGuidedLesson(id).steps[0].scene` ID and initial scene actions, including deliberately hidden construction or analysis elements. Captions describe visible observations and avoid presenting a drawing as proof; approximation limits are named where the initial preparation exposes them.

`guidedExamplePreviewCopy.test.ts` asserts the 45-entry and six-activity coverage, nonempty Slovenian and English alt/caption strings, balanced math delimiters, and an unknown-ID absence case. The worked-parabola copy is checked separately so it cannot silently inherit the generic `spline-c1` description.

This work supplies copy only. It does not bind previews to images, URLs, fingerprints or checksums, and it does not establish that the eventual captures visually match the described scenes. The actual-image comparison and card/screen-reader review remain open for the capture and browser acceptance work.
