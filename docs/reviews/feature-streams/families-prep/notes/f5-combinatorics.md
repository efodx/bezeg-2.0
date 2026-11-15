# Combinatorics F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter combinatorics`, four entries; `expected` authored from the first scenes in `combinatoricsGuidedLessons.ts` and the build code of `LatticePathGraph.tsx` / `CountingTreeGraph.tsx` (`combinatoricsExpectedFor`). All four passed the capture checks on the first attempt (including the authored curve samples: tree edge (12.2, 21) to (4.4667, 14.5), expansion baseline and first bar).
- Windows: the recipe window is shared by every card of a Demonstration. A first capture with a 5 by 3 window left the expansion card blank (bars off the card) and a wide window made the (2, 2) grid 40 px; so `lattice-paths` frames the paths opening, `counting-tree` frames the 3 choose 2 tree, and `captureRecipeForEntry` has one entry override (`combinatorics.binomial-theorem.lattice-paths`, window [-1.5, 24.5, 37.6, 0.3]). The two recipe rows left the exhaustive-recipe test's missing list (that test still fails on other ids, as before).
- Frames viewed: CB1 and CB3 (identical PNG): small 2 by 2 grid, thick orange route up then right, orange target point, grey start square, texts above and below; CB2: tree with root dot, 3 + 6 branches, leaves 12 13 21 23 31 32, two title lines; CB4: (x + 1)^1 with two touching bars, labels 1 and 1, x^1 x^0.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the combinatorics example cards ..." failed with ENOENT on `src/images/learning/examples/combinatorics/manifest.json` (PNG directory moved aside for the run, restored after).
- OPEN: after that moved-aside run, `node_modules/.vitest-cache` holds a glob without the PNGs, so the preview test ("publishes the combinatorics example cards ...": preview undefined) and `mathAltText.test` ("/sl expected undefined to be defined") fail now. Per the handler message the cache was not deleted; it needs a fresh cache (or the publish run) before those two pass. The rest of `src/learning/chapter` passed (241 of 243).
- Label pass (graph-owned, text and what it touches):
  - lattice-paths-and-pascal and pascal-identity: "cilj (2; 2)" and "izbrana pot: GGDD" stack close but clear, left of the target handle, no touch; "zacetek (0; 0)" below the origin square, clear. Nothing touches a handle or line.
  - counting-and-choices: "list drevesa = ena izbira" and "Variacije: n = 3, k = 2" are adjacent lines with almost no gap (nearly touching, no overlap); the second ends left of the root dot; leaf labels 12 .. 32 sit under the branch ends, clear.
  - binomial-theorem: the left "1" sits on the left bar (the bar covers it); the right "1" touches the top of the right bar; "x^1" and "x^0" are close but do not touch; "(x + 1)^1" clear. The two bars (n = 1, 1.5 units apart) touch.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/combinatorics/`.

## Label pass (handler 20)

- Binomial-theorem card (`LatticePathGraph.tsx`, `barLabels`, `barStrokePx`): bar and label metrics in pixels. Bar thickness at most 10 px and at least 6 px gap to the neighbour (card pitch 16 px); coefficient labels sit 6 px above a bar (below a negative one) in the first of 3 rows where they touch no bar, power label or earlier label, under height 20.8; a label that fits no row is not written (readout and status carry all coefficients). Power labels are written every k-th (always including x^0) when `x^12` and its neighbour would not fit the pitch. Card n = 1: both "1" clear of the bars, bars apart, only x^0 written (x^1 dropped at the card scale); 1366 n = 1, 6, 12 all labels written, all clear; 390 n = 12: x^12, x^10, x^8 ... every other power, some coefficients on a second row.
- Capture race found: a stroke change makes the browser animate stroke-width, and the card capture reads the stale 14 px; so the default thickness is 10 px (no change needed at the card pitch).
- Counting card (`CountingTreeGraph.tsx`): the title row is 24 px under the first caption row (4 px gap) at any scale.
- Tests: `LatticePathGraph.test.tsx` "expansion board texts" (3 scales x 4 states), red before the fix (red.log), green after; `CountingTreeGraph.test.tsx` "tree captions" (2 scales), red (red2.log), green.
- OPEN: at 390 the counting title ("Variacije: n = 3, k = 2") reaches under the root dot (pre-existing, slightly closer now); the two expansion captions wrap and overlap each other and the "(x + 1)^n" title at 390 (pre-existing, not in the defect list). Not run: `just lint`, `src/learning/chapter` unit run, `guidedExamplePreviews` stale-glob edit. tsc passed (tsc.log), `src/graphs/combinatorics` unit passed (green2.log).

## Label pass follow-up

- Counting tree (`CountingTreeGraph.tsx`, `captionsAtTop`): the two caption rows stand in pixels from the top edge when the board has room above the root dot (6 px margin, 24 px pitch, dot radius); on a short board (390: 38 px above the dot) they stand under the leaf numbers, from the bottom edge. Card, 1366 and 390 all clear of the dot and branches.
- Expansion captions (`LatticePathGraph.tsx`, `captionStack`): the caption is written line by line, wrapped to the board width (at most 60 characters a line: the card capture hides a longer board text) in a stack from the top edge, the "(x + 1)^n" title under the last line; the coefficient ceiling and the y tick numbers (`defaultAxesAttributes`, `covered`) follow the stack. Font 15 -> 13 px.
- Tests (board sizes set through the element size shim): `LatticePathGraph.test.tsx` "expansion captions" (600x400, 360x295, 420x320) red with wrapping off, green; `CountingTreeGraph.test.tsx` "tree caption placement" (600x400, 360x295, 840x520) red before the change at 360x295. The old "inside the view box" text check now compares with the board's own top edge.
- Recaptured `--family combinatorics`; the guidedExamplePreviews comment edited (stale glob). Unit `src/graphs/combinatorics src/learning/chapter`, tsc and lint pass (logs in `.command-logs/label-pass/combinatorics/`).
- Remaining: at 390 and 1366 the y axis line runs through the expansion caption text; the 4-row stack (very narrow boards) would meet the bar tops. Preview 4519 stopped.

## Label pass follow-up 2

- Expansion (`LatticePathGraph.tsx`, `barLabels`, `captionStack`, `captionLeftPx`): power labels stand 5 px under the foot of their bar (the baseline, or the end of a negative bar), clear of tick numbers; thinned only where their pixel box (7 + 5 per digit px) would meet an already written one, x^0 first. n = 1 writes both at the 840 card (bars 12.5 px apart on the 2x card board), 390 and 1366. The caption stack starts right of the y axis (6 px) and breaks after "; " (whole clauses, at most 60 characters; a clause wraps by words only when the board is too narrow); font 13 -> 11 px; the y tick numbers hide only where the stack really covers them.
- Tests: `LatticePathGraph.test.tsx` "expansion power labels and caption stack" (3 board sizes, powers at n = 1..3 within 3 to 10 px under the baseline, stack right of the axis, whole clauses) red (red3.log, 6 failures), green; the 420 x 260 card board test red with the old 8 px + 3 box (red4.log), green. The old box formula in "expansion board texts" now 7 + 5 per digit.
- Recapture, 1366/390 at n = 1, 6, 12 viewed. Remaining: at 390 n = 12 the power labels touch (pitch 13.6 px); 390 y axis no longer crosses the stack. Unit, tsc, lint pass (unit7, tsc7, lint7 logs); port 4519 closed.

### Handler 21 review

- Accepted with one open item: at 390 px and n = 12 the power labels stand side by side and touch ("x⁹x⁸x⁷…"). The thinning estimate (`POWER_X_PX` 7 + `POWER_DIGIT_PX` 5 per label) is below the drawn width (about 15–16 px against a bar pitch of about 15.6 px). A wider estimate would drop "x¹" on the n = 1 card, where the text renders smaller; the fix is to thin from measured text widths (the drawn text's bounding box) rather than an estimate.

## F4 cards (Batch C)

- Added `combinatorics.row-sums.counting-tree` (CB5 first scene: row view, n = 4, k = 2, t = 0,5). Inventory: `combinatoricsRowExpectedFor` (section `row-sums`, asserts exactly one `set-row`), authored from `buildRow`/`barData` (three curves, no point; bar heights 1.5, 6, 9, 6, 1.5). Passed the capture checks on the first attempt. The four earlier PNGs are byte-identical (same sha256 in the capture log); the manifest gained the fifth entry.
- Pre-PNG failure (`.command-logs/comb-c/f4/red.log`): "publishes the combinatorics example cards ..." deep-equal of 4 against 5 ids. After the capture the unit run saw a stale glob until the comment in `guidedExamplePreviews.ts` was edited again (cache not deleted).
- Frame viewed (840x520): board text is left of centre. Title "Vrstica 4 Pascalovega trikotnika", orange "izbran k = 2: (4 nad 2) = 6", five thick bars (green, orange tallest third), baseline running right, numbers 1 4 6 4 1 under the bars (staggered rows), place numbers 0 1 2 3 4 below. All five bars and the row numbers are inside the card and readable. The long weight caption is hidden at card size (catalog text policy).
- Crowding (graph-owned, not fixed): the "k = 2" label above the orange bar overlaps the "izbran k = 2" line and touches the bar top; the bars are crowded in the left third, wide strokes touch each other.
- Checks: unit `src/learning/chapter` + familyChapters, scripts tests, tsc, lint, rawcheck passed (logs in `.command-logs/comb-c/f4/`). Preview 4523 stopped.

## Row view layout (handler 32)

The row view of the counting tree spaced its bars at a fixed 1.15 (made for n = 20), so rows 4 to 8 filled the left fifth of the board, and the chosen bar's "k = ..." text sat 0.3 units above the bar top, inside the round cap (7 px) and, on a phone board, against the "izbran k = ..." caption.

- Spacing: `rowStep(n) = min(6, 22.6 / max(n, 1))`, bars from x = 0.9 to 23.5 (`barX(index, n)`). n = 20 gives 1.13 (was 1.15); the cap 6 keeps a row of 1 or 2 bars from stretching. The baseline ends 0.7 past the last bar (at most 24). Row numbers go on one level when the widest one (0.55 em per character estimate, 13 px) fits the pixel step, otherwise on two levels as before.
- Label: at the bar top plus (7 px cap + 4 px margin) in pixels. `BAR_HEIGHT` is 9 -> 8 so the tallest bar, cap and label (about 27 px) stay under the "selected" caption on a 295 px high board. A first attempt that shrank the bars with the board's unit failed the capture's presentation-geometry check, so heights stay unit-free.
- The card's window is wider than the view box, so the n = 4 row occupies the left 60 % of the new card (bars at 0.9 to 23.5 in a window of about -4.8 to 34.5); the "k = 2" text now stands clear above the cap and the row numbers are on one level.
- The other four cards are byte-identical (sha256 checked). The catalog `counting-tree` recipe sets n and k on the choices view, so it is unaffected.
- Evidence: `.command-logs/comb-c/rowlayout/` (red.log: 4 failures on the old code; unit.log, tc.log, lint.log, capture.log).
