# Trigonometry F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter trigonometry`, four entries; `expected` authored from `trigUnitCircleGuidedLessons.ts` / `trigTriangleGuidedLessons.ts` first scenes and from `UnitCircleGraph.tsx` / `TriangleSolverGraph.tsx` build code (`trigonometryExpectedFor`). First attempt asserted five segments at angle 0; the capture saw four (the zero-length sine leg is not drawn); the expectation was corrected with that reason.
- Recipes added for `unit-circle` ([-1.6, 3, 8.3, -3.1]) and `triangle-solver` ([-1.5, 7.2, 16.5, -3.9]); both leave the exhaustive-recipe test's missing list.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the trigonometry example cards ..." failed with ENOENT on `src/images/learning/examples/trigonometry/manifest.json`; passes after capture.
- Frames viewed: TR1 circle with orange point at (1, 0), blue radius, green sine trace from 1.7; TR2 at 30 degrees with cross, plus and diamond mirror images and dashed link; TR3 and TR4 identical triangle plus two bars and correction text (no axes).
- Alt text avoids `\sin`/`^2` LaTeX (mathAltText cannot render them) and states no first-step answer.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/trig-f5/`.

## Label pass

- Defect: side names a, b, c were drawn on the side midpoints (line struck through the letter); on the 390 px board the "popravek" caption overlapped the B handle and the a2 / b2 names.
- Fix in `TriangleSolverGraph.tsx`: `sideNamePlace` moves each name from the midpoint outward (away from the opposite vertex) along the normal by a fixed 7 px gap plus the letter box half extent along that direction, computed from `board.unitX/unitY` so drags and resizes keep it. Bar names use pixel gaps (17 px) from the 8 px bars; the correction caption moved above the c2 name (21 px step), clear of the triangle and B at 390.
- Tests (`TriangleSolverGraph.test.tsx`): side names clear of their side and opposite the third vertex (default, obtuse, very flat); bar names and caption stacking. Observed red with midpoint placement and with the caption step reversed, green after.
- Vertex names A, B, C, "h" and the SSA labels were viewed at 1366 and 390 (sides mode) and showed no touching; solve/circle mode labels were not re-screenshotted, and no mouse drag was run (placement is state driven and unit-tested).
- Recapture: the two triangle-solver cards changed as intended; the two unit-circle PNGs differ in bytes only (manifest hashes), visually identical on viewing (capture noise, source untouched).
- Logs: `.command-logs/label-pass/trigonometry/`; preview on 4519 stopped.
