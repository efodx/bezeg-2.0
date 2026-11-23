# Task 02: files each pilot conversion touched (sizing input for task 08)

From the workers' reports and the commits. "Own" means the graph's own file, its lesson file, its tests, its recording, its fragment and its placement note. Anything outside that set is listed with the reason.

| Pilot | Commit | Own files | Outside the plain set |
| --- | --- | --- | --- |
| Taylor | `d34e9f9b`, `56414ad2`, `c92616bb` | graph, declaration test, fragment, lesson frames (`analysisGuidedLessons.ts`, local `frame()` helper) | `BaseGraph.tsx`: the hooks, once for all graphs |
| Transformations | `a87ba078` | graph, declaration test, fragment, lesson (`guidedStep`) | `functionTransformationMessages.ts`: a formatting helper shared with the panel |
| De Casteljau | `a87ba078`, `cd31e769` | graph, declaration test, fragment, lesson (`guidedLessons.ts`, local `frame()`) | `RationalDecasteljauGraph` inherits the declaration (unreviewed) |
| Phase portrait | `a87ba078` | graph, declaration test, fragment, lesson (`guidedStep`) | none |
| Linear map | `18c97a67` | graph, declaration test, fragment, chapter lesson (`step()`/`framedStep`) | four board helpers (`compositionBoard`, `eigenBoard`, `ellipseBoard`, `iterationBoard`): a `mark` hook so the legend can name drawn objects. The inspector now renders from the declaration. |
| Triangle centres | `cd31e769` | graph, declaration test, new recording, chapter lesson (`notableStep`) | `NotablePointsPanel.tsx` (`data-readout-note` for the recorder); `notablePointsText.ts` (sentences as messages) |
| Projective cross-ratio | `18c97a67` | graph, declaration test, new recording, fragment, lesson (legacy `step()` per frame kind) | `CrossRatioControls.tsx` (`data-readout-note`); `crossRatioText.ts` (sentences as messages) |
| Coons patch | `0c3422fb` | graph, declaration test, new recording, fragment, lesson (local `frame()`) | `CoonsPatchPanels.tsx`: exports for the declaration. The shared patch base is untouched. |

## What this predicts for task 08

- A plain graph touches 4 to 6 own files.
- A graph whose panel builds sentences inline also touches its text helper, to turn the sentences into messages, and its panel, to add recorder attributes.
- A graph that draws through helper modules touches those helpers to mark drawn objects.
- Every lesson builder kind took the same small change: an optional `declare`.
- A graph without a recording needs one first. That is one SAMPLES entry, which conflicts between parallel lanes, so the handler owns `parity.test.tsx` or splits it per family in 08.
- Workers ran 54k to 143k tokens per pilot. Three of the eight stopped at the budget signal: phase portrait and cross-ratio (the handler ran their last checks) and the linear map (two continuation workers). Budget 1.5 workers per complex graph.
