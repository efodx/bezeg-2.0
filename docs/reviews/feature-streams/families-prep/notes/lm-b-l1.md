# lm-b L1: ellipse mode of LinearMapGraph (PARTIAL, stopped on the budget signal)

## Written
- `src/graphs/linear/ellipseScene.ts` (new): `deriveEllipse` (SVD-drawn image curve, kinds ellipse/circle/segment/point, labelled axes and domain directions, eigen lines, readout angles), `deriveConic` (exact classification of S = (A+A^T)/2: ellipse / hyperbola / parallel-lines / empty; semi-axes 1/sqrt(lambda), sampled curve for the ellipse only), `ellipsePlacement`, `ellipseHalfExtent`, `ellipseViewBox`.
- `src/graphs/linear/ellipseBoard.ts` (new): `createEllipseObjects` (unit circle, image curve, conic curve, two dashed lines, spokes with labelled tips for image axes, conic axes and domain directions, a marker for the zero matrix); every object `own()`ed and `visible` only while the mode is active.
- `src/graphs/linear/ellipseScene.test.ts` (new, 18 tests, passes: `.command-logs/lm-b/l1-scene.log`).
- `src/graphs/linear/eigenScene.ts`: `centredViewBox(half, w, h)` extracted; `eigenViewBox` unchanged in behaviour.
- `src/linear/linearMapModel.ts`: optional stored `conicVisible?: boolean` (absent = false; serialized only when true; non-boolean rejected naming the field); tests appended to `linearMapModel.test.ts` ("Batch B: the ellipse mode conic toggle"; not yet run red/green separately, they ran inside the l1-unit run and passed).
- `src/graphs/linear/linearMapScene.ts`: `ellipse` added to `LINEAR_MAP_GRAPH_MODES`.
- `src/graphs/linear/LinearMapGraph.tsx`: mode label and select, `ellipseOf` memo, view (`defaultBoundingBox`, `viewKey` = matrix + conic switch), board context, inspector group (gloss + conic `OnOffSwitch`), legend, `ellipseStatuses`, readouts (sigma1, sigma2, det, |det|, sigma1 sigma2, axis angles, and with the conic on S rows, lambdas, semi-axes), `setToggle("conicVisible")`, examples offered now also S_y, N, F (`symmetric`, `non-symmetric`, `reflection-x`; no new ids).
- `src/localization/sl.ts`, `en.ts`: 31 new `linear_map_*` keys each (after `linear_map_status_eigen_v_kernel`), lockstep.

## Checks (observed)
- `npx tsc --noEmit --pretty false`: clean (`.command-logs/lm-b/l1-tsc.log` empty).
- `just unit src/graphs/linear src/linear` (`l1-unit.log`): 244 passed, 9 failed, 2 files. Failures: LinearMapEigen.host "mode select ... accepted by Presets and set-mode" (still asserts ellipse is rejected, lines 124, 131, 133: expected, to update), and 8 in `LinearMapGraph.test.ts` (the ellipse-rejection assertions at lines ~392-399 and ~442 are expected; the others, e.g. "dragging a handle snaps ... expected [0,0] to equal [1,0]", Reset, mode change, Preset round trip, lesson actions, look like a different cause: probably the test finds handles by position in `board.objectsList`/point order and my ellipse points, created before the handles, shifted it. NOT yet diagnosed).

## Measurements
None. `just linear-map-bench` not looked up; ADR 0032 not re-read for whether it left the ellipse open.

## Deviations / decisions
- Conic switch name `conicVisible` (optional stored field); a lesson scene cannot set it with the existing actions. Needed action shape if a scene must: `{kind: 'linear-map', operation: 'set-conic', visible: boolean}` (`src/learning/model.ts` not owned).
- Image axes/directions hidden for circle (axes not unique) and point; for a segment only sigma1 and both domain directions (v2 is the kernel direction).
- Conic classification: for xTSx = 1 a parabola cannot occur (central conic); statuses are ellipse, hyperbola, parallel lines, and "no real points" (negative semidefinite or zero).
- Conic toggle refits the view (viewKey includes it) so the conic semi-axes (up to 16) fit.

## Doubts
- Label collisions only handled for a1/a2 and domain-vs-sigma tips; two small sigma tips close together are not separated.
- Slovenian terms (singularna vrednost/smer, simetrični del, kvadratna forma) used in the new keys; not yet added to `docs/localization.md`.
- Red evidence per group was not produced (`l1-red.log` absent): the scene tests were written with the module; host tests not written.

## Still to do
1. Diagnose and fix the 8 `LinearMapGraph.test.ts` failures (see above) and update the ellipse-rejection assertions: `LinearMapEigen.host.test.tsx:124,131,133`, `LinearMapGraph.test.ts:~392-399,~442`; `linearMapModel.test.ts` mode lists if any fail.
2. Write `LinearMapEllipse.host.test.tsx` (mode select, S_y/N readouts and statuses sl/en, conic drawn for N and not for F, segment/point/circle statuses, mode-switch hiding, refit rules, Preset round trip with `conicVisible`, key lockstep) with red logs in `l1-red.log`.
3. `docs/localization.md` terms; `docs/tasks/linear-maps/08-batch-b.md` status line.
4. Run `just lint`, `just build`, the six sweeps for `linear-map`, bench if available, screenshots (S_y, N both toggles, singular, rotation at 1366x768; N at 390x844) to `.command-logs/lm-b/smoke-l1/`.
5. Visually check label collisions and the a2/tick label.
6. CRLF check: no file written by me contains CR (checked with grep, none found).

# Slice L2 (continuation; complete)

## Written
- `LinearMapGraph.tsx`: `createEllipseObjects` now runs after the handles and eigen points (the 8 `LinearMapGraph.test.ts` failures were the handles' board index `[6, 7]` shifting; assertions unchanged); `set-conic` case in `applyLinearMapAction` (non-boolean throws a DomainError naming `visible` before any write; otherwise `setToggle("conicVisible", …)`, the switch's path).
- `src/learning/model.ts`: `{kind:'linear-map'; operation:'set-conic'; visible:boolean}` with comment.
- Tests: `LinearMapGraph.test.ts` (rejection now only `composition`; the image Bezier is found as the last function-built curve, since the ellipse's data-array curves follow it), `LinearMapEigen.host.test.tsx` (ellipse accepted), new `LinearMapEllipse.host.test.tsx` (12 tests: S_y, N, F/indefinite, empty/parallel lines, segment/point/circle, rotation, set-conic equivalence + invalid + sync chain, mode-switch hiding, refit rules, Preset conic field, key lockstep, English status).
- `docs/localization.md`: term row (singularna vrednost/smer, simetrični del, kvadratna forma), handler-unreviewed.

## Checks (logs in `.command-logs/lm-b/`)
- `l2-host.log`: `just unit src/graphs/linear src/linear` passed (16 files). `l2-red.log`: set-conic made a no-op, 6 of 12 ellipse host tests failed (restored). `l2-tsc.log` empty; `l2-lint.log`, `l2-build.log` passed; `l2-sweeps.log` (six sweeps for linear-map) passed.
- Screenshots `smoke-l1/` (sy, n-image, n-conic, singular, rotation, f-conic at 1366x768; n-mobile 390x844): no page errors; looked at sy, n-image, n-conic, n-mobile.

## Measurements
`just linear-map-bench` is a standalone fixture (grid + optional 101-point ellipse), not the real mode; ADR 0032 already records the ellipse as free. Not measured on the real graph.

## Deviations
- Not-drawn conic statuses: hyperbola, parallel lines, no real points (a parabola cannot occur for xᵀSx = 1); accepted by handler.
- No new example ids (S_y, N, F reuse `symmetric`, `non-symmetric`, `reflection-x`).

## Doubts
- Labels: in N the sigma_1 tip label sits next to the v_1 label, and at 390 px a_2/sigma_2/v_2 labels overlap. Readable on desktop, cramped on mobile.
- The conic-refit assertion uses S = I/4 (semi-axes 2); the viewBox also has a minimum, so small conics do not change the view.
- Not run: the full smoke checklist, touch drag in the ellipse mode.

## Slice L3 (ellipse review and smoke fixes)
- Review 1: `LinearMapGraph.test.ts:65` looks the handles up through `graph.handle1/handle2` (`handles(graph)`), no board index.
- Review 2/3: ellipse objects carry `cssClass: ELLIPSE_MARK` (`ellipseBoard.ts`); host test identifies them by it, not colour. Segment test asserts the drawn data (2 points, length 2 sigma1, along the column space); point/circle data asserted; hiding tested over basis, determinant, eigen, iterate, tracedet (also with the conic). Red evidence `.command-logs/lm-b/l3-red.log` (6 mutations, each fails one test, restored).
- Review 4 / smoke D1: one placement in `labelLayout.ts` (backtracking in priority a1, a2, sigma/v or v/Av, conic axes; outward cell first; inside board, no overlap, clear of tick labels and other labelled points, 30 px nearness; relaxed stepwise, greedy fallback). `eigenLabelPlacements` and `ellipsePlacement` removed. Label box model is empirical (MathJax labels sit about 1,5 font sizes beyond the bare offset). Tests `labelLayout.test.ts` (N and E, 930x450 and 380x300 boards, both modes).
- Not changed: source grid window (D2).
- Doubt: at 390 px the sigma2 label of N still sits on the sigma1 segment near the origin (no label overlap); E at 390 has the a1 label over the ellipse curve.
- Checks: logs `.command-logs/lm-b/l3-*.log`; sweeps ran before the last label-model tweak (graph code unchanged since). Screenshots `.command-logs/lm-b/smoke-l3/`.

## Handler review (handler 15)
- Slice L1 stopped at its budget; L2 continued with the handler decision to add the lesson action `set-conic` (L4 scenes must set the conic switch) and accepted the three not-drawn conic statuses (a parabola cannot occur for xᵀSx = 1).
- Sonnet engineering and mathematics review (`.command-logs/lm-b/l-review.md`, `l-check.js` incl. an integer oracle over all quarter-grid matrices for the conic class): no blocking finding. Sonnet smoke (`.command-logs/lm-b/smoke-l/report.md`): nine checks passed, label overlaps (D1) fixed in L3 by one greedy placement for both modes; D2 (source grid only on [−6, 6]) is the spec's grid window, unchanged.
- The handler looked at `smoke-l3/ellipse-non-symmetric-1366.png` and `eigen-non-symmetric-1366.png`.
- Owed: touch drag; the Slovenian eigen help text ("povedana toleranca … nikoli točno") wants rewording; at 390 px N's σ₂ label sits on the σ₁ segment and E's a₁ label crosses the ellipse.
