# Task 13 media-pipeline review — H26

Read-only review of patch preview capture, surface-motion helpers, generated expectations, preview wiring, and supplied PNGs. No builds, browser runs, tests, or edits to implementation were performed.

## Findings

- **P2 — Surface orbit helper is missing from motion-capture provenance.** [`capture-demonstration-previews.cjs:511`](../../../scripts/capture-demonstration-previews.cjs:511) fingerprints `demonstration-preview-motion.cjs` and its API, while that module delegates the new surface behavior to [`patch-surface-motion.cjs:1`](../../../scripts/patch-surface-motion.cjs:1), whose contents are not hashed. On selective recapture, changing the orbit schedule, checks, or frame capture code can leave the presentation fingerprint unchanged, allowing existing clips to be retained alongside clips made by different helper code. Include the helper in the fingerprint.
- **P2 — Several authored-camera figures are too small to teach from.** Open `src/images/learning/examples/patches/bezier-patches.triangular-patches.patch-triangular.png` and `bezier-patches.square-vs-triangular.patch-triangular.png`: the triangular surface projects as a very narrow spike, and its large (S(u,v,w)) label sits beside/over the shape. `bezier-patches.tensor-joins.patch-joins.png` also has a small surface pair with crowded labels. The PNGs are 840×520, but the visible geometry occupies little of that area. Current surface presentation checks prove mesh and labels remain in-frame; they do not ensure useful rendered scale. Revisit authored camera/scene framing and re-inspect these actual figures.

## Evidence and limits

- The patch destination is separate: the root manifest still lists 56 retained examples; the patch manifest lists 11 PNGs. The worktree status shows only the new `patches/` asset directory, not a change to the retained manifest.
- Tensor and triangular expectation generation uses independent Bernstein sums and nonempty rendered-owner/camera assertions. The reviewed formulas and expected sample mapping agree with the producer’s fixed density-16 tessellation ordering; join G1 geometry is sourced from the alpha-2 preset net while preserving the preceding C1 camera, and the teapot expectation includes 32 owners.
- The actual PNGs were visually inspected. Tensor overview, de Casteljau, and subdivision are legible; triangle and join examples have the scale/label problems above. No claim is made about the handler-owned motion diagnostic, which was still running.
- Focused test source was inspected but not executed. Browser capture, production-build verification, and the in-progress motion diagnostic remain outside this review.
