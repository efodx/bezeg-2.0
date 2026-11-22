# 01 Scene store, arbiter, fuzzer

Source: [parameter writes](../../specs/parameter-writes.md); [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A2; [ADR 0064](../../adr/0064-source-tagged-scene-writes.md).

## Goal

Parameters and the view box are written only through `write(key, value, source)` on the graph's `SceneStore` (`src/graphs/base/SceneStore.ts`), with leases and the fixed priority learner > lesson > animation. The checks that would have caught the prototype's bugs exist in the repository before any new writer is added.

## Slices

1. **Arbiter core** (handler-owned design): source-tagged write, lease take/end, refusal of lower-priority writes, lesson frame change ending all leases, intent view and fitted view as separate keys. Pure, no React or JSXGraph.
2. **Existing writers moved over:** `Slider`, `CountSetter`, `AngleSlider` and other shared range/count inputs write as `learner`; the lesson runtime writes as `lesson`; learner pan and zoom write the view as `learner`. No behaviour change visible to a learner.
3. **Fuzzer in the repo:** port `night/fuzz/fuzz.cjs` to the repo's Playwright setup behind a `just` recipe, with invariants I1 to I5, seed replay and shrinking. Before pucks exist it drives the tools controls, lesson Back/Next and pan.
4. **Probe in the repo:** port `night/probe.cjs` and `CHECKLIST.md` thresholds (long tasks, frame gaps, CLS, value flicker, glides per step, Back return, board cover).
5. **Fuzzer findings:** fill "Fuzzer findings" in the parameter-writes spec from `night/fuzz/final/*.txt` and `min-*.json` (`RESULTS.md` was never written). Three classes were seen: a typed value replaced by a stale one (I1, transformations), A → B → A alternation (I2), and the JSXGraph page error "reading 'handler'" (I4, Taylor, waves, phase portrait). The `phase.zoom` I1 case is a generator artefact.

## Acceptance

- Parameter-writes acceptance 2 (unit tests in one synchronous sequence per case), with the same cases for the view box.
- A search finds no parameter or view write outside `write(...)`.
- The fuzzer recipe passes 50 seeds on Taylor, transformations and phase portrait (free and lesson) on `master`.
- The probe recipe runs on the same routes and its numbers are recorded as the `master` baseline.
- `docs/smoke-tests.md` carries "Interrupt what moves" on `master`.

## Not in this task

Pucks, previews, sweeps, morph: they arrive as new writers in 05 to 07.
