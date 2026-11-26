# 08 lane L03: bspline-insertion (done)

Base class plain `BaseGraph`. Parity recorded first (`curves/bspline/__parity__/bspline-insertion.json`, 10 states, `SAMPLES` entry, no accepted list needed). Golden unchanged and passing.

- Graph: `BSplineInsertionIds` (notes `ghost|no-interior|mult-N|jump-N`, legend `curve|control|ghost|comb`, actions `comb` puck, `insert` tools), `declaration()`, memoized marks (points must, curve samples nice), `drawnObject`, `performAction`. Old panel kept in `data-declared-panel` rendered from the declared notes.
- Model: `jumpReadoutLines` replaced by `jumpMessages` (Message form, same inputs, numbers at 4 decimals) and new `multiplicityMessage`. Mathematics unchanged; the existing jumpLines/lesson tests pin the same text.
- Fragment `bspline-insertion.ts`: `bsi_puck_comb` ("Glavnik"/"Comb"), `bsi_legend_ghost`.
- Placement: comb is a switch puck (flipped to compare); insert value, Insert button, refusal text, example, Reset, points and knots stay in Orodja (typed setup). Legend default place not judged in a browser.
- Frames: observation frames highlight mult-1 / ghost / mult-1+2 / jump-1+2; explore uses `insert` and opens tools.
- Tests: new declaration test (8 states, actions, language switch); own graph test clicks the comb puck.
- Red check: multiplicity `+1` -> `AssertionError: expected 'u = 1: večkratnost 2, zveznost C1' to be 'u = 1: večkratnost 1, zveznost C1'`. Reverted.
- Checks: graph-check PASS; unit curves + content + localization + declare + presets passed; typecheck, lint, build passed; `just smoke-lesson bspline-insertion` passed. Not run: browser probe, fuzz, screenshots.
