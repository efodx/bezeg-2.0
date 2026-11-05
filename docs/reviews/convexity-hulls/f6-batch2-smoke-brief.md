# Brief: convexity Batch 2 chapter and F6 smoke, geometry handler 51, 2026-11-05

- **Role:** `bezeg-smoke`, browser checks only. Do not edit src or tests, commit, push or delegate. Follow `.agents/skills/smoke-tester/SKILL.md` worker execution.
- **Target:** production preview already running at `http://127.0.0.1:3012/bezeg-2.0/`, HEAD of `stream-geometry` in `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry`. Do not stop it. Pattern for a script: `docs/reviews/feature-streams/geometry/13s-chapter-check.cjs`. Put scripts and screenshots in `docs/reviews/convexity-hulls/f6b2-smoke/`.
- **Task 23, chapter `convexity-hulls` in Learn:** at 1440×900 and 390×844, in SL and EN:
  1. The six sections are in order, with `point-in-polygon` between `polygon-area` and `convex-hull`, and `hull-robustness` after `convex-hull`. Math renders; no raw `\(`; no horizontal page scroll at 390.
  2. From each of the two new sections, open the lesson, exit, and check focus returns to the launching control in that section (`document.activeElement`), with the page at that section.
- **F6, routes `/compgeo/point-in-polygon` and `/compgeo/hull-robustness`:**
  3. Deep link and reload open the graph; the catalog card shows the poster (not an empty frame).
  4. Live SL→EN switch during each lesson changes the prose, readouts and the inexact label. On hull-robustness step 5 the panel is inexact and step 6 exact, and Back from 6 returns to inexact.
  5. Keyboard: moving the query point on point-in-polygon, and choosing a cell on the Kettner map on hull-robustness, without a mouse.
  6. Playback is stopped on open. Scene restore: a lesson exit returns the graph to its pre-lesson state.
  7. Save a Preset, reload, restore it on each route. Export an SVG and PNG figure on each.
  8. At 1366×768 the main figure is inside the board, not clipped; the crossing number on point-in-polygon sits beside the edge, not on it. Regression: `/compgeo/convex-hull` and `/compgeo/polygon-area` open.
  9. No console errors on any of these.
- **Return:** ≤180 words: pass, fail, blocked and skipped counts, each failure with route, viewport, language and what you saw; full table in `docs/reviews/convexity-hulls/f6b2-smoke/report.md`.
- **Budget:** about 30 turns, ten to fifteen minutes elapsed. On a `HANDOFF` message or past ~30 turns, write what you have to the report and return it as partial.
