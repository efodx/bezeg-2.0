# 04 Batch A root-finding Demonstration (F2a under `G-FN`, F2b under `G-REG`)

Spec: N1–N3 graph needs and acceptance 5. Decisions: ADR 0022 §1, §4. Before starting, re-read the accepted results of Platform A7 (function-model rules) and A8 (function-graph sharing) on `master`. The model must follow A7's single-owner rules for validity, normalization and structured diagnosis.

- **F2a:** `RootFindingGraph` extends `IterativeFunctionGraph`, following `BisectionGraph` and `bisectionModel.ts`. It has method `newton | secant`, the example, start(s) as numeric and draggable inputs, and a stored `step`. The history is recomputed from the kernel. It draws the tangent or secant segment to the axis, an iterate table with `f(x_k)` and the error to the reference root, and a text status for each termination reason. Edits clear the history and pause playback. Reset returns to step 0. A reopened Preset is paused at the stored step. Presets validate every field. Unit and component tests cover these, with no route yet.
- **F2b:** route, catalog entry in the Analysis family, Demonstration registration, and a `root-finding` lesson animation id with its typed scene action (ADR 0013). Keep the edit minimal and push it promptly.

Localization keys go in one block after the bisection keys, at the same position in `sl.ts` and `en.ts`. Add the shipped terms to the localization table.

Review: engineering + UI/accessibility (F2a); engineering (F2b). Smoke: the new route in both languages, including a live language switch.
