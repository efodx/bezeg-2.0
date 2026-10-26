# Area-between JSXGraph parity follow-up

Status: **no AreaBetweenCurvesGraph source change is justified.** Fresh normal captures of JSXGraph 1.9.2 and 1.14.1 match exactly, including two repeated pairs. The old supplied upgrade screenshot still differs by 419 label pixels, but this signature was also observed between two baseline captures during one run, showing that the capture can land on different label positions during startup.

## Matched capture experiment

Ran [capture-clip-experiment.cjs](area-parity/capture-clip-experiment.cjs) against the live clean baseline preview `:4398` and upgrade preview `:4396` with Playwright Chromium **156.0.8078.4**, headless, viewport 1440×960, DPR 1, locale `sl-SI`, light color scheme, reduced motion, and timezone `Europe/Ljubljana`. Each capture followed the parity runner's route readiness, MathJax/font readiness, 120 ms settle, full-page screenshot, disabled animations and hidden caret. PNGs were decoded in Chromium and compared by exact RGBA pixels. Raw details from the latest run are in [clip-experiment.json](area-parity/clip-experiment.json); the prior corrected run is retained in [capture-timing-history.json](area-parity/capture-timing-history.json).

In the latest run, the fresh baseline and upgrade default captures matched at **0 pixels**. Two additional baseline/upgrade repeat pairs also matched at 0 pixels, and each preview's repeated captures were identical. All default labels had the same bounding boxes at `y=620.171875`. The supplied `baseline-idle` screenshot also matched the fresh default captures at 0 pixels. The supplied `after-idle` upgrade screenshot still differs from the fresh upgrade by **419 pixels**, in bbox `[375,642,737,662]` around P₁/P₂.

The prior corrected run captured a 1.5 px vertical label shift: its first and repeated baseline captures differed by 419 pixels in that same P₁/P₂ bbox, while the repeated baseline and repeated upgrade default captures matched at 0 pixels. A subsequent run was stable across every fresh default capture. This demonstrates intermittent startup capture timing around the labels rather than an upgrade-only rendering difference.

The experiment also applied `point.label.setAttribute({clip:false})` only to P₁/P₂. It did not supply a needed fix: normal default clipping matched the clean baseline in the settled captures, so no production source change was made.

## Capture artifacts

- `fresh-baseline.png`, `fresh-baseline-repeat.png`, `fresh-baseline-repeat-2.png`
- `fresh-upgrade-default.png`, `fresh-upgrade-default-repeat.png`, `fresh-upgrade-default-repeat-2.png`
- `fresh-upgrade-clip-false.png`
- [clip-experiment.json](area-parity/clip-experiment.json)
- [capture-timing-history.json](area-parity/capture-timing-history.json)

Other routes and the previously reported smoke, build, and check results are recorded in the upgrade review. The earlier 419-pixel difference is retained as evidence of a capture timing artifact and is not waived as an accepted product difference.
