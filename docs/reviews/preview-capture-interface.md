# Preview capture and evidence interface

Accepted 2026-10-20 against [architecture deepening, section 2](../specs/architecture-deepening.md#2-demonstration-preview-capture-and-evidence).

## Ownership and depth

The two existing consumers are the capture CLI and `tests/smoke-catalog.cjs`'s published-evidence validator. Both now consume `demonstration-preview-capture-api.cjs`: generation, configured IDs, recipe alignment and evidence validation. Neither enumerates the mathematical specification registry or imports curve formulas. The assembled registry is deeply frozen after all family/concept specifications are installed.

Tests retain a named mathematical support interface for independent rejection fixtures. `createMotionEvidenceValidator(fixtures)` snapshots fixture data for a local validator, removing registry installation/deletion and its cleanup obligation. Live generation and offline validation execute the same assertions against their selected specifications. Existing schedules, supported controls, observations, formula bodies and browser adapter are unchanged. The gain is removal of consumer registry knowledge and shared mutable fixture state; a file split by itself would not provide this gain.

## Acceptance evidence

1. The API test exercises coverage/alignment queries and shared validation; nested production mutation is rejected and later fixture mutation cannot alter an existing validator. A tracked-tree consumer scan and two independent reviews caught and closed a missed smoke-catalog import before acceptance.
2. All 45 timelines still match the live catalog. Mathematical rejection fixtures retain wrong intermediate points, derivatives, rational/PH/G1 identities, readout mismatch, fixed-point drift, missing paths, camera drift and loop failures. Family motion tests also pass.
3. Diagnostic captures on the production build exercised de Casteljau (`parameter-sweep`, 96 samples), complex multiplication (`pointer-drag`, 96 samples), and degree elevation (`exact-degree-elevation`, three held states). All used 96 source frames at 24 fps, fixed cameras matching their posters, silent 720×440 four-second WebM, and equal first/last lossless source hashes. The live and offline evidence validators both accepted them.
4. Encoded sizes were respectively 295,631, 287,913 and 25,190 bytes, below 307,200 bytes. RGB VP9 metadata and every source/decoded background sample passed. Decoded midpoint images were inspected: de Casteljau levels remain on the curve construction, complex vectors remain inside the coordinate frame, and elevation changes its supporting polygon while preserving the curve. First/last decoded frames have mean absolute channel differences of 0.000435, 0.000812 and 0.000103 out of 255 (maxima 6, 2 and 1); lossy compressed frames are not claimed pixel-identical. Together with identical source frames and fixed geometry, these show no geometric loop jump.
5. All 45 published posters/clips, the manifest and both delivery maps were retained unchanged and pass `validateGeneratedPreviews()`: evidence, checksums, cameras, media budgets and exhaustive map/manifest coverage. Selective merge, encoding, validation/publication failure and pruning rollback tests pass. The new facade joins the existing presentation fingerprint inputs. No selective publication was performed and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION` was not set; compatibility here is the reviewed unchanged recipes/mathematics/presentation plus validation of the retained bytes, not a new generation provenance claim.
6. No runtime player, route, graph, lesson, Preset, asset or dependency changes. Architecture and capture ownership guidance were updated. No route or stored-data compatibility impact.

## Checks and limits

- Focused Node tests: 45 passed, zero skipped across capture, motion-runner, analysis-motion and concept-motion suites, using portable FFmpeg/FFprobe 6.1.1 (the published manifest's encoder version).
- Preview player unit tests: 15 passed. TypeScript and `just build` passed; the build reported existing warnings.
- Published-preview validator, the focused catalog provenance smoke (`just smoke-built tests/demonstrations.smoke.spec.cjs --grep 'generated preview mapping' --port 3019 --workers=1`) and `git diff --check` passed. Independent mathematical and engineering re-reviews found no remaining issues.
- Diagnostic capture and summary records are local in `.command-logs/preview-staging-28064`, `preview-real-captures.log` and `preview-real-summary.json`; these are deliberately not published assets.
- FFmpeg 9.0.2 failed the existing color-primary metadata assertion. No assertion was relaxed; 6.1.1 passed. Broad encoder-version compatibility is outside this refactor.
- Initial standalone localhost capture attempts were blocked/unreachable; starting the production server and capture in one execution environment succeeded. Only the three representative motions were recaptured; all 45 retained motions received offline evidence validation. No cross-browser, physical device/projector or new runtime-player visual review was performed because runtime behavior and media delivery did not change.
