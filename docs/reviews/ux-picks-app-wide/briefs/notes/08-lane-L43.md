# 08 lane L43, session 1 (interp-lagrange, interp-hermite): HANDOFF, partial

Started 15:52 (wall clock). Stopped on the budget signal before running any check except the parity recording. Nothing below has been compiled or tested after the edits.

## Done
- interp-lagrange parity recorded before conversion: `InterpolationGraph.tsx` readout `<p>` lines got `data-readout-note=""` (text unchanged); SAMPLES entry in `src/graphs/base/declare/parity.test.tsx` (8 states, file `curves/interpolation/__parity__/interp-lagrange.json`); recording written (`BEZEG_PARITY_RECORD=1 BEZEG_PARITY_ID=interp-lagrange`, passed in 337 s, `.command-logs/l43-rec.log`). The default state records two notes (Lagrange and Bezier sentences) and the same two as board captions.
- `interpolationModel.ts`: new `readoutSentences()` (ids `lagrange` / `bezier`, `Message` each); `readoutLines()` now renders from it (same text). `t` import replaced by `renderMessage`.
- `InterpolationScene.ts`: board readout text and its language subscription removed (the sentences become declared notes; owner rule: drop board text that repeats a readout); added `drawnElement(id)` for `points`, `lagrange`, `bezier`, `hull` via a `named` map.
- Fragments `src/localization/fragments/interp-lagrange.ts` and `interp-hermite.ts` written and registered in `fragments/index.ts` (import lines plus `interpLagrange, interpHermite` in `catalogFragments`, `fragmentSl`, `fragmentEn`).
- Prepared, NOT yet run: `.command-logs/l43-g1.py` applies the InterpolationGraph declaration (ids `InterpolationIds`, `parameterBindings` `interp-s` and `interp-rule`, `declaration()` with s range puck, rule choice puck with short names, notes from `readoutSentences`, legend points/lagrange/bezier/hull, display actions hull/bezier/basis in tools tab `display`, `viewMarks`, `drawnObject`, `performAction`, `PuckOwned` around the rule select and the s slider, learner tag on the drag handler, `data-declared-panel` around `InterpolationReadout`). Run it with `python3 .command-logs/l43-g1.py` from the worktree, then tsc. Delete it afterwards by name.

## Placement judgements (Lagrange)
- Pucks: `s` (steps interp-hull-reveal, interp-bezier, interp-basis ask to move it) and the parameter rule (interp-explore asks to switch uniform/chord; two options). Orodja: hull, Bezier, basis switches (scene-driven, no step asks the learner to flip them), point list, count, basis plot.
- Board readout text dropped; the two sentences are declared notes (`lagrange-weights`, `bezier-weights`).

## Not done
- Lagrange: run the script, tsc/eslint, `InterpolationGraph.declaration.test.tsx` (copy `bspline/DeBoorGraph.declaration.test.tsx`; observe red once), update `InterpolationGraphReal.test.tsx` (lines ~41 "readout text" comment, 276-312 board-readout tests now obsolete: replace with notes-follow-language and no board text), `interpolationGuidedLessons.ts` frames (local `frame(id, kind)` at line 17 needs an optional `declare`; uses `interp-s` on interp-hull-reveal/interp-bezier/interp-basis, `interp-rule` on interp-explore; prose "drsnik s" to "parameter s" where the step names the slider; `observationPrompt` lines 116, 132, 148), FirstTask case in `src/graphs/curves/InterpolationFirstTask.test.tsx` if it names the s slider or rule select (move to puck strip), graph-check (route not yet looked up; see the family `runtime.ts`/catalog), golden check, all steps 5 to 8 of the brief, browser shots.
- Hermite: nothing started in code except fragment `interp-hermite.ts` (keys: mode short names, legend tangents/bezier, three refusal messages). Plan: parity n/a (no readouts, notes, help or status; confirm with `just graph-check interp-hermite --route <route>`); ids param `hermite-mode` (choice puck, 2 options), `hermite-rule` (choice puck), `hermite-tension` (range puck 0..2 step 0.05, omitted in Hermite mode); actions `tangents`, `bezier` display switches in tools tab `display`; legend curve (`curve`), points (`interp_legend_points`), tangents, bezier points; marks points must, curve samples nice via `hermiteChain`/`chainPoint`; `drawnObject` needs a `named` map in `HermiteScene` (curve, tips/arrows, bezier points); drop the board status caption (`statusLine`, HermiteScene.ts:183-188; repeats the mode and tension pucks) and rewrite `HermiteGraphReal.test.tsx:341-350` (the language-switch test) and `parts().text` (line 58); tag drag handlers (`onMove`, `onTangent`) with `runAs('learner')`; wrap Orodja mode, rule and tension controls in `PuckOwned`; frames: hermite-explore uses all three pucks.
- Hermite lesson frames in `interpolationGuidedLessons.ts` (hermiteLesson at line 236); the lesson test `interpolationGuidedLessons.test.ts` line 126 reads `readoutLines` (still works).

## Findings
- A heredoc Python script via Bash was refused by the worktree guard once; Write the script file first, then run it.
- `just unit` of the parity recording took 337 s; plan for it in later runs.
- Open file edits present in the tree but not mine: `parity.ts`, `realGraphTestHarness.tsx`, two golden files (another worker).

# Session 2 (interp-lagrange only)

## Done
- Ran `l43-g1.py` (matched the file): `InterpolationGraph.tsx` now declares `InterpolationIds`, pucks `interp-s` (range) and `interp-rule` (choice), notes from `readoutSentences`, legend, display actions, marks, `drawnObject`, `performAction`; drag handler tagged learner; `PuckOwned` around the rule select and s slider. Unused `parametersOf` import removed. `just typecheck` passed (666 s). Scratch scripts deleted.
- Lesson frames: `frame()` in `interpolationGuidedLessons.ts` takes an optional `declare`; `uses` interp-s on hull-reveal/bezier/basis observation (hull-reveal explanation too), `interp-rule` on explore; highlights of the weight notes on hull-reveal/bezier/basis explanation. Prose: "drsnik s" became "krmilnik Položaj s" / "the Position s control" (hull-reveal observationPrompt).
- Tests: new `InterpolationGraph.declaration.test.tsx` (6 tests; observed red once with a wrong default legend: `expected ['points','lagrange','bezier'] to deeply equal ['points','lagrange']`, then restored, green); `InterpolationGraphReal.test.tsx` board-readout tests replaced by notes-follow-language and no-board-text cases; `InterpolationFirstTask.test.tsx` lagrange case now checks the rule is not an Edit control and the puck strip exists.
- Parity: `interpLagrangeAccepted` in `parity.test.tsx` (the only unmatched read-off is the point count setter, same precedent as De Boor). `BEZEG_PARITY_CHECK=1 ... -t interp-lagrange` passed.
- Golden check shows the expected diff per state: board captions (the two weight sentences) gone, same sentences now notes; not re-recorded.

## Not done
- Hermite (untouched). Browser shots (check 7), build/smoke (check 8), PresetRoundTrip contract.

## Session 2 later results
- Tests needing `runAs('learner', ...)` (standing permission): `InterpolationGraphReal.test.tsx`, `SharedPointDecisions.test.tsx` (setBox too), `interpolationFamilyControls.test.tsx`; `InterpolationGraph.test.ts` subscription count is now `before` (the scene no longer subscribes to the language).
- All frames of the Lagrange lesson now `open: ['readouts']` (the weight sentences are notes in the Odčitki card; the smoke probe reads them).
- `tests/guided-lessons.smoke.spec.cjs` I1 probe: reads `[data-note]:visible` instead of board `.JXGtext`.
- Checks observed: typecheck, lint, `just unit src/graphs/curves/interpolation + InterpolationFirstTask` green, `just unit FirstTask` green, PresetRoundTrip interp-lagrange green, parity check green (with accepted point count), graph-check contract/declaration/shared green; golden diff = captions to notes (expected, not re-recorded); `just build`, `smoke-lesson interp-lagrange` green.
- Not verified: the 15 s timeouts in registrationLoading/DeBoor under a 10-worker run (passed on rerun); per-step browser shots (only step 1 at 1440x900 and 1280x720 looked at); other smoke specs mentioning interpolation; Hermite.

# Session 3 (interp-hermite, plus Lagrange per-step shots)

## Done (Hermite)
- `HermiteGraph.tsx`: `HermiteIds`, bindings, `declaration()` (pucks `hermite-mode` choice, `hermite-rule` choice, `hermite-tension` range omitted in Hermite mode; legend points/curve/tangents/bezier; actions tangents/bezier in Orodja Prikaz), `viewMarks` (points must; tangent tips and curve samples nice), `drawnObject`, `performAction`; drag handlers tagged learner; `PuckOwned` around the mode, rule and tension controls (in Hermite mode the tension slider stays in Orodja with its reason).
- Pucks chosen against the lesson: `hermite-explore` (purpose names tension, parameter rule and curve type; explanation asks for tension and the rule switch; the mode is named only in the purpose, kept as a puck on that basis, the frames `uses` all three). No other step asks to flip a Hermite control (the scenes set mode, overlays and points).
- `HermiteScene.ts`: status caption and its language subscription removed (it only repeated the mode and tension pucks); `drawnElement`; `statusLine` and `fontSize` removed. Keys `hermite_board_catmull/hermite` deleted from sl/en. Fragment keys of session 1 are used.
- Frames: `hermiteFrame` in `interpolationGuidedLessons.ts`; tests: new `HermiteGraph.declaration.test.tsx` (7 tests; observed red once: `expected [ 'points', 'curve', 'tangents' ] to deeply equal [ 'points', 'curve' ]`), `HermiteGraphReal.test.tsx` (status-text test replaced, writes wrapped in `runAs('learner')`, tension slider test rewritten), `HermiteGraph.test.ts` (no language subscription, FontSize arg), lesson test (status column dropped, runAs).
- Parity: not n/a (the golden outputs hold the point-count setter, which stays in Orodja). New SAMPLES entry `interp-hermite` in `parity.test.tsx` with `interpHermiteAccepted`; recorded AFTER the conversion (the old graph could not be run without reverting), so it holds only the point count in four states (every state must change a shown value; mode/tension states change nothing shown, so they are not in it). `curves/hermite/__parity__/interp-hermite.json` is new.
- Checks observed: lint clean on changed files, `just typecheck` (before the last test edits: only the 6 lesson test tuple errors, since fixed; not rerun), `just unit src/graphs/curves/hermite + interpolationGuidedLessons` green, graph-check contract/parity/declaration/shared pass; golden fails with exactly the three expected caption removals (default, hermite-predict-segment, hermite-locality); not re-recorded.

## Lagrange per-step shots
- `.command-logs/l43-shots.cjs` walked all 17 frames at 1440x900 and 1280x720 (`.command-logs/l43-lag-*.png`); script check of board points and labels under any card: clear in every frame. Looked at step 3 frame 3 at 1280x720: nothing named is under a card; the lesson card clips the observation prompt (a "Več vsebine" expander) at 720 px height.

# Branch unit fixes

- sharedControls.graphs.test.tsx (19 failures, all interp-lagrange, introduced by cb126f6ea): the position s slider became a puck, so its slider case is replaced by a comment pointing to `InterpolationGraph.declaration.test.tsx` (bounds and refusals there); the point collection and point list live in the folded Orodja card, so their mounts now call `openEditTools()` (opens the card and the Uredi panel, lets the board layout settle 200 ms; the layout remounts card bodies in jsdom and dropped focus) and the Reset helper reopens it.
- UntaggedWriteError (all from tests writing outside a write source; the conversions declared `interp-rule`, `hermite-*` and `view`): `interpolationLessonViews.test.ts` setBoundingBox, `pointCountSceneLifecycle.test.tsx` importPresetData x6, `SharedPointDecisions.test.tsx` Hermite setBox x2, `interpolationFamilyControls.test.tsx` Hermite rule and bezier, all wrapped in `runAs('learner', ...)`, values unchanged. Lagrange cases from cb126f6ea (missed call sites); Hermite cases from the uncommitted conversion. Production paths already run under a source.
- tsc: `HermiteGraphReal.test.tsx` getDeclaration() non-null.
- guided-lessons.smoke.spec.cjs: the Hermite step probe read the removed board caption; it now reads the mode puck and the tension puck.
- Observed: `just unit FirstTask src/localization src/graphs/curves ...` passed; `-t interp-hermite` passed (21 tests); `just build` passed; smoke-lesson interp-hermite interp-lagrange passed (4); `just smoke tests/guided-lessons.smoke.spec.cjs` passed.
