# Ordered content and identity seam

Worker start: 2026-10-26 13:26 UTC. Worktree: `.worktrees/consolidated-learning`, baseline `2c3df6aa32d906f2e10279f1b45b16a1fb23fa09`. Task: [01 ordered content](../../tasks/illustrated-chapter-examples/01-ordered-content.md), acceptance basis: spec A2, A3 and A6. Brief revision: handoff-v12. Shared registry/content identities are pending the handler's audit-approved retained map.

## Contract delivered

`src/learning/chapter/orderedContent.ts` defines ordered paragraph, formula, figure and stable `exampleId` references. It exports sequence extraction, unknown/duplicate validation, language-order comparison and the named legacy append adapter. `ChapterSection` and `FamilyChapterSection` accept optional explicit sequences. Both chapter renderers consume the same contract; explicit sequences preserve their authored order. The temporary adapter converts the current Bézier activity markers to their current stable registry IDs and appends any remaining current registry cards after existing content. Family legacy content is adapted as paragraphs, formula, figures, then its current cards. Task 07 already explicitly requires removing renderer adapters and registry append fallbacks after all chapter batches migrate.

`ChapterGuidedLessons` accepts `exampleId` to render one card at its authored slot and `previewFor(exampleId, language)` to inject preview metadata from the capture worker's module. It retains the current all-cards mode for callers during migration and existing activity-figure fallback. Preserve existing link IDs (`example-${chapterId}-${sectionId}-${example.id}`) so return/focus targets keep resolving. Use registry IDs as references; do not introduce numeric positions or infer retained pedagogy from action equality.

## Migration recipe for chapter batches

Populate each section's `orderedContent` with its complete sequence in the source-of-truth content files. Bézier has separate Slovenian and English arrays, so put the same retained `exampleId` sequence in both; paragraph boundaries and wording may differ. Family chapters use one localized sequence with `{sl,en}` text. Add each retained paragraph, formula, figure and example exactly where it belongs. Keep section IDs as the old URL/hash anchors. The identity/registry owner should first expose the audit's retained keys and map every legacy `activity`, `explore`, `example`, and catalog `learn` entry to a retained owner. Each `exampleId` must resolve exactly once; aliases resolve to that card but are not additional placements. Add tests for unknown IDs, duplicates, and Slovenian/English example-order equivalence against the retained registry; render tests should inspect the actual DOM sequence and existing card link/focus IDs.

Preview metadata can be supplied through `previewFor` at the per-card renderer call, keyed by the same retained `exampleId` in both languages. Task 02's inventory IDs and image manifest must use that key. Once every chapter section has a complete explicit sequence and exact preview mapping, task 07 removes `sectionContent`'s fallback append bridge and `ChapterGuidedLessons`' all-cards mode, and verifies no registry entry is left unplaced.

## Checks observed

- `just --list`: passed at dirty baseline.
- `just unit src/learning/chapter/orderedContent.test.ts src/learning/chapter/guidedExamples.test.ts src/learning/ChapterPage.test.tsx src/learning/LearningPage.test.tsx`: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-28-09-464Z-102876-fba927fd.log`.
- `just typecheck`: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-28-09-380Z-100000-b7854ae7.log`.
- `just unit src/learning/chapter/orderedContent.test.ts src/learning/chapter/guidedExamples.test.ts src/learning/ChapterGuidedLessons.test.tsx src/learning/ChapterPage.test.tsx src/learning/LearningPage.test.tsx`: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-29-44-762Z-19596-252b2ea4.log`.
- `just typecheck`: passed again at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-29-44-706Z-103988-a4d878c6.log`.
- `just lint src/learning/chapter/orderedContent.ts src/learning/chapter/orderedContent.test.ts src/learning/ChapterGuidedLessons.tsx src/learning/ChapterGuidedLessons.test.tsx src/learning/ChapterPage.tsx src/learning/FamilyChapterPage.tsx src/learning/content/bezierChapter.ts src/learning/content/familyChapters.ts`: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-30-19-676Z-36564-e8361c15.log`.
- New contract tests cover prose → example → prose → example, equivalent bilingual reference order despite different paragraph splits (and reject swapped order), a one-example section, unknown and duplicate IDs, and card preservation by the adapter. The card test confirms `exampleId` renders only that card, injected image metadata is used, and its existing return/focus anchor ID stays stable. These tests were observed passing. Pre-change failure has not yet been demonstrated; the old renderer did not consume an explicit order.

## Final bounded-seam checks

- `just unit src/learning/chapter/orderedContent.test.ts src/learning/chapter/guidedExamples.test.ts src/learning/ChapterGuidedLessons.test.tsx src/learning/OrderedChapterRendering.test.tsx src/learning/ChapterPage.test.tsx src/learning/LearningPage.test.tsx`: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-32-06-714Z-106860-d96ea2b6.log`. It exercises prose → card → prose → card in rendered Bézier output in both languages, plus one family card between its paragraphs.
- `just typecheck`: passed at baseline `2c3df6a` dirty after figure support and rendered-order tests; command log `.command-logs/2026-10-26T13-31-44-132Z-92836-34eece19.log`.
- `just lint` over the owned contract, renderers, schemas, and tests: passed at baseline `2c3df6a` dirty; command log `.command-logs/2026-10-26T13-32-06-672Z-93748-40106af6.log`.

## Pending

The editorial audit is available at `curriculum-audit.md`; this worker deliberately left retained identities, aliases, and content placements to the next worker because the machine-readable 175-entry baseline and PH full-cubic disposition were still in progress. The next worker owns registry and content migration together. The task 02 owner can connect its preview resolver through `previewFor`. Repeat typecheck and focused tests after content/registry batches integrate; route/browser smoke and final adapter removal belong to handler/task 07.

## Dirty-worktree note

`docs/commands.md`, preview capture scripts/tests and other files in `docs/reviews/illustrated-chapter-examples/` are shared worktree changes from parallel task owners. They are not part of this worker's authored scope and must be preserved.
