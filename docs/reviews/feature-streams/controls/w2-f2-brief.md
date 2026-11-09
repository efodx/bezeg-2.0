# Wave 2 slice F2: function steppers, degrees and keyboard steps

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** `src/graphs/functions/TaylorGraph.tsx`, `UniformConvergenceGraph.tsx`, `RungeInterpolationGraph.tsx`, `FourierSeriesGraph.tsx`, `EpicycleGraph.tsx`, `FourierCoefficientsGraph.tsx`, their test files, and helpers used only by them; `FunctionReadout.css` rules for these graphs only (for example `.taylor-actions`). Workers F1 and F3 own the other function graphs; `FunctionStatus.tsx` is the handler's (read it, do not edit).

**Work (inventory rows 27, 32, 33, 44, 47, 49):**
- **Hand steppers (C5, C26, decision 10).** The hand-built −/+ pairs in Taylor, UniformConvergence, Runge and FourierSeries, and Epicycle's −1/+1 buttons beside its N slider, become `CountSetter` with its typed path (`onSet`) and the same range; Taylor's and Runge's degree are degrees, so decision 10 applies. Remove the four functions files from `uncaughtSteppers` in `eslint.config.mjs`. Epicycle N: if the slider and the buttons set the same count, keep one control (`CountSetter`) unless the range is too long to step (more than about 20 values); then keep the `Slider` with its exact field and drop the buttons. Say which.
- **FourierCoefficients counts (C5).** Its four integer `NumberInput`s that are counts (K, decay N, harmonic, ...) become `CountSetter` where a count of at most about 20 values is stepped; a long range stays `NumberInput` integer. Say which, per field.
- **Shift+arrow handlers (C17).** Epicycle and FourierCoefficients have their own Shift+arrow `onKeyDown`. Read the spec's C17 target and `src/inputs/stepKeys.ts`; use the shared keymap or remove the handler where the shared control already gives the step. A Shift step at the limit stops without a message (decision 7).
- **Epicycle refusal (C22).** `rejectionValue` with `role=alert` goes to the graph's `RefusalChannel` (`this.refusals` in `BaseFunctionGraph`, decision 17) through the shared `guard`.
- **FourierSeries view buttons (C20).** "zoom to peak" stays (listed exception). Check whether "whole view" equals host Fit (compare the bounds in code and on the real graph); if equal, remove it; if not, override `fitView` so Fit frames the same, then remove it. Record what you found.
- **Status groups (C21).** Each `role="status" aria-live` group in your graphs (Taylor, UniformConvergence, FourierSeries, Epicycle's `epicycle-status`) becomes `FunctionStatus` with the same lines and markers; pass `muted` while a run plays (Epicycle). Update tests that read `role="status"`.

Out of scope: Epicycle's Play and time slider (listed exception) and reveal buttons (C11).

**Lessons:** Taylor, uniform convergence, Fourier and epicycle lessons drive the degree, N and term counts. Lesson actions that set them must still work; run their lesson unit tests.

**Evidence file:** `w2-f2.md`. **Handoff note:** `w2-f2-handoff.md`.
