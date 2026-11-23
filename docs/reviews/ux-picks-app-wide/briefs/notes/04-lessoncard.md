# 04 lesson card fixes: done except remaining failures (worker 3)

Logs: docs/reviews/ux-picks-app-wide/smoke/04-lessoncard-*.log (unit3 = full unit, eslint2, build9, full2 = full guided-lessons spec, rerun3, bisect1, 108, exp7).

## Done (all uncommitted)
- Earlier slices: cardFolded prop, holdHeight, free-card cut, measureCards min/keep/pinned, CSS flex chain, MutationObserver (see git diff).
- Anchor rule: boardLayout.ts free-card block uses a frame-independent sliver (`CardInput.anchorMin`, else head + bar + `FREE_MIN_BODY` 50) for the y clamp and as the cut floor; measureCards.ts measures `anchorMin` = bottom of the `data-card-keep` row + pinned + bar. Unit tests in boardLayout.test.ts (fail before). 03-layout-design.md rule 7 updated.
- BoardCards.tsx: held lesson height is state (derive-during-render), eslint react-hooks/refs fixed.
- Test 108 rewritten: viewport 1100x380 (no CSS zoom: the card is measured in zoomed px, the board in CSS px), requires `.board-card-more` visible, scrolls `#board-card-lesson [data-card-scroll]`, same hide/reopen assertions.
- Row 3160 `locked === false`: consistent with 04-design (line 10 and slice 3 line 84 drop the lesson locks); section 9 itself does not mention locks.

## Results
unit (workspace, learning/runtime, graphs/base) passed; eslint on changed files clean; build passed. Full guided-lessons spec: 322 passed, 18 skipped, 4 failed.

## Remaining failures
1. interp-runge sl desktop, points offscreen at step 4 (task 07, expected).
2. phase-portrait-linearization sl desktop (new, repeatable): step 3 the puck strip ("Matrika A" pucks) overlaps the lesson card and covers Next (60 s timeout). Not caused by the keep/min change (bisect1: still fails with min reverted); baseline at HEAD not checked.
3. rational-elevation and rational-subdivision en 390x844: board labels intercept Next (phone, task 09 family; not in PHONE_WALK_BROKEN).
