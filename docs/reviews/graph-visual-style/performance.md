# Production interaction timings

Matched production builds were measured in headless Chromium 156.0.8078.4 on Windows 10, at a 1440×850 viewport, DPR 1, Slovenian locale, and light color scheme. The baseline serves `main.cc3c7938.js`; the final build serves `main.9f88cc12.js`.

Each interaction ran five times. Point drags used 12 synthetic pointer moves; sliders used 10. Every trial verified that the intended point or control value changed and that board geometry changed. The gesture duration includes Playwright event dispatch, checkpoint reads, and a 32 ms settling period. The pointer-to-DOM column measures the delay from a synthetic pointer move to the first observed board DOM mutation; it is a rendering proxy, not physical input latency. Frame intervals come from requestAnimationFrame samples during gestures. Percentiles use nearest-rank, so p95 is the maximum with five repeats.

| Interaction | Gesture duration p50 / p95, baseline → final (ms) | Pointer-to-DOM p50 / p95, baseline → final (ms) | rAF interval range, baseline → final (ms) | Frames over 20 ms, baseline → final |
| --- | ---: | ---: | ---: | ---: |
| Bezier point drag | 321.15 / 486.35 → 329.97 / 584.57 | 6.3 / 9.5 → 5.7 / 10.8 | 16.5–16.8 → 16.6–16.8 | 0 → 0 |
| De Casteljau point drag | 313.89 / 369.65 → 316.67 / 318.30 | 5.8 / 10.4 → 4.0 / 8.8 | 16.5–16.8 → 16.6–16.8 | 0 → 0 |
| Rational Bezier point drag | 321.95 / 378.05 → 318.66 / 394.69 | 6.2 / 10.6 → 4.9 / 9.9 | 16.6–16.8 → 16.6–16.8 | 0 → 0 |
| PH auxiliary point drag | 363.68 / 513.42 → 393.18 / 620.32 | 11.2 / 17.8 → 11.1 / 19.8 | 16.6–33.3 → 16.6–33.3 | 1 → 1 |
| De Casteljau parameter slider | 283.95 / 300.18 → 318.85 / 391.87 | 5.2 / 10.0 → 6.8 / 11.7 | 16.5–16.8 → 16.5–16.8 | 0 → 0 |
| Rational Farin ratio slider | 272.83 / 278.07 → 270.98 / 275.54 | 3.3 / 5.2 → 4.6 / 6.6 | 16.6–16.8 → 16.6–16.8 | 0 → 0 |
| PH offset distance slider | 284.86 / 324.29 → 269.10 / 290.95 | 7.7 / 10.2 → 8.4 / 10.7 | 16.5–16.8 → 16.5–16.8 | 0 → 0 |

The pointer-to-DOM median moved in both directions, with changes between −1.8 ms and +1.6 ms. Sampled frame intervals were similar; the PH point drag had one interval above 20 ms in both builds. Synthetic gesture medians increased for the PH drag and construction slider, while other cases were mixed. Their p95 values are sample maxima and vary substantially. With five repeats and automation overhead in the gesture duration, these results do not establish a general rendering regression or a physical-input latency claim; the PH and construction timing tails are signals for a larger targeted benchmark if they become a concern.

The raw samples are retained in [baseline-performance.json](baseline-performance.json) and [final-performance.json](final-performance.json). The baseline ran against revision `ecc17fabbe0fd03ac4dc9f6b35f6df2efe5316d0`, bundle SHA-256 `9E55C0E52BFD8A8920C2C5E15F417FF51EEE5635D55B02487D43C3397C7ECEF2`. The final capture records source revision `a72af4bad44b0e18d6da4f43c89e92aa7f24e7b0` and bundle SHA-256 `7CBBB50C94FFA582CFAA7AE2CC2A623768D595F72623692A9CAB518C89A47095`. The final raw file's manually supplied `sourceState` text still mentions `ecc17fa`; its machine-recorded `revision` and the final capture manifest identify `a72af4b` and the exact served bundle.
