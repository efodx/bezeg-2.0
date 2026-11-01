# Complex maps 04 F5 worker notes (handler 10)

State: Part A and Part B implemented; see the final report for check results. Logs in `.command-logs/h10-f5/`.

- First-frame expectations (authored, `complexMapsExpectedFor`): M1 = 3 curves (unit circle, arrows of z and w), 3 points (z, w, conjugate of z); 1/z, w/z and the inversion circle are hidden at the default. M2 = 1 curve (arrow of w), 1 point (w); roots, polygon with circle, and test point hidden.
- Posters: `complex-reciprocal` uses example `inside` with `Pokaži 1/z`; `complex-roots` uses `two-i` with roots and polygon shown. Windows keep the 360:220 aspect so the unit circle stays round.
- Poster recapture needed `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` (the default refuses a different source fingerprint), so the manifest is marked mixed-source for the retained media.
