# f2a-trig-05 final evidence (triangle solver graph)

Files (uncommitted): `src/graphs/trig/TriangleSolverGraph.tsx`, `TriangleSolverGraph.test.tsx` (14 tests), 56 `triangle_solver_*` keys after `unit_circle_status` in `sl.ts`/`en.ts` (CRLF kept, lockstep), term rows in `docs/tasks/trigonometry/README.md`. No route, no host or kernel change.

Notes on the inputs: the earlier "settled" locale drafts (`/tmp/*_block.txt` and `.command-logs/trig05-*_block.txt`) held `unit_circle_*` lines, not triangle text, so I wrote the 56 keys from the keys the component uses (script `.command-logs/trig05_ins.py`). The task 04 README row had three rows glued together with `||`; I split them. Keyboard help names the up and down arrows (NumberInput steps on ArrowUp/Down and PageUp/Down only).

## Checks (observed)
- `npx tsc --noEmit --pretty false`: exit 0, no errors at all.
- `just unit src/graphs/trig src/trig`: passed. `just lint src/graphs/trig`: passed. `just build`: passed (run before a test-only edit of one assertion).
- No trailing whitespace in own files (Grep ` +\r?$`).

## Mutations (each restored; `cmp` identical to the saved copy; logs `.command-logs/trig05-mut*.log`)
- drop `setVertex` in `dragTo`: drag snapping test failed.
- drop the `listeners.push` of the drag/over/out off-callbacks: 3 ownership/unmount/StrictMode tests failed.
- `HANDLE_TOUCH_RADIUS` 26 -> 10: touch hit zone test failed.
- `properNow` always true: collinear test failed (circle shown).
- side `a` measured as `|AB|` in `measureDrawn`: 3 tests failed (modes, SSA, other data types).
- draw only the first SSA triangle: SSA two-triangle and language tests failed.
- tangent branch disabled: SSA 3,5 / 4 test failed.
- bar correction text replaced by 0: sides mount and language tests failed.
- language-change registration removed: language test failed.
- `VERTEX_STEP` 1 -> 2: keyboard test failed.

## Drag measurement
JSDOM PLACEHOLDER, not a performance result; a browser measurement per docs/performance-plan.md is owed when the graph gets a route (task 06). Method: vitest/jsdom, 720 frames moving vertex C on a circle of radius 6,3 (snapped to the integer grid), `setPosition` plus `triggerEventHandlers(['drag'])` in `act`, timed with `performance.now()`. Revision 82beec19, dirty. Sides mode: median 0.012 ms, p95 1.91 ms. Circle mode: median 0.008 ms, p95 1.57 ms. The median is low because most frames snap to the same grid point and change no state; p95 is the frames that moved the vertex. Temporary test file deleted.

## Open question answered: bars versus a dragged triangle
Yes, they can overlap. Vertices are free integers and the view is fixed at `[-3, 12, 17, -8]`; the bars occupy x 9..15, y 2.4..4.4 (plus the correction label near y 1.4), so a vertex dragged there draws over them. No cheap fix: any fixed bar region is reachable, and moving the view or confining the vertices changes the graph contract. Left as is; the readouts and status carry the same numbers. Suggest the lesson/route owner decide (for example confine drag to x <= 8 or place the bars in a side panel).

## Open
- Not smoke-tested in a real browser (no route). Slovenian wording (SKS, KSK, SSK, sploščen trikotnik, popravek) is my choice, recorded in the README terms table; not reviewed by the owner.
- Spec/kernel doubts: none beyond the overlap above.

## Review repairs
1. Solve mode frames the drawing: `frameBoard`, `solveExtent`, `rayEnd` (TriangleSolverGraph.tsx); `fitBoundingBox` with equal axis scale, sides/circle return to `FIXED_VIEW`. The ray ends `RAY_OVERSHOOT` (2) past the largest c and the circle. Note: the spec example a=9, b=8, A=30 has one solution (a > b), so the test checks that one plus a two-solution case (a=11, b=12) and ASA 1/178/12. Mutation (frameBoard calls off): the two viewport tests failed.
2. Vertex limits `VERTEX_X_MIN/MAX`, `VERTEX_Y_MIN/MAX` (-2..8, -7..11), clamped in `dragTo` and `editVertex`, passed as min/max. `NumberInput` refuses (never clamps) a typed value outside min/max, so typing 12 keeps the previous vertex and shows the range hint; drag and arrow keys clamp (C dragged to x=12 gives 8). Mutation (clamps removed): clamp test failed.
3. Rebuild test calls a real `buildScene` (test subclass `rebuildNow`, via `initialize`) and asserts counts and one drag listener per new handle. Mutation (`disposeScene` at build start removed): failed.
4. One shared help paragraph (`triangle-solver-vertex-help`), every vertex field has `describedBy`. Mutation: a11y test failed.
5. Bar test reads segment y from the board; the dispose test asserts equality with the pre-mount count (labels excluded, since `setBoundingBox` makes the board create tick labels).
6. `triangle_solver_side_help` (sl "Stranica od 0,25 do 12.", en "Side from 0.25 to 12.").
7. Status two names B₁ (solid) and B₂ (dashed); tangent says right angle at B (both languages).
8. Solve rows join with "; " in sl, ", " in en.
Locale files and sources are LF in this worktree, not CRLF. Checks: tsc clean, `just unit src/graphs/trig src/trig`, lint, build passed, no trailing whitespace. Mutation backups: `.command-logs/trig05-orig-*.tsx` (cmp identical after restore).
