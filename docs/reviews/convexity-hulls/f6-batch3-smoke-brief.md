# Brief: lesson A6 and convexity Batch 3 F6 smoke, geometry handler 54, 2026-11-05

- **Role:** `bezeg-smoke`, browser checks only. Do not edit src or tests, commit, push, build or delegate. Follow `.agents/skills/smoke-tester/SKILL.md` worker execution.
- **Target:** production preview already running at `http://127.0.0.1:4313/bezeg-2.0/` (stream-geometry working tree, dirty, task 28 applied). Do not stop it; if it is unreachable, return that at once. Pattern for a script: `docs/reviews/feature-streams/geometry/13s-chapter-check.cjs`. Put scripts and screenshots in `docs/reviews/convexity-hulls/f6b3-smoke/`.
- **Lesson `bezier-hulls`** (route `/compgeo/bezier-hulls?learn=1`), 1440×900:
  1. Screenshot every step of the lesson: `sl-step1.png` to `sl-step7.png` with the whole page, in SL. Record the kept/candidates readout at each step: expected 1 of 1; 4 pairs, no verdict (steps 2, 3); 2 of 4; 8 of 256; 1 of 256; step 7 back at 1 of 1. Math renders; no raw `\(`.
  2. Live SL→EN switch on step 5 changes prose and readouts; screenshot `en-step5.png`. Back from step 6 returns to step 5's picture and numbers.
  3. In step 7, type the points \((0,0),(4,8),(8,0)\) and \((1,6),(5,-2),(9,6)\) through the numeric fields, go to the last step, and record the readout (expected 2 of 256); screenshot `twin.png`. This is what step 5 tells a student to try; report if a student cannot do it, or if the curves leave the view.
- **Chapter `convexity-hulls` in Learn**, SL and EN, 1440×900 and 390×844: section `bezier-hulls` comes last, math renders, no horizontal page scroll at 390. Open the lesson from the section, exit, and check focus returns to the launching control (`document.activeElement`) with the page at that section.
- **Route `/compgeo/bezier-hulls`:**
  4. Deep link and reload open the graph. Playback is stopped on open. A lesson exit returns the graph to its pre-lesson state.
  5. Save a Preset under a unique `smoke-<id>` name after moving a point and stepping forward, reload the page, restore it, and record that points and step return. Delete only that Preset.
  6. At the last step with `pieces` on, grab a control point of a curve that lies inside a filled kept piece, drag it, and record that the point moved and the step returned to 0. Screenshot before and after.
  7. Export an SVG and PNG figure.
  8. At 1366×768 and 390×844 the main figure is inside the board, not clipped; `depth4.png` at 1440×900.
  9. No console errors on any of these. Regression: `/compgeo/convex-hull` and `/compgeo/hull-robustness` open.
  The catalog card has no poster yet: expected, do not count it.
- **Return:** ≤180 words: pass, fail, blocked and skipped counts, each failure with route, viewport, language and what you saw; full table in `docs/reviews/convexity-hulls/f6b3-smoke/report.md`.
- **Budget:** about 30 turns, ten to fifteen minutes elapsed. On a `HANDOFF` message or past ~30 turns, write what you have to the report and return it as partial.
