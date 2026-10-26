# Guided example capture completion

Capture tooling completion evidence for the 56 retained chapter examples. The handler still owns final visual review, published-media integration, and overall acceptance.

## Completed capture set

- Regenerated `docs/reviews/illustrated-chapter-examples/capture-inventory.json` from the retained-example registry. The generator confirmed all 56 homes and wrote the complete inventory.
- Ran `node scripts/capture-guided-example-previews.cjs docs/reviews/illustrated-chapter-examples/capture-inventory.json` against the production preview at `http://127.0.0.1:4387/bezeg-2.0`.
- The runner exited successfully and wrote the complete manifest and PNG set under `src/images/learning/examples/`. A separate count check confirmed 56 inventory entries, 56 manifest captures, 56 unique PNG IDs, no missing IDs, and no extra PNGs.
- Each PNG is 840×520 pixels. The manifest records a 1440×920 browser viewport, 420×260 board frame, clean browser context per example, exact canonical launch URL, scene fingerprint, image checksum, and build/source provenance. Build revision: `ad37517a9e43fb043e514b5044b7d3ac2065bd2c`; the build was dirty and its output digest is recorded in the manifest.
- The final capture run covered every chapter. This worker did not inspect the image contents; the handler owns that visual review.

## Guard and inventory repairs

The first full run stopped at `foundations.worked-weight.bernstein.degree-comparison`, before camera presentation. I opened its exact canonical URL and inspected the live JSXGraph board. It had three visible basis curves with `elType: 'curve'`, not `functiongraph`; their values at (t=0, 0.5, 1) were respectively ((1,0.25,0)), ((0,0.5,0)), and ((0,0.25,1)). The inventory now expects `curve: 3`. The degree-two, stacked-view-off, curve-count, and three independent basis-array checks remain intact. The changed expectation test failed against the old metadata and passed after the correction.

The next run stopped at `functions-and-calculus.applications.arc-length`. The small semicircle is a screen-sized construction: reframing scales its user coordinates independently with horizontal and vertical board units. I inspected the element samples and confirmed the sampled points retain their pixel positions. The guard now permits this only when each sampled point stays within 0.05 screen pixels on both axes; the existing narrower isotropic origin-arc allowance remains for cap-limited constructions. A test for the anisotropic pixel-locked arc failed before the fix and passes after it; a deliberately shifted sample remains rejected.

The following run stopped at `functions-and-calculus.continuity.continuity`. `ContinuityGraph.pieceCurve` resamples `sampleLeftPiece` and `sampleRightPiece` from `board.getBoundingBox()` on every board update, so the exact same function pieces have different endpoints after reframing. The left piece is (a x^2) through (x=1), and the right piece is (-a x+3) beyond (x=1). The guard now retains each curve's sampled `dataX`/`dataY` and compares interpolated values at five shared points in the overlapping x-domain. It requires the same JSXGraph object ID and the same function values within `1e-4` relative tolerance; changed geometry fails. The regression test failed before this guard and passes after it.

## Verification and handoff

`node --test scripts/generate-guided-example-inventory.test.cjs scripts/capture-guided-example-previews.test.cjs` passed all 10 tests after the guard changes. `just build` was required before capture because the existing production preview runner reported stale build inputs; it completed successfully. The preview process was left running at port 4387 for the handler's next steps.

The final successful capture occurred against the build recorded in the manifest. The handler later reported a CSS selector adjustment with no board effect and asked that no build run occur mid-capture. The handler should perform its planned final build after image/copy review and recheck the generated asset bundle against that build. No commits or pushes were made by this capture worker.

## Focused guard rereview

- **P2 — the presentation fingerprint omits the new overlap helper.** `scripts/capture-guided-example-previews.cjs:279-282` hashes `isViewportSpanningHorizontalCurve`, `isCameraScaledCurve`, and `assertPresentationGeometryStable`, but not `isSameGraphOnOverlap`. Changing this helper can change which geometry mutations are accepted without invalidating partial-capture reuse in `validateRetained`. Add its source to the presentation fingerprint (and include `inspectBoard` as it now supplies the curve data used by this guard). The helper tests are non-vacuous: they accept changed sample domains for an unchanged shared function and reject a deliberately altered interior sample. The pixel-locked exception checks both axes within 0.05 screen pixels, and its mutation test rejects a shifted sample. Existing exact point equality, curve count, and `verifyEvidence` checks for substantive visible geometry, per-curve finite samples, expected point/curve evidence, and authored counts remain active.

## Focused framing follow-up

Review of `splines.worked-join.spline-c1.parabola-derivatives.png` showed the parabola occupying only a small portion of the board because it inherited the broad shared `spline-c1` capture window. `captureRecipeForEntry` now gives only this stable example ID a `finite-geometry-fit` capture frame. The shared catalog recipe and all other `spline-c1` entries remain unchanged. A live-board prototype and the final PNG both show the curve substantially larger, with equal x/y unit scales; the five authored points and three curve samples remain identical before and after framing.

The presentation fingerprint now includes `inspectBoard`, `isSameGraphOnOverlap`, the other presentation guards, `captureRecipeForEntry`, both capture helper/API file hashes, and the full per-entry framing map. A regression test verifies that changing either a helper source or an entry framing changes the fingerprint. All 12 focused capture/inventory tests passed. The full 56-entry run completed successfully with no missing or extra images; the recaptured target is 840×520 with SHA-256 `2d37b57106fd80cb7a8b5f1a4b6a82048fab3f204761137cd0cb5db8864bc05b`. The complete manifest records presentation fingerprint `57e806680fef847f65ec999a633ba4ce4e5c3a2cbd303f76bbf20f8af842952a` and the target's `finite-geometry-fit` framing.
