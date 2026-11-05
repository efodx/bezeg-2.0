# CG-B2-6: Batch 2 gate

Handler 51, 2026-11-05. Code at `81853f11` (tests) and `1530b1d5` (live region). Measurement and audit: [measurement](cg-b2-6-measurement.md), [criterion audit](cg-b2-6-criterion-audit.md).

## Live region

The readouts of \(\kappa\), \(R\), the tangent angle, \(E\) and the comb's join jump existed only as board text. `src/graphs/curves/LiveReadout.tsx` adds a polite live region to `curve-curvature`, `curve-evolute` and `curve-comb`.

- `SettledReadout` takes the text from the board text function on each board update and publishes it 500 ms after the last change. Reports touch no graph state, so a drag renders nothing extra.
- A scene replacement publishes at once through `syncReplacedScene`, the seam every replacement ends in. A restored scene never leaves the edited scene's text in the region, and a comb kind switch counts as a replacement.
- `controlsSignature` in the real-graph harness skips `[data-readout-live]`. The contract tests snapshot controls straight after an edit, when the region lags by design. The board text it echoes is in the board signature, and `CurveEvoluteGraphReal.test.tsx` tests the replaced scene directly.

Known limits: the region sits in the Edit panel, as in the compgeo Demonstrations, so it is silent while Display or Save is open. With the comb off the region is empty, as the board text is. The text is the board's, symbols included, so how a screen reader speaks \(\kappa\) is unverified.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| First `just check` | dirty tree on `2b8005cf` | Exit 1, 10 failures: the harness snapshot above and a test graph built without its constructor |
| `just check` after the repair | same changes, dirty on `2b8005cf`; these were then committed unchanged | Exit 0, 11501 passed, 4 skipped, 1070 s |
| `smoke-lesson` for `curve-parametric`, `curve-curvature`, `curve-comb`, `curve-evolute` | `1530b1d5`, clean | 8 of 8 |
| Hosted CI | `1530b1d5` | Success |
| Keyboard and live region in Chromium (Sonnet smoke) | `1530b1d5`, clean | Passed, below |
| Mutations | | Removing the quiet timer failed 11 tests; removing `cancel()` on unmount 3; removing the replace in `syncReplacedScene` 2; a changed C1 default point and a skipped restore in `LessonSession.ts:175` failed the new tests. The C2 and G1 literals and overlay disposal were not mutated separately |

Browser pass at 1280 by 720 on the three routes: Tab reached the slider, select and switch, each worked from the keyboard with a visible focus ring, and the board changed. Eight key presses 60 ms apart gave one region change about 505 ms after the last, in both languages with the right decimal mark. Evolute at 390 by 844 stayed reachable with no horizontal overflow, the board change confirmed only for the select. No console errors.

Not covered: no real screen reader, so the announcement itself is unverified; no real touch device.

## Carried, not gate items

Unchanged from [handoff 50](../feature-streams/curves/handler-handoff-50.md): step 5, frame 1 at 1280 by 720 hidden until the panel moves; evolute colour `#6175ad` at 4.51:1; the plain comb card; the crowded evolute poster labels.
