# P1 evidence: point rule modules

Files: `src/graphs/base/points/{placement,viewPolicy,dragConstraint,pointKeys,pointFactory,index}.ts` plus a `*.test.ts` beside each of the five modules.

Signatures
- `placeNewPoint(points, {at?, rule?, limit?: {max}}): Point2`
- `isOutsideView(box, framed): boolean`, `refitWhenOutside(box, framed, refit): boolean`
- `constrainPoint(raw, {step?, bounds?: {x?, y?}}): Point2`, `stepPoint(point, delta, options): Point2`
- `pointKeyCommand(event, {step, bigStep?, axes?}): {kind:'move',dx,dy} | {kind:'remove'} | {kind:'back'} | undefined`
- `createMovablePoint(board, coords, attributes): JXG.Point`

Checks (observed)
- `just unit src/graphs/base/points`: 5 files, 26 tests passed. `just typecheck` and `just lint src/graphs/base/points` passed.
- Mutations (each made the focused test file fail, then reverted; files re-verified green):
  - dragConstraint: bounds ignored (`if (!bounds) return v` made unconditional).
  - viewPolicy: `x < xMin` changed to `x <= xMin` (edge point counted outside).
  - pointKeys: Shift ignored.
  - placement: `>` changed to `>=` on limit.
  - pointFactory: cursor binding removed.

Notes
- Clamp keeps the grid: a bound off the grid moves to the nearest in-range grid value; if none fits, the raw bound is used.
- Snap and bound arithmetic is cleaned to 12 significant digits to avoid float noise.
- Not verified: no real JSXGraph board (fake board only); no callers yet.
