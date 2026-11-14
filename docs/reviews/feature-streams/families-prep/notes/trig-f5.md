# Trigonometry F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter trigonometry`, four entries; `expected` authored from `trigUnitCircleGuidedLessons.ts` / `trigTriangleGuidedLessons.ts` first scenes and from `UnitCircleGraph.tsx` / `TriangleSolverGraph.tsx` build code (`trigonometryExpectedFor`). First attempt asserted five segments at angle 0; the capture saw four (the zero-length sine leg is not drawn); the expectation was corrected with that reason.
- Recipes added for `unit-circle` ([-1.6, 3, 8.3, -3.1]) and `triangle-solver` ([-1.5, 7.2, 16.5, -3.9]); both leave the exhaustive-recipe test's missing list.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the trigonometry example cards ..." failed with ENOENT on `src/images/learning/examples/trigonometry/manifest.json`; passes after capture.
- Frames viewed: TR1 circle with orange point at (1, 0), blue radius, green sine trace from 1.7; TR2 at 30 degrees with cross, plus and diamond mirror images and dashed link; TR3 and TR4 identical triangle plus two bars and correction text (no axes).
- Alt text avoids `\sin`/`^2` LaTeX (mathAltText cannot render them) and states no first-step answer.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/trig-f5/`.
