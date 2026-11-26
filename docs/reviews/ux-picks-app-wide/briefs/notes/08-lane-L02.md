# 08 lane L02: bspline-extraction (done)

Base class is plain `BaseGraph` (not BaseCurveGraph). About 25 minutes.

- Parity recorded first (`__parity__/bspline-extraction.json`, 7 states via setters under `runAs('learner')`), `SAMPLES` entry plus `extractionAccepted` (one `extra` note: the readout help `bse_help`, which the old panel showed without a readout marker).
- Graph: `BSplineExtractionIds` (notes `count|affected|none|piece-N`, legend `control|piece-N`, no params/actions), `declaration()` (notes from `pieceNotes()`, `readoutHelp`, legend, memoized marks: control points must, curve samples nice), `drawnObject`. The old panel is kept inside `data-declared-panel` (hidden when declared, same text rendered from `pieceNotes()`), because a converted graph with no captions otherwise fails the recorder's "every state changes a shown value" test (the point-set pattern). The "open as Bezier" buttons are host-dependent and stay visible in Orodja in their own group (lesson test reads `button[data-action=open-as-bezier]`).
- Fragment `bspline-extraction.ts`: `bse_piece_row_changed` (one message per changed piece row), `bse_legend_piece`.
- Frames: observation frames highlight `count` (steps 1, 5, 6), `piece-1`, `piece-2` (step 2), `affected`, `piece-1`, `piece-2` (step 4). Never an explanation frame (steps predict).
- Tests: own graph test reads the declared notes instead of DOM; new `BSplineExtractionGraph.declaration.test.tsx` (7 states, language switch).

## Placement
No pucks and no declared parameters: the lesson interaction is dragging points on the board (points are board-owned). Example choice (setup, replaces the whole scene and Reset target), Reset, point list and knot editor stay in Orodja. Legend default place not judged against data in a browser.

## KnotEditor
Unchanged: it takes `knots` and `onEdit` only, so nothing needed to change for the other B-spline lanes. Tests of every user ran green via `just unit src/graphs/curves`.

## Red check
Count note `pieces.length + 1`: `AssertionError: expected 'Število odsekov: 3 (različni notranji…' to be 'Število odsekov: 2 (različni notranji…'`. Reverted.

## Dead code
`pieceReadoutLines` in `bsplineExtractionModel.ts` is now unused (the graph builds messages); left in place, handler may delete.

## Checks
graph-check PASS (contract, parity 2, golden, declaration 8, shared 120); `just unit` on curves, lesson test, OpenAsBezier, presets, declarationContract, localization, declare, lessonMathNotation passed; typecheck, lint, build passed; `just smoke-lesson bspline-extraction --port 4391 --workers=1` passed. Not run: browser probe/fuzz, visual look at the board cards.
