# Functions/projective review handoff

## Status

The assigned preview at `http://127.0.0.1:4324/bezeg-2.0/` was reachable in Chromium (HTTP 200). The landing page did not mount a graph; direct lesson routes did. Reviewed the frozen app snapshot named in the brief. All 14 assigned lessons opened, mounted `#jgbox > svg` at 1002×660 with visible paths, and reached their terminal lesson scene. Captured every frame (252 scene screenshots total) and inspected opening, midpoint and terminal scenes for every lesson on contact sheets. No browser remains open; each capture script closes Chromium in `finally`. The handler owns server cleanup.

## Findings for the pending report

1. **High confidence, weakest:** `/analysis/euler-method`, opening step 1 frame 1, midpoint step 4 frame 1, terminal step 7 frame 2. The repeated oblique slope glyphs cover nearly the entire cream board. Their muted sage is close to the solid green solution trajectory, so the field becomes the dominant texture and competes with the green estimate and blue dashed Euler trace. Recommend a much paler, less saturated field with more spacing; retain higher contrast for the two solution traces. Evidence: `evidence/functions/euler-method-opening.png`, `euler-method-middle.png`, `euler-method-terminal.png`; full workspace context: `euler-method-workspace.png`.

2. **High confidence:** `/projective/pascal`, opening step 1 frame 1, midpoint step 4 frame 1, terminal step 7 frame 2. Several solid and dashed orange construction lines overlap the ochre points and small green conic; the blue Pascal line competes with them. Reusing the same strong orange for many secants removes a clear focal line and makes the construction feel visually busy. Recommend reducing the auxiliary lines' saturation/weight and keeping the highest emphasis for the Pascal line and six defining points. Stronger same-topic reference: `/projective/pole-polar`, whose green conic, blue polar and quieter ochre tangents read as separate roles. Evidence: `projective-pascal-opening.png`, `projective-pascal-middle.png`, `projective-pascal-terminal.png`; full workspace: `projective-pascal-workspace.png`; reference images: `strong-projective-pole-polar-opening.png`, `strong-projective-pole-polar-middle.png`.

3. **Moderate confidence, mild preference finding:** `/analysis/fourier-coefficients`, opening step 1 frame 1, midpoint step 7 frame 2, terminal step 14 frame 2. The sign-colored product regions, dotted base function, blue dashed harmonic and ochre endpoints give the opening scene several similarly muted layers. At the terminal scene, three nearby blue, green and ochre curves cross and compete even though the graph legend assigns them meanings. Recommend slightly lighter fills and stronger luminance separation between the primary function and approximants, preserving the spectral color mapping. This is an aesthetic hierarchy concern, not a functional problem. Evidence: `fourier-coefficients-opening.png`, `fourier-coefficients-middle.png`, `fourier-coefficients-terminal.png`; full workspace: `fourier-coefficients-workspace.png`.

Stronger references inspected full-size: `/functions/transformations` opening (a forest curve with one ochre point) and `/projective/pole-polar` opening/middle (green conic, blue polar, quieter ochre tangents). See `strong-function-transformation-opening.png` and the pole-polar images above.

## Coverage

| Lesson | Route | Opening · midpoint · terminal | Captured frames |
|---|---|---|---:|
| Function transformation | `/functions/transformations` | 1.1 · 4.1 · 7.2 | 14 |
| Function inverse | `/functions/inverse` | 1.1 · 4.1 · 7.2 | 14 |
| Polynomial zeros | `/functions/polynomial-zeros` | 1.1 · 4.1 · 7.2 | 14 |
| Rational function | `/functions/rational-functions` | 1.1 · 4.1 · 7.2 | 14 |
| Root finding | `/analysis/root-finding` | 1.1 · 10.2 · 20.2 | 40 |
| Quadrature | `/analysis/quadrature` | 1.1 · 4.1 · 7.2 | 14 |
| Euler method | `/analysis/euler-method` | 1.1 · 4.1 · 7.2 | 14 |
| Fourier series | `/analysis/fourier-series` | 1.1 · 7.1 · 13.2 | 26 |
| Fourier coefficients | `/analysis/fourier-coefficients` | 1.1 · 7.2 · 14.2 | 28 |
| Projective cross-ratio | `/projective/cross-ratio` | 1.1 · 4.1 · 7.2 | 14 |
| Projective Pascal | `/projective/pascal` | 1.1 · 4.1 · 7.2 | 14 |
| Projective pole-polar | `/projective/pole-polar` | 1.1 · 4.1 · 7.2 | 14 |
| Projective five-point | `/projective/five-point` | 1.1 · 5.1 · 9.2 | 18 |
| Projective three views | `/projective/three-views` | 1.1 · 4.1 · 7.2 | 14 |

Contact sheets for all routes are `evidence/functions/functions-contact-1.png` through `functions-contact-3.png`. Screenshots temporarily hid only `.guided-lesson-layer` during capture, then restored it before frame navigation; graphs were not recolored or otherwise changed. Full-page context screenshots use the same overlay hiding. Desktop only; no mobile, accessibility, full interaction or technical defect pass was requested.

## Pending

Write `functions.md` (maximum 900 words plus this compact coverage table), check that every reported finding links to its scene screenshot, then return the summary to the handler. Evidence and scratch files belong only to this functions slice. No app source, dependencies or Git state were changed.
