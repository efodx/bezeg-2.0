# 5. PH auxiliary-board lifetime: evidence

Source task: [05-ph-auxiliary-board.md](05-ph-auxiliary-board.md). Recorded 2026-11-01 (platform stream, worker for A5), uncommitted at time of writing.

## Inventory before the change

| Concern | Owner at HEAD |
|---|---|
| Board creation (`JSXGraph.initBoard`), size gate, resize, `freeBoard` | `HodographInputBox.tsx` (view), bypassing `GraphSession.createAuxiliaryBoard` |
| Resize observer | the view |
| Parent link (`addChild` / `removeChild`) | `BasePhBezierCurveGraph` (`initializeHodographs`, `setHodographBoard` cleanup, `disposeHodographBoard`) |
| `w` point creation and `ModelPointBinding`s | `BasePhBezierCurveGraph.initializeHodographs`, plus a second, never removed `drag` listener |
| Release | two paths: the view's unmount (frees the board) and `disposeHodographBoard` / session cleanup (bindings and link only) |

## After

`AuxiliaryBoardLifetime` (`src/graphs/curves/ph/AuxiliaryBoardLifetime.ts`) owns creation through `GraphSession.createAuxiliaryBoard`, the resize observer, the parent link, adopted resources (the bindings) and one idempotent `release`, also run by the session. `HodographInputbox` only hands the live host element to the graph and calls `release` on unmount. `JXGPHBezierCurve.bindHodographPoints` creates the `w` points and their `ModelPointBinding`s, as main-board points are bound (ADR 0006). The graph keeps the PH mathematics, the transient hodograph view (ADR 0015) and the arc-length text.

## Deletion test

Delete the module: observer, parent link, binding release and board freeing return to the view and the graph, in two places each. The view no longer knows boards, observers, styles or bindings; the graph no longer tracks bindings, the session cleanup handle or the link.

## Defect reproduced and fixed

- **StrictMode remount of a PH graph threw:** `removeArcLengthText` removed the retained readout from the freed board (`renderer` undefined), so a mount, unmount, mount of the same graph instance failed in `importPresetData`. Reproduced by the StrictMode sequence in `PhAuxiliaryBoardLifetime.test.tsx` (`TypeError ... 'suspendRedraw'`, cubic and quintic) before the guard was added. Production builds do not run StrictMode, so users were not affected; development was.
- A suspected double disposal of the hodograph board was not reproducible: at HEAD the board was freed only by the view; the scene path never freed it (it left a dead board until the inspector re-keyed it).

## Verification

Graph-level sequences (cubic and quintic): hide/show, Preset replacement, language redraw, unmount, StrictMode remount. Each counts boards, parent links, observed hosts, model-point listeners and `up` handlers. Mutation (no parent-link removal plus non-idempotent release) fails 11 of 22 tests in `src/graphs/curves/ph`, in both graph-level and module tests.
