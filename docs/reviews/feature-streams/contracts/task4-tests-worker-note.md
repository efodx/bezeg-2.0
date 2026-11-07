# Task 4 step 1 tests worker note (complete)

Result: `src/graphs/functions/BaseFunctionGraph.authority.test.tsx`, 32 tests, 32 pass on unchanged production code (`.claude/jobs/authority-run10.log`); `just typecheck` passes (`.claude/jobs/authority-tc2.log`). Inventory: `docs/tasks/mathematical-runtime-contracts/04-consumer-inventory.md` (93 lines). `git diff --stat -- src` is empty after the mutations.

## Mutations (logs `.claude/jobs/authority-mut*.log`)
| Mutation | Failing tests |
|---|---|
| 1 importPreset prefers graphState | 3: linear and binomial "model in data wins over the flat fields of graphState"; linear "data the collection rejects falls back to the default model" |
| 2 drop `syncSceneToModel()` in commitModel | 13 (edits, drag/sync timing, same-tick sequences, import, checkpoint, language, binomial figure batch) |
| 3 commitModel stores `{...next}` | 1: "current contract: commitModel makes the given object the live model" (added; names the current contract, reads `this.model`) |
| 4 remove the syncReplacedScene setState | 1: "current checkpoint shape: a checkpoint whose scene state disagrees with its data shows the data" (added; names the current checkpoint shape) |
| 5 drop `...this.model` in figurePresetGraphState | 0 alone: observably equivalent, because `syncReplacedScene` rewrites the model right after (double defence). With mutation 4 added: 5 failures (linear and binomial stored file + figure batch, forged checkpoint). |

## Behavior differences from the first draft (pinned as observed)
- A refused typed value (outside the domain) leaves the refused text in the field; model, board and readouts stay on the old value.
- Dragging the binomial k handle: the sliding point snaps itself once through `moveTo`; the commit adds no sync move (`syncScene: false`); typing k moves it again.
- Binomial n = 50, k = 30: the view left edge is below 30 but not below 0.
- Draggable points are taken from the graph (named `$$P_1$$`/`$$P_2$$`, `pointK`), not from a `fixed` flag.
- `commitPresetImport`/`preflightPresetImport` default to `window.localStorage`; the app uses `appStorage` (`bezeg-2.0:` prefix); tests pass `appStorage`.
- The figure test lets the host commit (`act`) before reading controls.

## Dropped
- The `normalAreaPolyline` call-count assertion and mock: that function does not exist in `binomialNormalModel`.
- The "lesson default scene" test body was a duplicate checkpoint test; replaced by a checkpoint captured at the default scene.

## Gaps
- Two tests read the current representation by design (titles say "current contract" / "current checkpoint shape"); update them when the model moves into the store.
- Figure batch is driven through the private `exportPresetFigures` via the shared harness (`realGraphScenes.ts:33`).
- Linear model identity is pinned through `commitModel` and `this.model`; Binomial through call counts of wrapped model functions.
- No smoke or browser check; only Linear and Binomial are characterized, not the other 40 classes.
