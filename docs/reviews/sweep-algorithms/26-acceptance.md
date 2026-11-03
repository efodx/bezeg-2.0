# Task 26 (Fortune chapter section): acceptance

Accepted 2026-11-03 by geometry handler 47. Source: [task 26](../../tasks/sweep-algorithms/26-fortune-chapter-section.md). Brief: [26-brief.md](26-brief.md). Implemented by one `bezeg-worker` slice under handler 46 (items 1 and 2), with the handler's `ChapterPage` dedupe onto `linkedParagraph.tsx`. Feature commit `9d90cf13` (rebased from `be44562d` onto `752a07ad`; the rebase was clean and no file overlapped the posters commit).

## Scope items

1. **Section and back link.** The `fortune` section follows `monotone-triangulation` in `sweep-algorithms`, with SL/EN prose, the activity card, and the prerequisite link to `triangulations-voronoi#voronoi`. The Voronoi section carries the in-text link "Fortunov algoritem" / "Fortune's algorithm" to `/bezeg-2.0/learn/sweep-algorithms#fortune`, rendered by `src/learning/chapter/linkedParagraph.tsx`, which `ChapterPage.tsx` now shares.
2. **Ownership and counts.** `fortune` left `CHAPTER_LINK_PENDING` (now `['patch-coons']`), and the lesson left its interim owner. Chapter coverage is 117. Breaking change, recorded in the task file: the example id `lesson.bezier-curves.geometric-properties.fortune` becomes `lesson.sweep-algorithms.fortune.fortune`. An old `?example=` link opens the lesson route without a guided example; plain lesson routes, stored Presets and chapter launches keep working.
   - Mutation evidence (handler 46): restoring the interim owner fails 2 tests in `sweepChapter.test.ts`; moving the back link fails `triangulationChapter.test.ts` and `OrderedChapterRendering.test.tsx`.
3. **Browser check** (handler 47, production preview of `ffb9826a` on port 4323, Playwright, [log](26-browser.log)). `triangulations-voronoi#voronoi` and `sweep-algorithms#fortune` at 1440×900 and 390×844, in SL and EN:
   - The Voronoi section has exactly one Fortune link, labelled in the page language. Clicking it reaches `/learn/sweep-algorithms#fortune`, with the heading at the top of the view (top 20 px desktop, 76 px phone, under the sticky outline).
   - Math is typeset by MathJax: 24 `mjx-container` nodes in `#voronoi` and 23 in `#fortune`, and no raw `\(` or `\[` delimiters in the visible text.
   - No horizontal overflow at either width. No page errors.
   - The activity link `example-sweep-algorithms-fortune-sweep-algorithms.fortune.fortune` opens `/compgeo/fortune?example=lesson.sweep-algorithms.fortune.fortune`. The lesson's owner link reads "Nazaj v poglavje" / "Return to chapter" with `href` `/bezeg-2.0/learn/sweep-algorithms#fortune`. Following it returns to the section, with focus on the activity link, in all four runs.
   - The handler viewed the SL 390 Fortune section and the EN 1440 Voronoi section screenshots: the formulas are typeset, the in-text link sits inline in the "another way to the same diagram" paragraph, and the layout is intact.

## Checks after the rebase (revision `ffb9826a`)

- `npx tsc --noEmit --pretty false`: clean ([log](26-tsc.log)).
- `just build`: passed ([log](26-build.log)).
- `just unit src/learning`, Vitest cache cleared first: 107 files, 1783 tests passed ([log](26-unit-final.log)).
- `just smoke-lesson fortune`: 2 passed ([log](26-smoke-fortune.log)).

## Rebase onto `f395ecde`

Before the push, master gained four commits (B-spline BS-B-6 audit, the unmounted functions S5 graph, docs). No file overlapped this branch, and no lesson, route or poster was added, so no count changed. On the rebased head `c56815b9`: tsc clean, `just build` passed, `just unit src/learning` (cache cleared) 107 files and 1783 tests passed.
