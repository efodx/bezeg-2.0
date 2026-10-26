# Chapter entry checks

Assigned chapter-entry checks for the chapter-owned guided-example consolidation.

- `ChapterPage.test.tsx` verifies the Bézier chapter renders one guided-example card for each registry entry, all expected example links are unique and ordered, the six existing preview captures retain bilingual alternatives/captions, and card/action labels translate from “Vodeni primer” to “Guided example.” It rejects a separate lesson/activity list.
- `LearningPage.test.tsx` compares each family chapter's rendered destinations to the registry and verifies every registered destination resolves to the exact chapter/section owner and a nonempty unified lesson definition. It also requires one short example and at least one multi-frame example across the catalog, and checks Foundations cards and labels in both languages.
- `guidedExampleReading.test.ts` captures a real section-relative scroll offset and invoking-link focus, then verifies restoration applies both. A missing visit bookmark returns `false`, which allows normal Back/Forward anchor fallback.

**Observed red:** Temporarily changed `restoreGuidedExampleReading` to always return `false`. The positive restoration test failed at the `true` return assertion; reverted the mutation immediately. The adapter's earlier invalid prepared-activity canonical path also failed the all-links resolver assertion before its repair.

**Verification:** `just --list`; then `just unit src/learning/ChapterPage.test.tsx src/learning/LearningPage.test.tsx src/learning/chapter/guidedExampleReading.test.ts` passed after the adapter repair (24 tests, log `.command-logs/2026-10-26T11-33-21-593Z-107740-45479fb5.log`). The deliberate mutation run failed as expected (log `.command-logs/2026-10-26T11-33-07-657Z-107104-c1b6c69f.log`).

**Coverage limit:** Back/Forward fallback is covered at the bookmark API boundary; browser-level history traversal and integrated page focus/scroll restoration remain for handler/browser acceptance.

Final integrated outcomes and remaining limits: [acceptance](acceptance.md). Earlier unperformed checks above describe this worker's bounded run.
