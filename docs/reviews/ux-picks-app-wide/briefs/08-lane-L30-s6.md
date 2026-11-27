# L30 lattice-paths, session 6: expansion view zoom

Role: `bezeg-worker`, may edit `src/graphs/combinatorics/LatticePath*` and its tests, `src/learning/content/combinatoricsGuidedLessons.ts`, `src/localization/fragments/lattice-paths.ts`, and append to `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L30.md`. Preserve all other uncommitted changes in the tree (sessions 1-5 of this lane are uncommitted; keep them). No commits, no pushes. Worktree root is cwd; never create a worktree.

Read first: shared lane brief `docs/reviews/ux-picks-app-wide/briefs/08-lane.md`, then the L30 notes `briefs/notes/08-lane-L30.md` sessions 3-5.

## Problem
In the lesson's expansion view (CB4 steps, route `combinatorics/lattice-paths`), the board is zoomed far out: visible x range about -25..110 (see `.command-logs/l30-shot-exp7-1280.png`). The bars are tiny and most coefficient labels are dropped. On master the bars fill the board. Declaration (`LatticePathGraph.tsx` ~line 1014) sets `marks: {must: [box]}` and `followView: box` with `box = VIEW_BOX` ([-1.5, 24.5, 21.5, -2.2]) for triangle/expansion. Find why the view director ends up so far out (wrong box for expansion, the board's own bounding box set elsewhere, aspect fit, `followView` semantics; see `docs/guides/converting-a-graph.md` and the view director code under `src/graphs/base/`), and fix it so the expansion bars fill the board as on master while captions stay clear of the cards. Check the triangle view did not regress.

## Acceptance
- Browser shots at 1440x900 and 1280x720 (`just shot`, dev server `http://127.0.0.1:4483/bezeg-2.0/`, route `combinatorics/lattice-paths`, lesson mode) of: expansion on the CB4 weight step, one larger n step of CB4, triangle (CB3), paths split. Bars fill most of the board width/height, coefficient labels readable, captions not under cards. Compare with master: `git show master:src/graphs/combinatorics/LatticePathGraph.tsx` for its bounding box. Look at the PNGs yourself and state what you see per shot.
- Checks pass: `npx tsc --noEmit --pretty false`; lint on changed files; `just unit src/graphs/combinatorics src/learning/content/combinatorics src/learning/content/declarationContract`; `just unit FirstTask`.
- Golden: run `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t lattice-paths` and report the differing fields (summary, not the full dump). Do not re-record.

## Return
≤300 words: root cause with `file:line`, the fix, per-shot verdict with PNG paths (`.command-logs/l30-s6-*.png`), check results, golden diff summary. Append a "Session 6" section to the notes file. At the HANDOFF budget signal stop and write a note.
