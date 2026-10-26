# Rational and PH preview repair

Status: accepted, 2026-10-26. Source: [repair specification](../specs/rational-preview-repair.md).

## Changes and mathematical evidence

Only the capture pipeline and four catalog media pairs change. Runtime graph scenes, controls, routes, localization and stored presets are unchanged.

The rational poster clears selection after setting the weight. Motion retains the supported selected-curve weight inspector, hides its four editing handles and their connecting edges only during capture, and uses the existing control-point palette. Each frame requires exactly four visible control points, unchanged coordinates and agreement with independent weighted Bernstein evaluation.

Rational de Casteljau already exposes the weighted construction. Leaving its default construction enabled fixes the previous recipe, which hid it. Each frame checks all projected homogeneous interpolation levels and their connecting legs; the final point and growing prefix agree with independent rational Bernstein evaluation. This supersedes the earlier claim that runtime work was required.

Both PH recipes use the existing count buttons for three offsets. Each frame requires four visible curve objects (one PH base and three offsets), fixed controls/base path, and checks 41 samples per offset for distance k|d|, perpendicularity and consistent signed-normal side (1e-9 tolerance). The cusp check uses the outermost 3|d| and sampled signed curvature radii (4,000 samples). Quintic starts at d=.15 (outermost .45), cubic at .35. Geometry sampling is evidence for these fixed scenes, not a general proof for arbitrary PH input.

## Provenance and retained assets

The baseline manifest’s mathematical source predates the current runtime. Selective recapture explicitly uses PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 and PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1. The manifest keeps the previous revision/fingerprint and prior selective chain, marks mixed source, validates retained asset checksums, and replaces only rational, rational-decasteljau, ph-cubic and ph-quintic. Retained assets are not certified against the newer runtime.

## Verification environment

Existing worktree: C:/Users/NonFriedMotherBoard/.codex/worktrees/rational-preview-fixes/bezeg, branch codex/rational-ph-preview-fixes, base ad37517a9e43fb043e514b5044b7d3ac2065bd2c. Isolated locked dependencies; Windows Chromium/Playwright; FFmpeg N-113482 (Jan 2024) with VP9 RGB metadata. Task-owned production preview uses port 4396 and /bezeg-2.0.

The previous handler’s independent mathematical/engineering review found a missing hook invocation, which was repaired and re-reviewed without further actionable findings. An extra global MathJax settle caused renderer crashes during capture; using the existing lightweight per-spec settlement allowed all rational frames to complete. A later PH encoding overrun is handled by measuring encoder quality on unchanged source frames; the 300 KiB budget remains fixed.

Focused capture tests: 46 passed, no failures/skips on 2026-10-26 after the settlement repair (.command-logs/continuation-focused-tests.log). They include negative assertions for missing/hidden/incorrect outer offsets, unsafe cusp distance, rational construction and default rejection of mismatched source provenance.

Final media measurements, card-size inspection and build evidence follow. Catalog smoke is recorded below.
## Final capture and visual acceptance

Selective generation completed in 143.4 s and atomically published the four pairs (.command-logs/preview-final-recapture-5.log). Every first/last source PNG exactly matches its recipe poster. Final files live under src/images/demonstrations/catalog/.

| Clip | Bytes | CRF | Adjacent failing quality |
| --- | ---: | ---: | --- |
| rational | 147185 | 10 | Default quality fits |
| rational-decasteljau | 281008 | 10 | Default quality fits |
| ph-cubic | 304579 | 30 | CRF 29: 320351 B |
| ph-quintic | 304627 | 34 | CRF 33: 319731 B |

All four retain 720×440, 96 frames at 24 fps, four seconds, no audio, RGB metadata and checked decoded background color. PH settings are the highest-quality measured CRFs within 307200 B; choreography, labels and camera were preserved for compression. Cubic CRF 26 measured 379727 B and 34 measured 234136 B; quintic CRF 30 measured 374820 B. The final rational seam initially exposed a palette typo (#bf8542 rather than the poster’s #bd8040). A one-frame browser reproduction confirmed exact equality after correction, followed by the complete successful run.

The handler inspected the four posters and decoded frames 0, 48 and 95 at 360×220 in .command-logs/rational-preview-contact-sheet.png. Rational has no selection rectangle/handles; the weighted interpolation levels and final point are legible; both PH families show the base and three readable offsets, changing sides during motion. At d=0 the offsets intentionally coincide with the base. Fine lines remain distinguishable after encoding. No layout/runtime change is needed.

Independent retained-media verification compared all 82 unrelated PNG/WebM files byte-for-byte with base HEAD and deep-compared every retained capture and motion evidence record. All matched; previous source fingerprint and selective provenance chain were preserved (.command-logs/repair-assets-verification.log).

Final focused tests: 46 passed, zero skips/failures (.command-logs/repair-final-tests.log). Combined lint passed after the palette fix (.command-logs/2026-10-26T14-52-19-358Z-416-d05297a6.log). Production build including new assets passed in 15.1 s (.command-logs/2026-10-26T14-54-36-502Z-43504-c6742296.log); existing Sass deprecation warnings remain. The served index was byte-equal to that build before browser handoff.


## Catalog smoke and limits

The delegated smoke lane was selected because media from multiple graph families and the capture pipeline changed. The production Chromium check passed catalog entry and an unchanged Bézier preview baseline; all four changed posters decoded and clips played/advanced on desktop and at 390 px without horizontal overflow. Reduced motion suppressed video sources and retained ready posters. Keyboard focus activated a preview and Enter navigated the rational card’s actual /rational/base destination to a visible graph. No page/runtime/asset errors were observed. The initial keyboard helper guessed /rational/curve; reproducing against the actual card href confirmed correct app behavior. See [browser evidence](rational-preview-repair/catalog-smoke.md) for individual observations and cleanup.

No full lesson/preset/control suite was run: app/runtime code did not change. Physical phones, projectors, classroom observation, exhaustive accessibility and live GitHub Pages behavior were not tested. Local production playback is evidence for the built assets, not a hosted deployment claim.
