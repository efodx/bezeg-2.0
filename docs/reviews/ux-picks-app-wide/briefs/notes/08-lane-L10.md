# Lane L10 (euler-method), round 4: PARTIAL handoff (budget signal at 135k input)

## Done (observed)
- Parity recorded BEFORE conversion: sample `euler-method` in `src/graphs/base/declare/parity.test.tsx` (9 states, each sets every field), recording `src/graphs/functions/__parity__/euler-method.json` (rows h, steps, end, value, exact, error, double-error, ratio; one note; outputs = the step slider's "0,5").
- `src/graphs/functions/EulerGraph.tsx` converted: `EulerIds`, `drawn` map, `parameterBindings` (euler-step as count index 0..4 = halvings of 1, euler-end range, euler-example choice), `declaration()` (step count puck `k` "Razpolovitve", end range puck, example choice in Orodja, legend of four), `functionPanel()` (rows, note, statuses, `must` = every visible Euler node), `drawnObject`, `renderReadout` (declared readout plus `FunctionStatus` keeping `data-euler-status`), `renderLegend` null, `PuckOwned`/`PuckOwnedGroup` around the step and end sliders. Reveal buttons, initial point editor and exact switch stay in Orodja undeclared (points are board-owned rows/legend only; display switch no lesson asks the learner to flip). `just typecheck` passed after this.
- Fragment `src/localization/fragments/euler-method.ts` (halvings name/help, three equation labels) registered in `fragments/index.ts` (import plus catalogFragments, fragmentSl, fragmentEn).
- Lesson frames in `src/learning/content/numericalEulerGuidedLesson.ts` (FOCUS table, `eulerFrame`, `frame(..., declare)`): written, NOT yet run through declarationContract.

## Not done
- `EulerGraph.declaration.test.tsx` (copy `RootFindingGraph.declaration.test.tsx`: states over default, h 0.25, blow-up stop, end at x0, revealed; values vs kernel `eulerView`; bindings: euler-step write 2 reads 2 and h 0.25, refused 9; red check breaking a row value, quote failure).
- Checks never run: `just graph-check euler-method --route <route from runtime.ts>`, parity check (`BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=euler-method`; expect the slider read-off "0,5" to need coverage by row `h` or an `accepted` entry; messageNumber(v,4) vs recorded text unverified), golden check (stop and report any difference that is only moved read-offs), `just lint`, `just unit src/graphs/functions src/learning/content/declarationContract src/localization src/graphs/base/declare`, `just build`, smoke (`just smoke-lesson euler-method --port 4391 --workers=1`).
- Existing tests to update for the puck: `EulerGraph.host.test.tsx` line ~76 (`getByRole('slider', {name: 'Korak h'})` and tests using the end slider) now lack the Orodja sliders (puck owns them when the workspace card layer provides ownership; in the plain host the PuckOwned wrapper may still render; check). `AnalysisFirstTask.test.tsx` euler case if it asserts the first control leads Edit. tests/guided-lessons.smoke.spec.cjs `eulerMethod` (line ~2406) locators for the step and end controls.
- Possible issues to look at: `must` of every node may push the view; declaration `help` for euler-end reuses the rejection hint text (consider dropping); `data-parity-retained` on the PointListInput group if parity reports extra outputs; frames' `open: ['tools']` for example choice (steps error-ratios, euler-explore).

## Placement judgements
- Step size and end x: pucks (flipped and compared while the polyline and errors are watched); step is a 5-value discrete list, so it is a count of halvings `k` (a choice puck allows at most 4 options).
- Equation: Orodja (setup, replaces the whole scene).

## Scratch files left (delete)
`.command-logs/l10-new-tail.txt`, `.command-logs/l10-splice.py`.

## Continued (round 5)
- Added EulerGraph.declaration.test.tsx (6 states vs kernel, blow-up, arbiter writes); red check: row steps +1 failed "expected '3' to be '2'", reverted.
- euler-end help now euler_ode_end_help (fragment, sl+en). Host test, AnalysisFirstTask (euler case + puck test) updated; smoke row has no control locators.
- Parity: accepted entry eulerAccepted (missing output: step slider read-off "0,5", row h shows it). graph-check: contract/parity/declaration pass; golden differs ONLY by slider read-offs gone from outputs (handler re-records).
- typecheck, lint, unit set, build, smoke-lesson euler-method pass.
