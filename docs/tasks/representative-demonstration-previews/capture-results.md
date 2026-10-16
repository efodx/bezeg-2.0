# Capture implementation evidence

Source: [representative demonstration previews](../../specs/representative-demonstration-previews.md), tasks 01–04 and the owner's 2026-10-16 motion revision. Integrated playback/release acceptance belongs to the handler's [release evidence](release-results.md).

## Current checkpoint and inventory

The final generation at `d8896611b1567385435800a03a7c70cf809c7708` contains **45 distinct own-route PNG posters and six WebM clips**. The live catalog, route registrations, recipe registry and PNG map all contain 45 shipped demonstrations; no route is marked in progress. Inventory and coverage checks derive from live metadata. The earlier inventory started at `d4bff5638dcee2da1b6bdaf177b81fda785657a2`; its three-clip, split-image output is superseded by this generation.

The owner rejected split-image thumbnails and requested noticeable looping motion. Affine, polynomial elevation and rational elevation now have single full-board original posters plus motion. No poster contains a composed before/after panel. The previous comparison helper and its staging-file exceptions have been removed. Player visibility/looping and homepage carousel behavior are recorded by the handler separately.

The capture worker reused the already-running production server on port 3012 and did not stop or claim ownership of that process. Every full run verified the served module URL and SHA-256 against the local production build before navigation. This generation used `assets/index-CYpFYGEo.js`, SHA-256 `8432ddb83fc6c7a6aa7b343978f6d97af782f070dc6b8a02fde49eda0220fa87`, in Chromium `156.0.8078.4`. Build/capture ownership was returned to the handler immediately after atomic publication.

Mathematical-source fingerprint: `7f915616d9b973b00d7f93d4f79950d463b23f72364b6821197409ac3f6effd7`; relevant dirty paths: none. Presentation fingerprint: `677c82b04bf6bba4db63242f30673b59489244d2263baeb6c27b733867e9d126`. The manifest records source revision, source/presentation fingerprints, served module digest, serialized recipes, UI evidence, framing and clip/source-frame provenance. Generated assets/maps are excluded from the mathematical fingerprint to avoid self-reference. `git diff` confirms no graph, geometry, analysis, route-registration or demonstration-metadata source edits in this revision.

## Recipes and presentation

All 45 recipes use existing inspector buttons, switches, numeric fields, selects, range keyboard handling or actual pointer interaction. Hidden controls are opened through the real Uredi/Prikaz tabs. There is no React-internals access, production graph-control bridge, manufactured geometry or dependency on lesson order. Route defaults, stored presets, lessons, functions and starting weights remain unchanged.

Assertions include four cubic Bernstein functions; four repeated-subdivision pieces; exact Farin divisions at `(-10/3,1)`, `(-1,3)`, `(3.5,0)` for unchanged `[1,2,1,1]` weights; explicit analysis reveal flags/readouts; six integral rectangles; original-example sequence progress; and exact supported iteration counts. Supporting polygons are enabled through their own existing controls.

Geometric captures retain equal user-unit scales. Analysis routes use explicit coordinate windows. All PNGs and clips are 720×440, displayed at 360×220, with a common locked camera per clip matching its poster. Capture-only presentation hides redundant point names, retains existing mathematical text and selects non-overlapping rational weight labels. Curve/construction stroke treatment is idempotent and disables capture-only CSS transitions; every Bézier sample checks unchanged stroke widths. Extrema/convexity retain their existing conclusion row as a capture-only bottom caption.

The new polynomial elevation poster switches off the runtime elevated-point overlay before enabling the original cubic polygon. Its motion performs exactly one real Elevate action, producing a quartic polygon without a second derived quintic overlay. The rational elevation poster starts with its original cubic and weights; after the real elevation, existing weight labels are refreshed through the UI so indices and values are current. Selective labels remain intentional: the elevated rational middle `w2=1.50` is suppressed by the existing overlap selector; retained `w1=1.75` and other visible labels remain valid. This output does not claim that every weight is visible.

## Six four-second motions

All clips use the installed FFmpeg/FFprobe, VP9 (`libvpx-vp9`), CRF 34, zero target bitrate, `yuv420p`, silent output, 24 fps and **96 frames**. Each source is below 300 KiB. Vite imports use `?no-inline`, so even small sources remain separate media URLs. No application encoder/dependency was added.

| Clip | Exact choreography | Bytes | Capture/encode seconds |
| --- | --- | ---: | ---: |
| repeated-subdivision | Fresh exact rounds 0/1/2, each held for 32 frames; one/two/four covering pieces | 11,429 | 7.010 |
| bisection | Fresh exact steps 1/2/3, each held for 32 frames | 18,690 | 6.581 |
| bezier | Original hold, native second-control-point excursion and exact return, final hold | 28,793 | 43.690 |
| affine | Supported rotation steps 0/18/36/54/36/18/0 degrees, readable exact-state holds | 15,558 | 5.847 |
| elevation | Original cubic 1 second, exact quartic 2 seconds, original cubic 1 second | 8,736 | 8.342 |
| rational-elevation | Original rational cubic 1 second, exact quartic 2 seconds, original cubic 1 second | 14,304 | 11.677 |

The affine actions use existing ±18° rotation buttons. Every control point is checked against rotation around the original point centroid. There is no unsupported free-angle animation or invented intermediate curve. Elevation checks the exact homogeneous control-point formula and 21 corresponding evaluations of the real JSXGraph curve before/after elevation, proving that the representation changes while the underlying curve is preserved. The original end state is replayed in a fresh route. No crossfade suggests a fractional mathematical degree.

Bézier has a 0.5-second starting/ending hold around a 72-sample `sin²` excursion of the second original control point by at most `(1.8,2.1)`. Every frame uses native pointer dragging; the return is restored exactly with the existing coordinate editor. All other control points remain at their originals to `1e-9`; only intermediate dragged-point coordinates allow subpixel quantization tolerance. First/last curve-path hashes agree exactly, and the peak differs. The poster remains the original curve.

## Verification and publication

The final full run completed in **183.9 seconds**, staging `.command-logs/preview-staging-65260`. `validateGeneratedPreviews()` passed the published 45 posters/six clips, hashes, dimensions, exact recipe coverage, motion map/import coverage, common cameras, semantic outcomes, source-frame evidence and budgets. Raw frames and diagnostics stay ignored under `.command-logs/`; only PNG posters, WebM clips, manifest and delivery maps are published.

`node --test scripts/demonstration-preview-capture.test.cjs` passes **nine tests**, including exact rotation/elevation evidence, curve-preservation corruption, Bézier stationary-point/endpoint/stroke corruption, unknown controls, missing semantic outcomes, and atomic publication/rollback failures. The first exploratory revision stopped before publication on the polynomial Elevate button's exact accessible name (`↑Dvigni stopnjo`); live inspector inspection resolved it, both elevation diagnostics passed, and the complete generation was repeated. No failing staging output was published.

Two-speed proof passed for all **96** Bézier samples: the default settling pass (`.command-logs/motion-v2-fast-bezier`) and the final pass with an additional 125 ms per sample have identical actual control-point arrays, curve-path hashes, stroke widths and camera. The result is `.command-logs/motion-v2-two-speed-evidence.json`. This compares mathematical states, not encoded bytes. Source PNG hashes are lossless-input provenance; no compressed frame is claimed to retain its PNG hash.

FFprobe counted exactly 96 frames/four seconds and one video-only stream for every final source. Chromium `156.0.8078.4` decoded, played and sought every final source to its midpoint without media errors; evidence is `.command-logs/motion-v2-browser-decode-evidence.json`. This isolated check used source WebM data URLs; production MIME/loading/player acceptance belongs to the handler. Actual-card-size decoded first/peak/last diagnostic strips are `.command-logs/motion-v2-{id}-decoded-card-strip.png`. These diagnostic contact strips are not shipped thumbnails. The capture worker inspected affine, both elevations and Bézier after compression; independent review covers formulas, cameras and single-board presentation.

## Explicit limitations

- Polynomial/rational extrapolation uses the existing moderate extension, but current runtime controls replace the original representation and cannot retain an original-interval overlay. These stills do not claim full original-versus-extended-portion distinction.
- Spline parameterization displays 12 genuine sample markers; its count remains in the inspector rather than new board text.
- Rational annotation selection deliberately omits crowded labels without changing weights or label values.
- Physical projector/device, Safari/WebKit, Firefox and screen-reader review were not performed by the capture worker. The handler records actual integrated/deployed coverage separately.
