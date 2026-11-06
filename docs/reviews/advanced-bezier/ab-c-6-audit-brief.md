# AB-C-6 criterion audit: brief (handoff-v12)

- **Role:** read-only audit. No edits, no commits, no pushes. You may run nothing heavier than focused reads and searches; do not run the test suite.
- **Goal:** for D4 Coons patch, map every acceptance criterion and spec requirement to the test or evidence that covers it, and name real gaps. Sources: `docs/specs/advanced-bezier-lessons.md` lines 105 to 119 (D4), line 148 and line 150 (test line, batch gate), the Correctness Notes line on Coons, Out of Scope line on Coons, and the D4 decisions in `docs/tasks/advanced-bezier/README.md`.
- **Format to follow:** `docs/reviews/advanced-bezier/ab-b-6-criterion-audit.md`: a table of criterion, test with file and line, status (`covered`, `partial`, `gap`, `browser`).
- **Code:** `src/bezeg/impl/kernels/coons.ts`, `src/graphs/patches/Coons*`, `src/graphs/patches/coons*`, `src/learning/content/coonsGuidedLessons.ts` and its test, `src/learning/content/advancedBezierChapter*`, `tests/guided-lessons.smoke.spec.cjs` row `patch-coons`. Evidence: `docs/reviews/advanced-bezier/ab-1c-kernel.md`, `ab-c-2a-graph.md`, `ab-c-3-lesson.md`.
- **Read the body of each test you cite.** Say so where you could not.

## Questions to answer beyond the table

1. Acceptance 2: does the lesson show the mismatch at the moved corner in a way a test pins, and does every place that says "interpolates" stop saying it when the corners differ (panel, lesson text, chapter text)?
2. Acceptance 3: search all SL and EN prose of the lesson, chapter section, card and prompts for a claim that the boundaries alone determine the interior, and for any twist claim. Quote any you find. Compare SL with EN sentence by sentence.
3. Every number the lesson and chapter quote: recompute it from the spec's nets, by hand or from the kernel's formula. The AB-C-3 review left prose checks that use `toContain` on short strings; say which quoted numbers no test actually pins.
4. Acceptance 4: is scene ownership and disposal tested for a drag, a Preset load and a route change? Are existing patch Presets and routes untouched by the Coons commits (`git log --oneline -- src/graphs/patches/patchPresetCollections.ts src/graphs/patches/surface-view`, read only what touches them)?
5. The spec's step list against the shipped seven steps, in order.

## Return

You cannot write files, so return the audit in your reply, at most 60 lines, with the table first; the handler files it as `docs/reviews/advanced-bezier/ab-c-6-criterion-audit.md`. Rank any gap by what a student or educator would see. A gap needs a location and the expected behaviour. Do not report style.

Budget: past about 25 turns, or on `HANDOFF`, stop and return what you have as partial.
