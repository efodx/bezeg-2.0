# CG-B2-2b: `curve-comb` and `curve-evolute` registration

Curves handler 47, 2026-11-05. Source: [task table](../../tasks/curve-geometry/README.md), [graphs evidence](cg-b2-2a-graphs.md). Routes `/bezeg-2.0/curve-geometry/comb` and `/evolute`, `lesson: false`, posters pending. No existing route or Preset changes.

## Defect found by registration

The evolute graph opened without its trace and without the "E" readout line. `ensureOverlay` creates the evolute overlay last, so the readout was computed before the overlay existed and the trace's function-valued visibility was never evaluated. Only a later board update drew them, which is why Preset import and Reset looked right. The shared Preset contracts caught it as soon as the route was registered: three failures in `GraphTransientState.part1` and `PresetCatalog`. Graph-level tests had missed it because they checked the trace's data, not its computed visibility.

The fix is a board update at the end of `createExtraOverlays`. A direct first-paint test now fails without it (mutation run: 1 failed, 9 passed).

## Decisions from the first browser look

- **Evolute opens at \(t=0.75\), not 0.5.** At \(t=0.5\), E sits on the cusp and the labels E, T and N land on one spot. Now \(E=(-\tfrac12,\tfrac54)\), \(\kappa=0{,}7071\), \(R=1{,}4142\). L4 sets its own \(t\) for the cusp step.
- **Evolute view `[-5.2, 5, 5.2, -1.2]`.** The old view let the trace's end touch the four-line readout, and left \(p_1\) at the board's edge.
- **Accepted:** at gain 6, C1 teeth run past the board and over the readout. That is the slider's extreme, and no tooth clips at default gain. The moving normal line can cross the readout. On a 390 px board the readout overlaps the curve.

## Browser evidence

Sonnet `bezeg-smoke` on a production preview of `6049cb07` plus these changes, 1440×900 and 390×844, Slovenian and English, no console or page errors. Handler viewed C1 at default and maximum gain, the cubic comb, and the evolute before and after the changes.

- Comb: off by default; all four curve kinds; comb state and gain survive a kind switch; tooth count 8 and 256; keyboard on the gain slider and switch; dragging a C1 point updates the readout.
- Readouts at default: C1 "Stik 1: … levo 1,3333, desno 0,6667, skok −0,6667"; C2 "levo 0,598, desno 0,598, skok 0"; G1 "Stik 2: … levo 0,1217, desno −0,1409, skok −0,2625". The jumps match the [graphs evidence](cg-b2-2a-graphs.md#evidence).
- Evolute: \(t=0.25\) and \(0.75\) give \(E=(\pm\tfrac12,\tfrac54)\), and \(t=0.5\) gives \((0,\tfrac12)\); three trace modes; normal switch; dragging a control point moves E.
- Catalogue: both cards under Geometrija krivulj without images; the evolute card opens its route.

## Not covered

- Reset in the browser (the worker did not find the control). Reset is unit-tested on both graphs.
- The comb card was not clicked.
- The smoke ran before the opening \(t\) and view change. The handler rechecked both opening scenes in the browser afterwards, without console errors; the 390 px view was not repeated.
- UI and accessibility review is still due with the first routed slice, per handoff 46.
