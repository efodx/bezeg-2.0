# Lane L36 notes (projective-pascal, projective-pole-polar), round 13

Started 11:00; Pascal declaration + test + frames green at about 11:20.

## projective-pascal
- Parity first: `PascalControls.tsx` panel had no `data-readout-note`; markers added (text unchanged), sample + `__parity__/projective-pascal.json` recorded (8 states).
- Declaration: notes status, hexagon, determinant, point-1..3, line (`pascalMessages` in `pascalText.ts`, same catalog keys as the panel); legend conic, sides, line, points, infinity (arrow), handles; marks must = six handles + finite in-box Pascal points; no parameters (points board-owned, rest not bound in the arbiter).
- Pucks (judgement): order (3 options) because step `pascal-order` asks to switch orders and compare the lines, and `pascal-explore` asks to change order; conic (4 options) because `pascal-explore` asks to choose among the four conics. Both are action groups (`order-*`, `conic-*`), Orodja selects wrapped in `PuckOwned` (`pascal-order`, `pascal-conic`). A hexagon order that is none of the three named ones (import) declares no order puck, so the Orodja select with the "custom" entry stays. Example select stays in Orodja (scene setup).
- Test `ProjectivePascalGraph.declaration.test.tsx` (file prefix rule of graph-check). Red once: marks `y + 1` failed 8 of 13 (`.command-logs/l36-pd-red.log`), restored.
- Frames: `projectiveConicsGuidedLessons.ts` Pascal steps (explanation/calculation/observation as the step has them).

## projective-pole-polar (partial)
- Parity first: panel already had `data-readout-note`; sample + `__parity__/projective-pole-polar.json` recorded (9 states).
- Declaration: notes status, polar, tangent-1/2, tangency-1/2, numerical, centre (`polePolarMessages`, status joins via fragment key `projective_pole_polar_join`); legend conic, polar, tangents, tangency, centre, point, infinity; marks must = P (or arrow end + text spot when ideal), finite tangency points, finite centre. No pucks: no K3 step asks the learner to set or flip a control (P is dragged, board-owned; example/conic/kind of P are setup).
- Test `ProjectivePolePolarGraph.declaration.test.tsx` (12 pass). Red once: centre note text replaced by the status; 9 of 12 failed (`.command-logs/l36-pp-red.log`), restored.

## HANDOFF (budget), state at stop
Done (tsc clean at last run, before the red/restore): both declarations, fragments registered in `fragments/index.ts`, both declaration tests, parity recordings, Pascal lesson frames, declared-panel wrappers, Pascal PuckOwned selects.
Unverified / not run: lint; `just graph-check` for both ids; golden check (expect notes now appear where the golden has none; report, never re-record); the family/learning/localization unit run; `just unit FirstTask`; preset round trip; browser shots; `just build`; smoke-lesson; tests/*.spec.cjs.
Next: (1) pole-polar lesson frames in `projectiveConicsGuidedLessons.ts` (`polePolarFrame = frameDeclarer<PolePolarIds>()`, highlight notes by step, `open: ['readouts']`, no `uses`); (2) run checks 1,3,4,5,6,7; (3) shots; (4) build + smoke. Watch: Pascal puck selects (`PASCAL_ORDER_PUCK`, `PASCAL_CONIC_PUCK` in PascalControls.tsx) may need a FirstTask/host-test update; Pascal host tests may assert the Orodja selects.
New files: `src/localization/fragments/projective-pascal.ts`, `projective-pole-polar.ts`, `src/graphs/projective/ProjectivePascalGraph.declaration.test.tsx`, `ProjectivePolePolarGraph.declaration.test.tsx`, `src/graphs/projective/__parity__/projective-pascal.json`, `projective-pole-polar.json`. Edited shared: `src/graphs/base/declare/parity.test.tsx` (two SAMPLES), `fragments/index.ts`.
No catalog keys to delete from sl.ts/en.ts (none retired).

## Session 2 (finish)
- Pole-polar frames added (`polePolarFrame`, `open: ['readouts']`, at most 3 highlights per frame; the two tangency-2 / tangent highlights dropped by the contract).
- Declaration tests renamed to `PascalGraph.declaration.test.tsx`, `PolePolarGraph.declaration.test.tsx` (graph-check needs the graph file's own basename; session 1 names were wrong).
- Pascal: six rows `handle-1..6` (name "Točka A", value coordinates) because the recording holds the six slider read-offs; accepted `extra row handle-N` in `pascalAccepted` (parity.test.tsx). Rows use `name`, not `symbol`: a `symbol` row made the jsdom card layout wait on MathJax, so the puck strip stayed hidden.
- Tests moved to the strip: PascalGraph.host.test (order/conic via `chooseOnPuck`, `openTools()` before the point slider), PascalLessonActions.host.test (conic and order via pucks, `after` async), ProjectiveFirstTask.test (conic label dropped from the Edit order; new case: conic and order pucks on strip, absent from Edit).
- Checks: tsc clean, lint pass, graph-check pole-polar PASS; pascal PASS except golden (notes only, golden recorded without notes: default, pascal-drag, pascal-pappus, pascal-infinity, pascal-explore); family/learning/localization unit pass; FirstTask pass; round trip both pass; build pass; smoke-lesson both pass; only guided-lessons.smoke.spec.cjs mentions the ids.
- Shots `.command-logs/l36-{pascal,polar}-{1440,1280}-s1..s7.png` (all seen for a subset: no named point/label under a card; board view as master default).
