# 03 — Share chapter reading restoration

Status: planned, 2026-11-10. Source: [chapter reading restoration specification](../../specs/architecture-followups-2026-11.md#3-chapter-reading-restoration), acceptance R1–R5. Independent of tasks 01 and 02.

## Outcome and scope

Bézier and family readers use one owner for bookmark/section precedence, typesetting settlement, reading-anchor preservation and focus. The existing legacy activity visit keeps its checkpoints and special route-history policy.

Start at `src/learning/ChapterPage.tsx`, `FamilyChapterPage.tsx`, `chapter/guidedExampleReading.ts` and the reading DOM functions in `chapter/navigationMemory.ts`. A focused hook/module and corresponding tests are sufficient. Keep chapter content and JSX, lesson lookup, overlay navigation, native-history bridging, `chapterActivityVisit` and graph scene sessions outside the refactor. Coordinate with any current Learn UI owner before editing the readers.

## Work

1. Characterize both current schedules and map them to R1–R5. Write the shared precedence table before extraction, explicitly separating guided return, legacy return/invocation, ordinary hash navigation, fresh entry and language change. Record a failing regression for any behavioral correction.
2. Consolidate scheduling and reading policy, with a narrow Bézier-specific legacy fallback. Retain an applicable return bookmark through final math settlement; cancel stale promises/frame effects on route/language changes or unmount. Preserve `observeChapterInlineMath` setup and disposal from current master without taking over its layout rules.
3. Migrate both readers and delete the overlapping restoration effects. Keep language changes anchored to the visible section even when the URL names an older section.
4. Document the new reader ownership and any deliberate correction to current behavior. Preserve route/section identities, unrelated history/search state and visit-local memory.

## Verification and completion

- Use `src/learning/LearningPage.test.tsx`, `chapter/guidedExampleReading.test.ts` and focused reader integration coverage for the R1 precedence table. Retain `chapter/chapterActivityVisit.test.ts` and existing legacy navigation coverage.
- R2: control a delayed/rejected typesetting promise; navigate or unmount before it settles. Old work must not scroll or focus the new page. An unrelated render must not replay restoration.
- R3: read beyond the URL's named section, switch language and check the visible section/relative offset and focus. A stale bookmark must not win over this anchor.
- R4–R5: exercise real routes for `/bezeg-2.0/learn/bezier-curves` and a registered family chapter with examples. Cover direct/invalid section links, refresh, Guided example return, Back/Forward, invoking-link focus and absence of persistent progress writes.
- Start with path-filtered `just unit` for affected readers/navigation, then `just check-changed` against the agreed base. Use engineering and UI/accessibility review. Use `$smoke-tester` and the chapter navigation checklist on both reader types at desktop and narrow widths, including enlarged text and delayed math settlement. Browser checks must assert scroll position and focused element, not only the URL.
- Close R1–R5 with the tested revision and evidence. Do not claim the source inspection demonstrated a browser defect; distinguish preserved behavior from reproduced corrections.
