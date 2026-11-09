# Wave 2 slice PA1: patch point chooser, point editor, tensor edit panel

Read `w2-pa-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** new `src/graphs/patches/PatchPointChooser.tsx` with its test; `PointEditor` (now in `TensorPatchPanels.tsx`; move it to its own file `src/graphs/patches/PatchPointEditor.tsx` with a test, replacing `PointEditor.test.tsx`); in `TensorPatchPanels.tsx` everything except the camera group of `TensorPatchDisplayPanel` (lines about 190–206 and the camera helpers `radToDeg`, `azimuthDegrees`, `MAX_ELEVATION_DEGREES`), which worker PA2 moves to a shared camera panel at the same time: re-read before each edit and touch only your regions. Also `TensorPatchGraph.tsx` and its tests, and the host tests of `TensorDeCasteljauGraph`, `TensorDerivativesGraph` only where they read the edit panel's controls you change. `eslint.config.mjs`: remove the `TensorPatchPanels.tsx` exemption once its raw inputs are gone. Do not edit `CoonsPatchPanels.tsx`, `TriangularPatchPanels.tsx`, `TensorJoinPanels.tsx` in this slice (they import `PointEditor`; keep a compatible export path or update only their import line, and say so).

**Work (inventory rows TensorPatch, TensorDeCasteljau, TensorDerivatives; listed exception "Patch control-point choice by index"):**
- **One chooser (C14).** `PatchPointChooser` replaces the `NO_INDEX` select pairs: it takes one to two index axes (label, options) plus a "none" entry, the current selection, and one callback, and is built on `ChoiceSelect`. Design it so Coons (boundary name + index, `NO_SELECTION`), Triangular (one barycentric select of ids) and Join's B net (i, j) can use it in the next slice without changes; show those three call shapes in its test. Use it in `TensorPatchEditPanel`.
- **Point editor (C4, decision 2).** The xyz editor commits each coordinate on Enter or blur, no Apply button: build it on `NumberInput` fields (or `PointListInput` with one row and three axes if that fits better; decide and say why). Keep the current rule that an axis left as shown keeps its exact unrounded value (decision 9 already gives that for an untouched draft), the name legend, and the empty or non-finite refusal through the field hint. `pointLocked` still replaces the editor with its reason.
- **Degrees (decision 10).** `DEGREES` select → `CountSetter` 1–4 for u and v, keeping `patch_degree_help`.
- **Starting patch (decision 4).** The starting-patch `Button` row → one `ChoiceSelect` (`startingPatches` stays the prop), with decision 38's "custom" entry shown only while the net matches no starting patch; choosing the one shown does nothing. If matching needs a model comparison that does not exist, propose the smallest one.
- DeCasteljau and Derivatives reuse `TensorPatchEditPanel`; run their host and lesson tests and fix only control reads.

**Lessons:** patch lessons drive these panels through actions (`patchLessonActions.ts`); a lesson text quoting "Apply" or the starting-patch buttons must be updated; list each.

**Evidence file:** `w2-pa1.md`. **Handoff note:** `w2-pa1-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
