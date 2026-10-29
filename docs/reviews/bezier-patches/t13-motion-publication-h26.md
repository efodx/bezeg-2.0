# Task 13 motion publication plumbing — H26

- Surface poster alignment now requires `surface-view` framing and a finite `{az, el, distance, target}` camera, checks it against the surface orbit camera, and canonicalizes only sub-tolerance roundoff. Existing board camera handling is unchanged.
- Catalog validation now checks the surface camera object against the poster camera, preserves exact board-camera comparison, requires white sampled RGB for surface clips and the established ivory RGB for board clips, and validates each camera schema.
- The runner coverage test now accounts for all six configured surface timelines while retaining the exact 51-motion requirement; it no longer subtracts surface IDs from coverage.
- Added valid, malformed, changed-target and wrong-mode surface cases, plus board-retention checks in capture and catalog tests.
- Focused `node --test scripts/demonstration-preview-capture.test.cjs scripts/demonstration-preview-motion-runner.test.cjs scripts/smoke-catalog-motion.test.cjs`: 37 passed, 1 skipped (real VP9 encoder check requires FFmpeg), 0 failed.
- `just lint scripts/capture-demonstration-previews.cjs scripts/demonstration-preview-capture.test.cjs scripts/demonstration-preview-motion-runner.test.cjs scripts/smoke-catalog-motion.test.cjs tests/smoke-catalog.cjs`: passed.
- Publication still needs the refreshed complete 51-motion manifest/assets; the current checked-in catalog manifest carries only the earlier 45 clips. No browser capture or publication run was performed in this slice.

Handler closure: all six refreshed clips/posters and the complete51-clip manifest were published and checked; see t13-media-publication-h26.md. The actual FFmpeg-enabled final tooling suite passed60/60 without a skip, all media decoded in the273-row production suite, and hosted clips played after exact CI40936771299 deployment.
