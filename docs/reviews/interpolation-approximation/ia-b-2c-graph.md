# IA-B-2c: `interp-least-squares` graph (lesson I4), evidence

Unreviewed worker output; not registered (no route, catalog entry, `graphFactories` entry or lesson). Only the Preset collection key `interp-least-squares` is new.

## Files
- `src/analysis/leastSquaresModel.ts` (+ `.test.ts`): model `{points, degree, manualLine, slope, intercept, showSquares, showNormalEquations}`, check/parse/edit rules (issues are data), `leastSquaresFit` (kernel RangeError becomes reason too-few / vertical / underdetermined / rank), `leastSquaresView`, `normalEquations` (degree <= 2).
- `src/graphs/functions/LeastSquaresGraph.tsx` (extends `BaseFunctionGraph`; draggable points are plain JSXGraph points, as in `FunctionTransformationGraph`), `leastSquaresMessages.ts`, `LeastSquaresGraph.host.test.tsx` (25 tests).
- `src/graphs/functions/functionPresetCollections.ts`: `interp-least-squares` entry with a diagnosis.
- `src/localization/sl.ts`, `en.ts`: 48 `interp_lsq_*` keys in lockstep, appended after `interp_runge_board_key`.

## Decisions
- Degree range 1..min(points-1, 5); the model never holds a larger degree (edit or file refused). Removing a point clamps the degree to points-1. 2 to 12 points.
- Limits: coordinates +-20, slope +-10, intercept +-20. Drag snaps to 0.1. Nothing is clamped silently on import.
- Default view [-1.5, 9, 5.5, -2] with unequal axis units; squares have width |r| * unitY / unitX, recomputed on every board update, so they stay square on screen.
- Manual mode: the drawn line and residuals use the manual line; the shown optimal sum of squares is the best line's.
- Normal equations are MathJax display math in the inspector (no KaTeX in the repo), only for degree 1-2; matrix from the kernel, coefficients from QR.
- Vertical or too-few data: no curve, a localized reason in the inspector and caption, readouts "not determined".

## Mutation checks (observed failing, then restored)
- Readout sum of squares scaled by 0.99: 5 fail (of 62 in model + host files).
- Squares width without unitY/unitX: 1 fails (squares true on screen).
- Degree clamp dropped in `removeLsqPoint`: 2 fail.
- Manual-mode sum of squares replaced by the fit's: 4 fail.
- Check drops the `showSquares` field: 2 fail (file rejection, round trip).
- Drawn residuals shifted by 0.001: 5 fail. Orthogonality was only asserted on the kernel residuals, so a test on the residuals the view draws (degrees 1-3, <= 1e-10) was added to `leastSquaresModel.test.ts`; with it the same mutation fails 3 of 40 model tests.
- Not mutated: normal-equations vs QR coefficients (asserted against an independent Gauss solve in `leastSquaresModel.test.ts`, and on-screen numbers in the host test); unmount cleanup (shared base, but asserted by the dispose test).

## Checks run
- `just unit src/graphs/functions src/analysis src/inputs src/localization`: 108 files, 2448 tests passed (log `C:/Users/1337Hacker/.claude/jobs/0adf987a/tmp/ia-b-2c-unit.log`).
- `npx tsc --noEmit --pretty false`: first run found one error in the host test (string `includes` on a palette tuple, line 33); fixed with a `string[]` widening; clean afterwards. Host tests rerun: pass.
- `just lint` on the touched source files: passed.
- Reviewer-sensitive points confirmed by host tests: point count cannot go below 2; the degree stepper's maximum follows the point count; vertical data show the localized reason (SL and EN) and no curve; language switch keeps model and readouts; dispose leaves 0 owned objects and no board update after unmount.

## Not verified
- No browser, no MathJax typesetting in a real browser (tests read the LaTeX source), no keyboard or touch walk, no production build.
- Slovenian copy not reviewed by the owner.

## Handler acceptance (curves handler 25, 2026-11-02)

Two workers: the first reached its 135k budget (HANDOFF, partial); a fresh worker added the mutation checks, one orthogonality test on the drawn residuals and a test-file type fix. Reviews (`bezeg-reviewer` Sonnet): engineering + UI, no blocking or should-fix; mathematics, spec values recomputed with exact fractions (normal system \([[4,6],[6,14]]c=(9,18)\); quadratic residuals \(-0.15, 0.45, -0.45, 0.15\); outlier residuals \(0.9, -0.2, -2.3, 1.6\)), square scaling \(w=|r|\,u_y/u_x\) confirmed, no blocking or should-fix.

Deferred nits (to the I4 registration and lesson slices):
- Residuals and normal-equation entries are rounded to 3 decimals without "≈"; a residual of 0.0004 shows as 0, and the cubic SS (float noise) shows as 0.
- In manual mode the normal-equations display shows the best line's system without saying so.
- Point-count buttons disable at 2 and 12 without a reason text (shared `CountSetter` pattern; a cross-graph change).
- Squares extend to the right of the point and can be cut at the view edge for large residuals near the right border.

Handler checks: the completion worker's broad run `just unit src/graphs/functions src/analysis src/inputs src/localization` (108 files, 2448 tests), `tsc` and `just lint` on the touched files; `just build` passed on the final tree (20:03Z). No browser check: no route yet (at registration).
