# 2. Lesson definitions, ownership and adaptation

Status: pending; task file written 2026-11-07 by the Contracts stream (step 4 of [contracts.md](../feature-streams/contracts.md)). Source: [lesson-authoring architecture, section 2](../../specs/lesson-authoring-architecture.md#2-lesson-definitions-ownership-and-adaptation), acceptance L1–L4, plus [verification](../../specs/lesson-authoring-architecture.md#verification-and-completion-evidence). Opens Controls step 9 (workstream 3), which consumes the owner identities defined here.

## Scope and entry points

The cycle as of `d5ba1154`:

- `src/learning/runtime/lessonCatalog.ts`: `getLessonForDemonstration` asks `findChapterOwnedLessonByDemonstration` before the catalog adapter `getCatalogLessonForDemonstration` (`adaptContent`, cached by Demonstration ID).
- `src/learning/content/chapterOwnedLessons.ts`: the chapter table of 16 registries. Twelve are passed as thunks because they import `getCatalogLessonForDemonstration` back from the runtime catalog. `findChapterOwnedLessonByDemonstration` calls `entries()` on every chapter, which runs every enumerable getter.
- The twelve cyclic registries in `src/learning/content/` are advancedBezier, bspline, convexity, curveGeometry, fourier, interpolation, numerical, probability, projectiveConics, schoolFunctionGraphs, sweep and triangulation (`*ChapterRegistry.ts`). Each defines enumerable getters over a section-to-Demonstration table, as `bsplineChapterRegistry.ts:25-34` does.
- The four static registries are linearMaps, complexMaps, triangleGeometry and `patchGuidedExampleRegistry.ts`. They hold authored definitions directly. Linear maps has two sections, L1 and L2, on one Demonstration.
- Identity and navigation consumers live in `src/learning/chapter/guidedLessonOwnership.ts` (`getGuidedLessonOwners`, `authoredGuidedLessonIds`, `getGuidedLessonOwnerForSection`, `guidedLessonLaunchPath`) and `src/learning/chapter/guidedExamples.ts` (`resolveGuidedExample`, which also imports the runtime catalog).
- Runtime callers are `src/graphs/base/DemonstrationWorkspace.tsx:54-55` and `src/learning/runtime/lessonRestorationContract.tsx:61`.

Out of scope: `GuidedLesson.tsx` and the lesson panel, which Codex's lesson-navigation work owns. Exact-section return, focus and reading position must keep working through lookup alone. Also out of scope: lesson prose, actions, registration or root composition (workstream 3), dynamic loading, and alias rewrites.

## Work and completion

1. **Characterize first.** Add tests that pin the current behavior independently of the new representation:
   - catalog default order (chapter table order, then registry key order);
   - B-spline direct entries and exact-section lookup;
   - linear-map L1 and L2 exact selection, and L1 as the default owner;
   - fallback guidance for Demonstrations without a chapter owner, and unavailability for explicitly lessonless entries;
   - `guidedLessonLaunchPath` and the retained alias or legacy `?example=` destinations through `resolveGuidedExample`.

   These pass on the current code. In the same slice, add the L1 isolation harness: count provider/adaptation calls, for example by spying on the content adapter and on registry providers. Its zero-call assertions for identity consumers and for selected-chapter, fallback-only and missing-ID lookups must be seen failing on the current code. Each also asserts a nonempty selected lesson.
2. **Core and proof (handler-owned seam).**
   - Introduce cheap owner rows, `{chapterId, sectionId, demonstrationId, providerKey}` in teaching order, with indexes built once: exact owner, and Demonstration to ordered owners.
   - Add a lower-level content adapter, the current `adaptContent` moved out of the runtime catalog, that imports neither chapter ownership nor the catalog.
   - Add a composition layer that selects identity first, then resolves and caches by owner/definition identity.
   - Migrate B-spline and both linear-map owners onto it, and point `getLessonForDemonstration`, `resolveGuidedExample` and the four identity consumers at the indexes.

   The pilot alone does not complete the task.
3. **Mechanical migration.** Move the remaining eleven cyclic registries onto rows plus providers that call the content adapter. Delete the enumerable getters, the thunk branch of `ownedLessons` and the cycle comments. Keep an `entries()`-style export adapter only where a caller needs it, and only on explicit request.
4. **Integrity and import graph.**
   - L2: integrity checks report duplicate owner identities, missing providers or sections, conflicting mappings and invalid default order with exact IDs. A shared Demonstration stays valid.
   - L3: an import-graph test covers transitive imports from `src/learning/content/` back to `src/learning/runtime/lessonCatalog.ts` and the composition layer, seen failing on a deliberate back-import.
   - Update `docs/current-architecture.md` on lesson lookup.

Each slice runs focused `just unit` on the learning and chapter tests, typecheck and lint. The last slice also runs the production build and the full `=all` suite.

## Verification and return

Run `lessonCatalog.test.ts`, the guided-lesson ownership, guided-example and lesson-restoration tests, `lessonSmokeCoverage.test.ts`, and the lesson content tests including `lessonMathNotation.test.ts`, unchanged and unweakened. Then run the full checklist through `bezeg-smoke` (Sonnet), because lesson lookup feeds the shared lesson runtime: chapter entry to an exact section, catalog guidance, return with focus and reading position, linear-map L1/L2, a B-spline section, and one fallback-only Demonstration. Use an engineering review for the core slice and the integrated diff.

Return the row table with default order, the removed cycle locations, isolation counts per lookup kind, the import-graph evidence and the observed failure of each new assertion. Gaps must be explicit.
