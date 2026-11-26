# 08 lane L08: reduction (handoff note, PARTIAL: budget stop)

## Done
- Parity recorded BEFORE converting: SAMPLES entry `reduction` (6 states) in `src/graphs/base/declare/parity.test.tsx`, recording `src/graphs/curves/reduction/__parity__/reduction.json` (notes only: 5 sentences per state, no rows/outputs; 2 captions). `reductionAccepted` added (extra note: readout help; missing output: point count) but NOT yet run with BEZEG_PARITY_CHECK; remove the `missing output` entry if the check does not need it.
- `ReductionOverlay.ts`: pure `reductionOf(rows, mode)` (the old result computation moved, math untouched), `legendElements()`; the `details` controller setting removed.
- `DegreeReductionGraph.tsx`: `declaresCurveWorkspace()` true; `ReductionIds`; `declaration()` = common curve declaration + 5 notes (third, reducible, max-error, l2-error, bound, same catalog keys as the old list, via `messageNumber`), `readoutHelp` = tolerance sentence, section card `approximation` (approximation sentence), legend entries reduced / reduced-points / elevated-net (only while shown), actions: end-point choice as an action-group puck (`reduction-fixed`/`reduction-free`, group key `reduction-mode`, shorts Fixed/Free), `reduction-shown` and `reduction-elevation-shown` as Orodja display switches; memoized marks add quadratic and net points; `drawnObject`, `performAction` (as learner). Old ReadoutDetails list removed; mode ChoiceSelect wrapped in `PuckOwnedGroup`; the two switches moved to `workspaceGraphDisplay`. Live region kept.
- Fragment `src/localization/fragments/reduction.ts` (+ registered in `fragments/index.ts`): puck_ends, puck_fixed, puck_free, legend_quadratic, legend_quadratic_points, legend_net.
- Lesson text (`degreeReductionGuidedLessons.ts`): "Tools panel/podoknu Orodja" now "Readouts card/kartici Odčitki"; free-step prompt names Fixed/Prosti.
- New `DegreeReductionGraph.declaration.test.tsx` (6 states vs kernel, actions test, language test): NOT yet run. `DegreeReductionGraphReal.test.tsx` adapted (detailLines reads declared notes; list test; combobox assertion replaced with absence): 23 of 24 passed before the last fix.

## Open (not done)
1. Run `just unit src/graphs/curves/reduction`, then the red check (e.g. `maxError` note value +1 in the declaration) and quote the failure.
2. Parity check: `BEZEG_PARITY_CHECK=1 BEZEG_PARITY_ID=reduction just unit src/graphs/base/declare/parity.test.tsx`; golden check; `just graph-check reduction --route /bezier/reduction`. If golden differs only by moves, report verbatim.
3. Lesson frames: no `declare` yet. Add optional `declare` to local `frame()` in the lesson file; observation frames: highlight notes (ids above) per text (not for predicted values: steps 2, 4, 5), `uses: ['reduction-free','reduction-fixed']` on step 5, `open: ['legend']` where the net is compared (steps 1, 4). `ReductionIds` is exported.
4. `tests/guided-lessons.smoke.spec.cjs:2697` locates the mode by `getByLabel(Krajišči kvadratne krivulje)` combobox; must read the choice puck instead (look at how other stepProbes read `[data-puck-key="reduction-mode"]` pressed segment). `degreeReductionGuidedLessons.test.tsx:320` still expects 'Orodja'/'Tools panel' in step 3 prose: change to 'Odčitki'/'Readouts'.
5. Check `src/graphs/curves/*FirstTask.test.tsx` for a reduction case; run `just typecheck`, `just lint` on changed files, `just unit src/graphs/curves src/learning/content/degreeReductionGuidedLessons.test.tsx src/learning/content/declarationContract src/localization src/graphs/base/declare`, `just build`, `just smoke-lesson reduction --port 4391 --workers=1`.
6. Not browser-checked: puck label lengths (group "Krajišči", shorts ≤6), legend place, the board lesson walk (marks include quadratic and net points).

## Placement judgements
- Puck: end-point choice (2 options; lesson step 5 asks to switch and compare errors). Orodja: reduced-quadratic and elevated-net switches (display, set per scene by the lesson, never flipped), point editor (retained). Control polygon and hull: base pucks.

## Files
src/graphs/curves/reduction/{DegreeReductionGraph.tsx, ReductionOverlay.ts, DegreeReductionGraph.declaration.test.tsx (new), DegreeReductionGraphReal.test.tsx, __parity__/reduction.json (new)}, src/graphs/base/declare/parity.test.tsx, src/localization/fragments/{reduction.ts (new), index.ts}, src/learning/content/degreeReductionGuidedLessons.ts.
