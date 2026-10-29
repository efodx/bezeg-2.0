# Task 13 final media publication — H26

Production source: e917d2caac4962e96e9129773c46c83d8eeba1b9 plus the task13 integration changes. Actual eleven authored scene PNGs were captured from the verified 18:34 production build. Final catalog publication used the verified 18:42 build and completed in staging `.command-logs/preview-staging-44836`; the six surface captures replaced their posters and added clips while preserving the established 45 board clips and provenance. The manifest explicitly records mixed graph source rather than attributing old assets to a fresh capture.

The independent inventory contains 11 examples, 17 prepared steps and 51 rendered-owner expectations. Captures reject empty geometry, stale source/build bytes, incorrect cameras and mismatched independently evaluated Bernstein samples. Final triangle PNG SHA256 is `abe11495e3866de1376ddacc6e4cf301d6723420abb3340db76d56b249fbff43`; joins is `dc56d2e14d9f16d6ead48d3c05b3a8d70f7a8bbdb14b3ac1ed4d4f0ceb80bf6b`.

Each surface motion contains 96 frames at 24fps, four seconds, 720×440 RGB VP9. Byte sizes: tensor215943, deCasteljau286811, derivatives304548, subdivision282222, joins292105, triangle214375 (limit307200). Actual owner geometry is checked on all96 frames. Camera orientation changes; frame88 resets the view, and first/last camera and poster hashes match. FFmpeg/FFprobe7.0.2 came from the existing Jellyfin installation; no dependency was downloaded.

Strict encoding failures were retained: tensor CRF10 1001572 bytes and CRF34 351549 bytes exceeded the budget; deCasteljau CRF40 340440 and CRF41 311693 exceeded it. Final CRF40 is used except deCasteljau42. The deCasteljau corner initially sampled an antialiased cream CSS rim; inspecting source and decoded pixels established the blank interior at(40,40). That sampled background is white across all96 frames. The check does not claim that entire frames are white.

The triangular default-owner fixture was corrected against an independently constructed cubic net and Bernstein sum; its new regression assertion failed before correction. A missing consumer of optional join camera overrides was likewise exposed by strict capture and covered by an observed-failing unit assertion before repair.

Final capture-tool checks: 60/60 Node tests passed, including the real FFmpeg roundtrip with no skip, in `.command-logs/h26-capture-node-final.log`. `validateGeneratedPreviews()` passed for the complete catalog. Independent decoded first/middle-frame and final-figure review is [recorded here](t13-final-media-review-h26.md); its sole copy finding was repaired by separating the C1 catalog description from the C0 chapter figure.

These are local production capture results. Hosted asset and browser acceptance are recorded separately in acceptance.md.
