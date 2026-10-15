# 9. Batch B release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — Batch-wide acceptance gate

**Dependencies:** [05](05-extrema.md), [06](06-convexity.md), [07](07-darboux.md), [08](08-taylor.md)

**Status:** released 2026-10-16

## Steps

1. Register the routes in `src/Routes.tsx`, catalogue entries in `src/demonstrations.ts` under the Analysis family, preset collections, and the four IDs in `GUIDED_LESSON_AVAILABLE_IDS`; update count assertions.
2. Generate static previews with `scripts/generate-demonstration-previews.cjs` and `scripts/capture-demonstration-previews.cjs`; confirm that no unrelated preview changes.
3. Update capability documentation, `docs/current-architecture.md` where ownership changes, the spec status, and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify: TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), production build, browser checks of the four routes and lessons (catalogue changed, so the full checklist) on desktop/projection, a narrow viewport, keyboard, and essential touch alternatives, in Slovenian and English with a live language switch.
6. Fetch, rebase only the Batch B commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.

## Release record

Release (2026-10-16):

- **Registration:** routes, catalogue entries, preset collections (`extrema`, `convexity`, `darboux`, `taylor`), allowlisted lesson ids and count assertions; 41 routes in total, 7 in the Analysis family.
- **Previews:** real captures for the four routes, taken from the production build. The manifest was merged with the existing entries and no other preview changed.
- **Documentation:** capabilities, architecture, UI functionality counts and the spec status.
- **Reviews:** parallel mathematics, engineering and UI/accessibility reviews. Their findings were fixed in `b806323`, which also deduplicated the four graphs into `BaseFunctionGraph` helpers. One confirmed lesson error was among them: the Darboux gap had been stated as 4/n instead of 8/n.
- **Browser verification:**
  - The full production smoke suite was run three times. The first run had 181/183 passing: the preview manifest lacked the new captures, and the convexity lesson formulas overflowed at 390 px. After the fixes, the second and final runs each had 183/183 passing, the final one on the layout-fixed code.
  - A scripted pass over all four routes covered desktop (1440 px) and narrow (390 px, touch context). It exercised dragging an axis point, ArrowUp in a number field, the reveal button via Tab focus and Enter, and a live SL→EN→SL switch, with board text and readouts re-rendered in each language. No page errors and no horizontal overflow were found.
  - Board screenshots of every example found caption and label collisions. These were fixed in `8284371` by wider per-example views, outward endpoint labels, compact labels below 520 px and sign marks kept off the y-axis.

- **Hosted CI:** the first push (`7c4ee8f`) failed CI with 181/183: on Linux Chromium the Darboux step 3 and Taylor steps 2 and 4 explanation frames measured 396 to 413 px at 390 px, wider than on the local Windows run. Long inline formula chains were split so they can wrap (`f901516`). That run passed and deployed GitHub Pages.

**Known limits:**

- On narrow boards the extrema sine example is still crowded, though readable. The narrow convexity inflection label overlaps the curve, and the narrow Darboux `a` label touches the y-axis.
- The catalogue previews are zoomed out. This is because the shared capture script fits its frame to the corner-pinned caption, as with the Batch A mean value preview; fixing the script would regenerate every preview.
- No physical touch device or projector was used. GitHub Pages hosting was not exercised locally.
- The Slovenian lesson text still needs owner review.
- The Analiza I section and page citations (§4.6, §§7.1/7.3, and the extrema chapter) are taken from the research notes and are listed as unresolved questions.
