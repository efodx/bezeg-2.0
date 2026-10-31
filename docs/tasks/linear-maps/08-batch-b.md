# 08 Batch B: eigen and ellipse (ADR, F2a–F6, `G-REG`)

Spec: L3 and L4; decision 3. Uses task 02. Split into worker slices at dispatch: ADR 3, eigen mode, ellipse mode, lessons L3–L4 with chapter update, media, acceptance.

- **ADR (handler):** eigen-direction predicate. The spec works with option (c): continuous test vector with `EIGEN_PARALLEL_TOLERANCE`, a "snap \(v\) to the eigen-direction" action, and exact \(\det(v,Av)=0\) only on quarter-grid \(v\). Decide after trying drag feel in the eigen mode.
- **F2a eigen mode:** test vector on the unit circle (angle slider and drag), \(Av\), "approximately parallel" indicator showing the sine, eigen-direction lines when real, discriminant and eigenvalue readout including complex values as text, example chooser.
- **F2a ellipse mode:** unit circle and its image from `singular`, labelled axes, dashed eigen-directions, conic toggle for the symmetric part only (status when not positive definite), \(\sigma_1,\sigma_2,\det\) readouts, symmetric status, segment/point and circle cases, view keeps the ellipse in frame. Drawing follows task 04's ADR; re-measure with the ellipse if that ADR left it open.
- **F3–F6:** L3, L4 lessons and chapter update, media, Batch B gate and smoke.
