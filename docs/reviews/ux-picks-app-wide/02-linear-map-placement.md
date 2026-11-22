# Linear map: parameter placement (task 02)

Taylor's rule: what the learner changes while watching goes on the board, and so does a choice with a few named options; everything else stays in Orodja (tools).

| Parameter | Placement | Reasoning |
| --- | --- | --- |
| `mode` | tools | The seven views are a setup choice made before reading the picture, not something changed while watching one figure. Changing it rebuilds the whole board, so it belongs with the other setup controls. |
| `example` | tools | A named matrix is a starting point; the learner then edits entries. It sits with the mode because both define the scene. |
| `a11`, `a12`, `a21`, `a22` | board | The matrix entries are the main thing dragged or stepped while watching the image change, so they sit next to the graph. In composition mode they move to tools (section `maps`) and are locked when the slot holds a chosen element, because there the entries come from the map selection. |
| `test-angle` | board | A slider for the test vector in the eigen view, changed continuously while the image of the vector is watched. |
| `step` | board | The iteration count is varied while watching the iterates; a range of 0 to 30. |
| `first-index`, `second-index` | board | Choosing the two maps of a composition is the whole activity of that view and the result is read at once. |
| composition sources | tools (section `maps`) | Selecting where each factor comes from is setup for the composition, done once. |
| Actions `reset`, `toggle-square`, `toggle-probe`, `toggle-curve`, `snap-eigen`, `toggle-conic`, `toggle-pivot`, `reset-composition` | tools | Display switches and one-off commands are not watched while changing; display switches are declared as actions with `pressed` because the contract has no bound toggle for them. |
| Actions `play-pause`, `next-step`, `reset-run` | board | These drive the running iteration, which is read live, so they stay beside the picture. |

Gaps: no point-valued parameter kind (start vector, translation, pivot and the handles are rows and legend entries only); recordings exist only for the basis and determinant modes.
