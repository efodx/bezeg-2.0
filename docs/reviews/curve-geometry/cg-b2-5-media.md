# CG-B2-5: comb and evolute media

Chapter cards for `curve-comb` and `curve-evolute`, and one joint catalog-poster capture with `epicycles`, which empties `POSTER_PENDING`.

## Chapter cards

Both are the lesson's opening scene, the only scene the chapter capture accepts.

- `curve-geometry.curve-comb.curve-comb`: the cubic and its control points with the comb hidden. Correct but plain: it does not show what the section is about, and its caption says the comb is hidden. For the UI review.
- `curve-geometry.curve-evolute.curve-evolute`: the parabola, the circle, E and the readout, with the trace hidden.

The existing `curve-parametric` and `curve-curvature` PNGs are unchanged; the manifest's provenance fields moved.

## Posters

Viewed by eye, nothing clipped.

| Id | Recipe | Shows |
| --- | --- | --- |
| `curve-comb` | C1 kind, comb on, window `[-8, 4.9, 8, -4.9]` | The spline, comb and its jump at the joins, with the "Stik 1" readout |
| `curve-evolute` | Route defaults, window `[-5.2, 5, 5.2, -1.2]` | Parabola, whole evolute and cusp, normal, circle; labels E, N, T crowd near the point |
| `epicycles` | Romb example, three "Povečaj N za 1" | Rounded rhombus and the chain; the default unit circle is trivial at every N |

`epicycles` belongs to Functions. Curves captured it because `scripts/capture-demonstration-previews.cjs` needs every shipped id captured, so neither stream could capture alone. A later selective recapture can refine its recipe.

Capture flags: `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`; the capture refused without each. The second asserts that shared presentation and retained recipes are unchanged: the handler confirmed `scripts/demonstration-preview-recipes.cjs`, three entries, is the only script changed.

Manifest delta by script: 110 to 113 captures, the 110 existing captures and all 51 motions identical. `scripts/demonstration-preview-capture.test.cjs`: 36 of 37, the known local VP9 `bt709` failure.
