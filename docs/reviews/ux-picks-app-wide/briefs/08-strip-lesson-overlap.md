# Brief: puck strip overlaps the lesson card when it wraps (layout bug found in task 08)

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push. Another worker is converting
`src/graphs/curves/bezier/ElevationGraph.tsx` in the same worktree: do not touch graph or lesson files; run only
path-filtered unit tests (no `just check-changed`, no build).

## Observed

`/bezeg-2.0/functions/inverse` (dev server `http://127.0.0.1:4483/bezeg-2.0/`), guided lesson step 1 at 1440x900:
the lesson card is docked top-left (about x 64-478, y 210-680). The puck strip has three pucks (x0 slider "Točka P: abscisa
x₀", switch "Inverzna funkcija", switch "Tangenti"); it wraps into two rows and sits at bottom-left (handle about y 665, pucks
y 627-770), overlapping the lower part of the lesson card. Shot: `docs/reviews/ux-picks-app-wide/smoke/08-L06-visual/lesson.png`.
Free play is fine (strip bottom-left on the axis). Earlier the strip was observed to move top-left -> bottom-left when Orodja
opens on exponential (one puck).

## Design context (read by section)

`docs/reviews/ux-picks-app-wide/03-layout-design.md` (strip rules 2a-2i; rule 2i keeps the lesson card's Back/Next clear of the
strip; `exactCut`, `holdHeight`, anchor rule). Code: `src/workspace/` layout function and the puck strip
(`src/workspace/pucks/PuckStrip.tsx`, the layout module the strip placement uses; search `2i`, `exactCut`, `strip`).
Notes of the strip slices: `briefs/notes/05b-*.md`, commit `a10ef63c`.

## Goal and acceptance

1. Find why the strip overlaps the lesson card here (file:line): e.g. the layout measures the strip's one-row height but it
   renders wrapped, or rule 2i only protects Back/Next, or the card's height is taken before its text grows.
2. Fix in the layout code so the strip never overlaps any card (lesson card included) at 1440x900 and 1280x720; prefer the
   existing rules' intent (the strip keeps clear of cards; a wrapped strip is measured as wrapped). Keep the free-play placement.
3. A unit test in the layout's tests reproducing the case (lesson card tall on the left, a 3-puck strip whose width forces a
   wrap) failing before the fix (quote it) and passing after.
4. Browser check on 4483 with a small Playwright script (write it into `docs/reviews/ux-picks-app-wide/smoke/08-strip-overlap/`):
   bounding boxes of `[data-puck-strip]` and every board card do not intersect, on `/functions/inverse` lesson step 1 and free
   play, `/functions/exponential` free play with Orodja opened and closed, and `/linear-map` lesson step 1, at 1440x900 and
   1280x720. Report the boxes.
5. `just unit src/workspace`; `npx tsc --noEmit --pretty false`; `just lint <changed files>`.

If the fix needs a design choice that changes the owner-signed strip rules (e.g. where the strip goes when nothing fits), stop
and report the options instead.

## Return

At most 250 words: cause file:line, fix, red failure text, browser boxes summary, files changed.
Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-strip-lesson-overlap.md`.
