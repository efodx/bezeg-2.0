# CG-B3-2a and 2b: curve-offset graph and registration

Spec: [L5](../../specs/curve-geometry-lessons.md); tasks: [curve geometry](../../tasks/curve-geometry/README.md). Route `/bezeg-2.0/curve-geometry/offset`, `lesson: false`, poster pending. Written by curves handler 53 on 2026-11-05 from [handoff 52](../feature-streams/curves/handler-handoff-52.md).

## Accepted work

| Commit | Work |
| --- | --- |
| `ce47d414` | Review fix: `cuspParameters` finds cusps in the end sample intervals and on the first sample |
| `4c4f7581` | Graph: `CurveOffsetGraph.tsx`, `OffsetOverlay.ts`, `SpeedFactorPlot.tsx`, Preset collection, six lesson action targets, localization |
| `4f0ee683` | Graph tests |
| `ad3249aa` | Registration, recipe added but not run |
| `00718241` | Smoke fix: the caption's notes leave a narrow board |
| `9b657f8c` | `scripts/offset-gate-perf.cjs` |

## Decisions

- **Plot:** an inspector SVG written imperatively through `SpeedFactorPlotController`, so a drag renders no React. Settled by the measurement below.
- **Narrow board:** under 24 font sizes of board width, the caption shows only \(d\) and the cusp count, because the two notes wrapped onto the lines below them at a fixed pitch and covered the cusps. Acceptance 3 still holds there: the inspector always states both notes, and the live region keeps the whole text.
- **One PH offset curve,** so `ph-bezier-curve.ts:131`'s `(i+1)*d` equals \(d\). Graph state `offsetD` is the source of truth over a Preset's stored `d`.
- **Terms:** vzporednica for the offset on this graph, including the exact PH one; ost for cusp; faktor hitrosti for \(1+d\kappa\). PH routes keep "odmik".
- **Acceptance 4's** local-cusps note is in the inspector (`offset_local_note`). L5's prose must say it too.

## Checks

- `just check` on `9e456fde`, the commits above before the smoke fix, rebased on `e2a29a8a`: `EXIT=0`, 1173 s, 11600 tests passed, 4 skipped.
- `00718241`: `src/graphs/curves/offset`, `GraphTransientState` and `lessonRestoration`, 1210 passed; tsc; ESLint; production build. The new test fails with the width rule disabled.
- Engineering and UI review, Sonnet, read-only: no high or medium finding. Two low notes stand: a cusp tick at \(t=0\) or \(t=1\) sits on the plot's edge, and `dispose` does not clear the plot, which shows no stale frame.
- Mathematical review of the kernel: closed in handoff 52.

## Browser check

Production preview at 1440×900 and 390×844, Slovenian and English, no page errors. The 390×844 walk was reduced: no drag or Reset there.

- Passed: board size, plot look and updates, \(d=-1\) with two cusps at \((\pm0.225, 0.941)\), \(d=-\tfrac12\) with one cusp at \((0,\tfrac12)\), no cusps at \(d\ge0\), kind switch and its view, control point drag, Reset, keyboard on sliders and switches, sample limits, language switch mid-state, catalog card.
- Failed, then fixed: the caption at 390×844. Rechecked on `9b657f8c` in Slovenian at both viewports and in screenshots; English shares the width rule and has shorter notes, and was not rerun.
- Not run: the poster recipe.

## Measurement

`node scripts/offset-gate-perf.cjs` on a production preview of `9e456fde`, Chromium 156 headless, 1440×900, 3 runs per case, 150 steps over 2 s, starting at \(d=-1\) with cusps on. Other sessions were using the machine, so read the throttled drops as an upper bound. The frame median was 16.7 ms in all 16 cases.

| Gesture, samples, plot | Frame p95 ms | Frames over 25 ms per run | Update median ms | CPU/4: frame p95 ms | CPU/4: frames over 25 ms | CPU/4: update median ms |
| --- | --- | --- | --- | --- | --- | --- |
| Control point, 128, off | 16.7 | 0/0/0 | 1.95 | 16.8 | 11/6/5 | 9.55 |
| Control point, 128, on | 16.8 | 0/0/0 | 1.95 | 33.3 | 31/40/6 | 10.05 |
| Control point, 512, off | 16.7 | 0/0/0 | 1.90 | 33.3 | 46/16/74 | 11.75 |
| Control point, 512, on | 16.7 | 0/0/0 | 1.60 | 33.3 | 103/35/71 | 10.10 |
| \(d\) slider, 128, off | 16.8 | 0/0/0 | 1.70 | 16.8 | 2/1/0 | 9.80 |
| \(d\) slider, 128, on | 16.7 | 0/0/0 | 2.00 | 16.7 | 3/0/0 | 9.70 |
| \(d\) slider, 512, off | 16.8 | 0/0/0 | 2.50 | 16.7 | 0/2/1 | 12.80 |
| \(d\) slider, 512, on | 16.8 | 0/0/0 | 2.60 | 16.8 | 2/9/1 | 13.80 |

At normal CPU nothing dropped, with the plot on or off. Under CPU/4 only the control point drag strains, and only with the plot or the maximum sample count; the default 128 samples with the plot off holds. The plot's cost does not justify another design.

## Known limits

- **No PH board point drags,** on this route or on `/ph/cubic`, where the hodograph changes the shape. A real mouse drag moved none of \(p_0\) to \(p_3\) on either route. Handoff 52's "only the base point drags" was wrong. This graph has no hodograph board, so its PH curve is fixed.
- A PH Preset with no `boardState` opens on the parabola's view, so the PH curve is off screen. Lesson scenes should set a `view` or use the `offset-curve` action.
- More than 8 cusps: markers are capped, the readout count stays true.
- A stored `offsetD` of 99 stays in state; the board and slider use the clamped value.
- `reset()` reloads the selected Preset, so it returns to the parabola only when none is selected.
- The plot breaks at out-of-range samples rather than clipping at the frame.
- `scripts/generate-guided-example-inventory.cjs` has no offset entries; L5's registration must add them.
