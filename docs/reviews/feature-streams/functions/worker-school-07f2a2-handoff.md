# Handoff: school 07 F2a-2 (S6 conic focal view), partial

## State
Kernel, model, tests, messages, localization keys and preset collection are written. `ConicFocalGraph.tsx` is written but has NOT been type-checked, linted or host-tested. `npx tsc --noEmit --pretty false` was started in the background (log: `C:\Users\1337Hacker\.claude\jobs\dc88fd22\tmp\school07\tsc1.log`) and its result was never read.

## Files touched (nothing committed)
- `src/analysis/conic.ts`: added `matchedConicArc(conic)` and `MatchedConicArc`. Ellipse/circle use the `quarterEllipseBezier` quarter arc placed with centre and axes, going vertex to upper co-vertex. Parabola/hyperbola use the arc vertex to latus-rectum endpoint: P1 is the tangent intersection, and the weight comes from a stable quadratic. The parabola returns w1 = 1 directly (analytic lambda = 1/2, no snap needed).
- `src/analysis/conic.test.ts`: added a "matched Bezier arc" describe block.
- `src/analysis/conicFocalModel.ts` (new): model `{focusX, direction, ell, epsilon, phi, bridge, weight|null}`, examples ellipse/parabola/hyperbola/circle/bridge, validation (`checkConicFocalModel`), setters (epsilon, l and weight rounded to 1e-12), `conicOfModel`, `conicPointAt` (clamps P to the cut radius 50 and over the hyperbola gap), `conicPhiNear` (drag), `conicFocalView`.
- `src/analysis/conicFocalModel.test.ts` (new): ratio = e, spec numbers, slider reaches exactly 1 and 0, circle without directrix, bridge classification, deviation, import rejection.
- `src/graphs/functions/conicFocalMessages.ts` (new).
- `src/graphs/functions/ConicFocalGraph.tsx` (new, unchecked).
- `src/graphs/functions/functionPresetCollections.ts`: added `conic-focal`.
- `src/graphs/functions/functionPresetCollections.test.ts`: added conic-focal import and field-error tests.
- `src/graphs/base/presets/PresetCatalog.test.tsx`: added `conic-focal` to `PENDING_ROUTE_KEYS`.
- `src/localization/en.ts`, `src/localization/sl.ts`: 68 `conic_*` / `invalid_conic_*` lines each, appended at the end, in lockstep.
- Helper script `C:\Users\1337Hacker\.claude\jobs\dc88fd22\tmp\school07\addkeys.py`: already run. Do NOT re-run it, it would duplicate the keys.

## Checks run
- `just unit src/analysis/conic.test.ts`: passed.
- `just unit src/analysis/conicFocalModel.test.ts src/analysis/conic.test.ts`: first run 2 failures (a test assumed the wrong directrix normal sign, and a -0 comparison). Both were fixed in the test file. The rerun printed no FAIL lines; I did not read the pass count.
- The model1.log and model2.log logs are in the tmp/school07 folder.

## Remaining
1. Read the tsc result and fix errors. Suspects: the `t(\`conic_kind_${kind}\` as const)` and `t(\`conic_example_${id}\` as const)` calls (the typed-t rule forbids casts; if TS rejects them, use explicit switch maps), and the `JXG.Point` type.
2. Write `src/graphs/functions/ConicFocalGraph.host.test.tsx`, copying `GeometricSeriesGraph.host.test.tsx` structure, with no scheduler. It needs:
   - mount: readouts match the spec numbers for each example;
   - the epsilon slider lands on exactly 1 and 0;
   - circle: the ratio readout shows the "undefined" text and no directrix is visible;
   - bridge toggle is off by default; weight departs from the matched value and deviation grows; the matched-weight button resets;
   - the P drag keeps the ratio = e;
   - unmount gives `generatedObjectCount` 0 (StrictMode too);
   - import rejection messages in both languages;
   - optional timing of one epsilon update (median/p95).
3. Run `just unit src/graphs/functions src/analysis src/localization src/graphs/base` (log to file), `just lint` on touched files, and tsc. Add the localization/notation tests if they flag the new strings.
4. Run the mutation list: break each of ratio = e, e = 1 rounding, circle directrix, bridge classification, matched deviation, spec numbers, import validation and disposal, and report the failing test for each. None have been run.
5. Update the `docs/tasks/school-function-graphs/07-batch-c.md` F2a S6 line.

## Flags and decisions
- P is stored as the polar angle phi from F, valid for any e. The shown point is clamped (`conicPointAt`), so changing e never invalidates it.
- The hyperbola second branch is reachable through phi and the drag.
- The ellipse bridge always uses the quarter arc (w = sqrt2/2), the other kinds use vertex to latus-rectum endpoint.
- Slovenian terms chosen: "polparameter" for the semi-latus rectum, "utež", "teme / stransko teme". These are my own choices and are unverified.
- No lesson actions (`lessonFunctionActions`) are exposed; that belongs to F3.
- The ConicFocalGraph.tsx file was changed on disk by someone after my last write (likely the background sed, which removed the unused `NOT_A_NUMBER_TEXT` import). I did not read it back.
