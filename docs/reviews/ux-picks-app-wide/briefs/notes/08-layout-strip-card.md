# 08 layout: strip/card overlap (A) and lesson prompt clip (B)

Done
- A: the strip's slots were measured once per `puckShape`; in the lesson they grew by 9 px after that reading (measured 153/123, rendered 162/132), so the layout thought the strip fit one row (w 665, h 57) while it wrapped to two and the first row overflowed upward over the Lekcija card. Fix `src/workspace/presenter/BoardCards.tsx` (strip-reading layout effect): ResizeObserver on every slot re-reads the strip. Test `BoardCardsStripResize.test.tsx` (red without the observe line, green with).
- B: the card is cut by design (rule 6) to the room above the strip: body scrolls behind the visible "Več vsebine" bar, the Naprej row stays above it. The cut is the whole available height (card bottom 538 = strip top 546 - gap; board is ~411 px tall at 1280x720), so the board height is the limit. Avoidable chrome: the toolbar stacked (progress above buttons) below a 24.5rem container (card inside width 374 at 1280, 396 at 1440). Lowered to 23rem in `src/learning/runtime/GuidedLesson.css:233` (gains ~45 px, 1.5 -> 3 prompt lines in mc1). Test `LessonCardChrome.test.ts` (CSS-text check; red by arithmetic with 24.5rem, not run red).

Unverified
- `just build` fails with "Build inputs changed while building" three times in a row (builds pass in 6 s; a concurrent worker edit or watcher), so `just smoke-lesson` (sequence, prob-density, mechanics-descent) did not run. Logs: `.command-logs/h14-build.log`, `h14-smoke.log`.
- 1440x900 prompts still clip long formulas by design (cut + "Več vsebine"); no change.
- Other docks and lessons were not re-shot.

Evidence: `.command-logs/h14-before-*`, `h14-after-*` PNGs; `h14-unit-workspace.log` (passed), `h14-eslint.log`, `h14-tsc.log` (clean), `h14-probe.cjs` (DOM rect probe).
