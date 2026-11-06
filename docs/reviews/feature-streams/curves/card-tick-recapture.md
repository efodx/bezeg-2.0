# Guided-example card tick recapture (handoff-v12)

Source: production preview of c3671955 at 127.0.0.1:4387. Every family was captured (generator and capture exit 0). Byte-changed PNGs were compared old vs new with a pixel diff (`.command-logs/pngdiff.cjs`, sheets in `.command-logs/sheets/`).

| Family | Captured | Byte-changed | Decision | Reason |
|---|---|---|---|---|
| retained (manifest.json) | 56 | 20 | kept | diffs are small patches (24-170 px) at tick-label rows and columns; the arc-length sheet was viewed and shows only decimal commas |
| school-function-graphs | 6 | 0 | restored | no PNG changed |
| advanced-bezier | all | 0 | restored | no PNG changed |
| curve-geometry | all | 0 | restored | no PNG changed |
| patches | all | 0 | restored | no PNG changed |
| projective-conics | all | 0 | restored | no PNG changed |
| numerical-methods | 3 | 2 | kept (recaptured again) | euler-method palette tied to 1d070aa9; quadrature ticks only |
| fourier-series | all | 1 | kept (recaptured again) | epicycles tied to acd8a40d |
| linear-maps | all | 2 | kept (recaptured again) | palette tied to 1d070aa9 |
| complex-maps | all | 1 | kept (recaptured again) | palette tied to 6c0c6a28 |

Trace (follow-up). Source revisions: numerical 25d3c102 manifest 2026-11-03; fourier e08b6457; linear and complex manifests 2026-11-01 (their sourceRevision is not in this repo).
- euler-method: 1d070aa9 "quiet graph grids" (docs/specs/graph-palette-refinement.md) added EULER_COLORS in EulerGraph.tsx: field #91a9b3 at 0.65 opacity, polyline blue, exact brown. Sheet: lighter slope field, same slopes, point and caption. Fits "y' = y" slope-field card. quadrature: ticks only.
- epicycles: card captured at e08b6457, before the lesson commit acd8a40d, so it showed the demonstration default. The card now opens on lesson scene F5 first step (circle, equal parametrisation, N=1, time 0: window about -2..2, unit-circle trace, one radius |c1| line). Fits the caption (circle of radius |c1|, trace for N=1). EpicycleGraph itself unchanged since 66b8dd45 (before capture).
- determinant-area, matrix-and-image: 1d070aa9 LinearMapGraph: LINEAR_MAP_COLORS (quiet blue grids, source/image curves, handles, square fill). Sheets: same geometry, grid, polygon, labels; only colours differ. Captions (a1, a2, det) unchanged.
- reciprocal-inversion: 6c0c6a28 "refine graph palettes" RECIPROCAL_COLORS (z blue, w lighter blue, conjugate/reciprocal/quotient/inversion colours and marker kinds). Same geometry.

Retained contact sheets (contact1-3 in .command-logs/sheets, old above new, diff row bands only): all 19 remaining retained images show only 0.5 -> 0,5 style tick labels. With arc-length, all 20 viewed.

Kept retained PNGs: the 8 analysis.*, bezier-curves.bernstein-form, 3 foundations.*, 8 functions-and-calculus.* (only 2 of 8 sampled visually; the rest verified by diff row pattern). The retained run rewrote manifest.json for all 112 entries.

Checks: `just unit src/learning/chapter` exit 0; `just tooling-test` exit 0. No test references examples/manifest.
Not verified: the Euler/epicycle commit intent is read from commit messages and diffs, not a design review.
