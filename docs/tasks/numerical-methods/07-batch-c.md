# 07 Batch C: direction field and Euler (measurement, ADR, F2a–F6)

Gates: `G-FN`, `G-REG`. Depends on 03 and on Batch B being released.

1. **Measurement first.** Follow the [performance plan](../../performance-plan.md). Drag the initial point and the step control with 21×15 and 41×29 field grids, and compare per-segment JSXGraph objects, one polyline-array curve, an overlay canvas or SVG, and a coarse grid. Record frame times and the threshold used in `docs/reviews/numerical-methods/`. Then write an ADR that cites the measurement. No drawing code is merged before the ADR.
2. **F2a:** the direction-field and Euler Demonstration with the chosen approach. It has a draggable or numeric initial point, discrete `h`, an end-value readout, an optional exact curve, and an optional step reveal through `IterativeFunctionGraph`-style playback. A divergent run shows a visible status. Every generated field object is disposed.
3. **F2b:** route, catalog entry and registration.
4. **F3:** lesson N5. **F4:** add N5 to the chapter. **F5:** media.
5. **F6:** the Batch C gate: interactivity within the measured threshold, the lifecycle tests, `just check`, smoke in both languages, and CI.

If the measurement misses the threshold on the target device, stop and report to the owner before release.
