# 08 capture repoint 3

- Control steps repointed (scripts/guided-example-control-steps.cjs): select-tab opens Orodja and clicks `#board-card-tools .tools-head-button[aria-controls=inspector-X]`; set-control tries the puck (`puckControl`) then the Orodja field (`applyPuckStep`).
- Script test: puck case added, fake inspector updated (tab selector, regex-name getByRole). `node --test scripts/guided-example-*.test.cjs`: 39 pass, 1 fail (committed manifest checksum, expected until capture lands).
- Capture script: initial-frame settle poll added (board refits ~1-2 s after load; before this, fixed-point failed "board changed after initial-frame settling").
- Full run log: .command-logs/h15-capture3.log. 9 entries captured (analysis.* up to darboux), then stopped at bezier-curves.affine-transformations.affine: visible curve count 2 !== expected 1. Cause: the converted affine graph draws a dashed original curve (AffineTransformsBezierCurveGraph.tsx:391) as a second curve; the expectation is src/learning/chapter/guidedExampleHighlights.ts:221 `curveCount: 1` (src, not mine).
- Images: uniform-convergence.png and extrema.png (viewport 840x520) are covered by the Lekcija card (graph not visible). Capture needs the lesson/other cards folded or a layout that keeps the graph visible.
- Manifest/PNGs are now inconsistent (9 PNGs rewritten, manifest not written), so guidedExamplePreviews.test.ts still fails on checksums.
