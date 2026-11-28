# L34 (polynomial-zeros, rational-function): PARTIAL (budget handoff), both graphs converted

## Done (observed)
- Parity recorded before the conversion: SAMPLES `polynomial-zeros` (10 states), `rational-function` (10 states) in parity.test.tsx; `functions/__parity__/polynomial-zeros.json`, `rational-function.json`.
- PolynomialZerosGraph: `PolynomialZerosIds`, `drawn`, `functionPanel()` (rows rule/degree/end/y-intercept/zero-i, note, plotted p, must = zeros), `declaration()` (legend curve/derivative/zero, action puck `derivative`), `performAction`, `drawnObject`, `PuckOwnedGroup` around the derivative RevealButton, old legend removed.
- RationalFunctionGraph: `RationalFunctionIds`, `drawn`, `parameterBindings` (probe), `declaration()` (probe range puck, legend curve/numerator-zero/denominator-zero/hole/asymptote, entries only while drawn), `drawnObject`, `functionPanel()`, `PuckOwned` around the probe slider, old legend removed.
- Fragments `polynomial-zeros.ts`, `rational-function.ts` (pass-through `*_text_value`, `polynomial_zeros_end_full`, `polynomial_zeros_derivative_name`, `rational_function_probe_name`) registered in fragments/index.ts.
- Frames: `schoolFunctionGraphsBatchBGuidedLessons.ts` steps carry `declare`/`observe` (highlight rows; `uses` derivative in poly-explore, probe in rat-remainder and rat-explore).
- Tests: two `*.declaration.test.tsx`; host tests adapted (derivative via `performAction`/declaration; probe via arbiter write); FunctionsFirstTask: polynomial `toggle-derivative` and rational probe now puck cases (plan entries removed).
- Checks observed: tsc clean (after frames); `just graph-check polynomial-zeros --route /functions/polynomial-zeros` PASS (contract, parity, golden, declaration 7, shared 11); `just graph-check rational-function --route /functions/rational-functions` PASS (same). `just unit` PolynomialZerosGraph, RationalFunctionGraph, FunctionsFirstTask: passed (before the last FirstTask edits? ran after; 44 tests, then rational host fix rerun passed).
- Red check (poly `pressed` forced false; rational `drawnObject` visible forced false): 7 failures, e.g. "expected [ [ 'derivative', false ] ] to deeply equal [ [ 'derivative', true ] ]", "curve: expected { color: '#587445', visible: false } to match object { visible: true }". Both mutations reverted.
- Golden: no diff in either state (both graph-check golden pass).

## Placement
- polynomial: derivative = board switch puck (steps poly-double, poly-triple, poly-explore compare p with p'); zeros stay board gliders plus the ZeroListEditor row editor; k and the example (3 options + custom) stay in Orodja (setup, no step asks to set them).
- rational: probe x = board range puck (step rat-remainder: "move the slider"); k, example, both zero lists stay in Orodja. Legend defaults (bottom right) not checked in a browser.

## Not done / unverified
- `just lint <changed files>`, `just unit src/graphs/functions src/learning/content src/localization src/graphs/base` full dirs, `just unit FirstTask` rerun, `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t polynomial-zeros` and `-t rational-function`, `schoolFunctionGraphsBatchBGuidedLessons.test.ts` and declarationContract not run separately.
- Shots at 1440x900 and 1280x720 per lesson step, build, smoke-lesson, `tests/*.spec.cjs` naming polynomial-zeros / rational-function (not touched).
- Board captions (rule, degree, "no asymptote") stay board-drawn and also repeat the Pravilo row (rule caption: projection needs it; not dropped, golden unchanged).
- Row texts are baked at declaration time through `*_text_value` pass-through messages (as linear's equation); the end and zero rows of polynomial are nested messages.
- Scratch to delete: `.command-logs/l34-*.cjs`, `l34-*.txt`, `l34-*.log`. No parity report files were created.

## Session 2 (complete)
- Review 1: pass-through `*_text_value` removed. New `src/graphs/functions/formulaMessage.ts` (`formulaMessage`: kernel text with "en" decimals -> nested `function_formula_join` messages, numbers as `MessageNumber`; `joinedMessage`). Key `function_formula_join` lives in fragments/polynomial-zeros.ts (sl+en). Rational text rows (zeros, holes, poles, asymptote, division) are now Messages with messageNumber params. Tests: language-switch case in both `*.declaration.test.tsx` (stale declaration row re-rendered in en: "0,5" -> "0.5"); not observed red against the old pass-through.
- Review 2: board captions dropped in both graphs (rule, degree, rational degrees, "no asymptote"); keys `polynomial_zeros_board_degree`, `rational_function_board_degrees`, `rational_function_board_no_asymptote` deleted from sl/en. Golden diff: captions only (rows/legend unchanged).
- Shot fix: rational probe label flips left of the probe (and 16 px down) when the probe is in the right 40% of the view, so it no longer slides under the Odcitki card (RationalFunctionGraph.tsx probeObjects).
- Checks passed: tsc, eslint (changed files), unit dirs functions/learning-content/localization/base (742s), FirstTask, PresetRoundTrip both ids, graph-check contract/parity/declaration/shared both, build, smoke-lesson polynomial-zeros rational-function, per-step shots 1440x900 and 1280x720 viewed (no "Prizora ni mogoče pripraviti").
- Not run: separate tests/*.spec.cjs beyond guided-lessons.smoke (only that file names the ids).
