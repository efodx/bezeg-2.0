# 01 Scene store, arbiter, fuzzer

Source: [parameter writes](../../specs/parameter-writes.md); [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A2; [ADR 0064](../../adr/0064-source-tagged-scene-writes.md).

## Goal

Parameters and the view box are written only through `write(key, value, source)` on the graph's `SceneStore` (`src/graphs/base/SceneStore.ts`), with leases and the fixed priority learner > lesson > animation. The checks that would have caught the prototype's bugs exist in the repository before any new writer is added.

## Slices

1. **Arbiter core** (handler-owned design): source-tagged write, lease take/end, refusal of lower-priority writes, lesson frame change ending all leases, intent view and fitted view as separate keys. Pure, no React or JSXGraph.
2. **Existing writers moved over:** `Slider`, `CountSetter`, `AngleSlider` and other shared range/count inputs write as `learner`; the lesson runtime writes as `lesson`; learner pan and zoom write the view as `learner`. No behaviour change visible to a learner.
3. **Fuzzer in the repo:** port `night/fuzz/fuzz.cjs` to the repo's Playwright setup behind a `just` recipe, with invariants I1 to I5, seed replay and shrinking. Before pucks exist it drives the tools controls, lesson Back/Next and pan.
4. **Probe in the repo:** port `night/probe.cjs` and `CHECKLIST.md` thresholds (long tasks, frame gaps, CLS, value flicker, glides per step, Back return, board cover).
5. **Fuzzer findings as tests:** the parameter-writes spec lists F1 to F3 (from `night/fuzz/RESULTS.md`, `RESULTS2.md`, `min-*.json`, `final/*.txt`). Carry the minimised action lists into the repo as replay cases. F1 and F2 are intermittent (1 in 3 on the prototype before R30), so each replay runs at least 5 times. F3's minimised list did not reproduce it; keep the full seeds (Taylor seed 2, Taylor lesson seed 8) as its cases. A flicker with two sweeps plus a card drag on waves (`min-functions_waves-1.json`) was seen and not explained: keep it as a case too.
6. **Board listener rule:** a listener on a JSXGraph board event never unsubscribes from inside that event (F3: JSXGraph's trigger loop caches the handler count). Provide one helper for "listen once" that defers removal, and use it wherever the store or its consumers wait for a board update.

7. **Clean console in development:** the dev server requests `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` (doubled base path; HTML is answered and "Unexpected token '<'" is thrown). It exists on `master` and every night probe listed it as a known error. Fix the script URL so invariant I4 (no page errors) has no exception list.

The fuzzer's checker excludes typed decimals on integer-step or step-snapped parameters (a generator artefact on `phase.zoom`). On the prototype the full seed matrix was never run to the end; before R30 the final runs failed on every route (waves 0 of 6 seeds passed).

## Acceptance

- Parameter-writes acceptance 2 (unit tests in one synchronous sequence per case), with the same cases for the view box.
- A search finds no parameter or view write outside `write(...)`.
- The fuzzer recipe passes 50 seeds on Taylor, transformations and phase portrait (free and lesson) on `master`.
- The probe recipe runs on the same routes and its numbers are recorded as the `master` baseline.
- `docs/smoke-tests.md` carries "Interrupt what moves" on `master`.

## Not in this task

Pucks, previews, sweeps, morph: they arrive as new writers in 05 to 07.
