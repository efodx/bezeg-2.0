# AB-B-2a1: D2 clipping graph core

Handler 63, 2026-11-06. Two Sonnet medium workers: the first hit its 135k budget at turn 35 with the core and view tests written, the second finished from its note. Source: the [Batch B plan](../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06) and spec D2.

## Delivered

- `BezierClippingGraph` on `TraceCurvePairGraph`: state `clipToleranceExponent`, the run memoised on points and tolerance, overlays `fatLine`, `kept` and `discarded` as a fixed six objects.
- `bezierClippingView.ts`, pure: the step view, alive and discarded ranges, the fat-line strip.
- Preset collection `compgeo-bezier-clipping`.
- Lesson operations `load-model` and `set-clip-tolerance`, which any other point-set graph refuses. `load-model` exists because `set-points` allows whole numbers only.

No route, controls, inset or table: AB-B-2a2 and AB-B-2b. No existing Preset key, route or stored format changed.

## Findings settled

- **The brief was wrong about `discard`:** the kernel emits it with the pre-clip ranges, not post-event ones. The view takes pre-clip ranges from the previous fold, which gives the same values, so nothing changed.
- **Stale drawing, checked and clear:** overlays read `this.clipState` rather than their `model` argument. `redrawOverlays` receives `this.state.model` and a figure scene writes through the same state, so the two cannot differ.
- **Handler repair:** two needless casts in `applyPointSetAction` removed.

## Checks

On the final tree, handler: `just typecheck` and `just lint` passed; `just unit` of the clipping, hulls, `learning/runtime` and localization paths passed, 413 tests and 1 skipped. `just check` has not run; hosted CI is the first full run.

| Mutation | Observed failure |
| --- | --- |
| `runSettingsKey` dropped | 2 host tests (figure capture, memo) |
| Pre-clip range from the payload | 5 tests, all in `bezierClippingView.test.ts`; no host test catches it |
| Tolerance write without `step: 0` | 3 tests |
| Preset without tolerance keeps the current value | 1 test |

## Open

- A curve of one NaN point works on the real JSXGraph path, under `installBoardShims` in jsdom. Rendering is unverified until a browser pass.
- A dashed grey discarded B lies over the dashed B curve, so the coloured dashes may show through. Check in the AB-B-2b browser pass.
