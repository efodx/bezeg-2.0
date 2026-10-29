# Task 13 preview wiring — H26

- Added a separate eleven-id patch fixture map and patch-subdirectory eager URL glob in `src/learning/chapter/guidedExamplePreviews.ts`.
- Patch fixtures use `patchGuidedPreviewCopy` bilingual copy by chapter section; mismatched demonstration ids return no copy.
- Existing root-level glob and retained-example inventory stay separate; regression coverage pins the root inventory to 56 and excludes patch ids.
- `src/learning/content/patchChapter.ts` adds a localized figure before building ordered reader content, preserving any existing figure and placing the capture before the guided example.
- The fixtures map covers every chapter section and the expected demonstration id; unavailable image paths remain unresolved until captures are supplied.
- No files currently exist under `src/images/learning/examples/patches/`; this change makes no capture or image-availability claim.
- Regression coverage checks resolved figures are reader-visible before the example and requires all eleven once any capture asset exists. Focused verification: `just unit src/learning/content/patchChapter.test.ts` passed (revision `e917d2caac4962e96e9129773c46c83d8eeba1b9`).
- Build, browser, capture, Git operations, and final integration verification remain with the handler.
