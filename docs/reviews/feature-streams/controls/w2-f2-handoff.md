# W2 F2 handoff (partial)

## Done (source; `just lint` on the six graph files passed, tsc showed no errors in my files)
- TaylorGraph, UniformConvergenceGraph, RungeInterpolationGraph, FourierSeriesGraph: hand -/+ pairs became `CountSetter` (`onPlus`, `onMinus`, `onSet`, same range, default bound reasons). Inspector edits go through `guard(this.refusals, ...)` (private `guarded`). Status groups became `FunctionStatus` (Taylor `taylor-status`, Uniform and Fourier `demo-status`; markers kept).
- Taylor: fixed-center `NumberInput` uses `unavailableReason` + `reasonShownElsewhere` instead of native `disabled`.
- FourierSeries: "whole view" button and `showWholeView` removed. `equalAxisUnits` is false, so host Fit returns `exampleView().box` = `BOARD_VIEWS[example]`, identical to the old button box. No `fitView` override needed. "zoom to peak" kept.
- Epicycle: N stays a `Slider` (range 0..50, too long to step), the -1/+1 buttons removed. `attempt` uses `guard`; drags use `attemptDrag` (keeps the "point stays" message, no re-announce). `rejectionValue`, `EpicycleRejection` removed. Status is `EpicycleStatus` -> `FunctionStatus muted={graph.playing}` (marker `data-epicycle-status`, line id `status`; the old `data-testid="epicycle-status"` is gone). The own Shift+arrow handler is replaced by `bigStep={EPICYCLE_VALUE_BIG_STEP}` on `NumberInput`.
- FourierCoefficients: own Shift+arrow handler removed (`bigStep` on `NumberInput`). `ExampleChoice` with local `role=alert` removed: plain `ChoiceSelect` + `guarded` (refusal goes to the channel). Drag uses `dragEdit`. Counts: K (1..32), decay N (1..101) and harmonic (0..K, up to 33 values) are all longer than about 20 values, so all stay `NumberInput integer`.
- `eslint.config.mjs`: the four function files removed from `uncaughtSteppers`; the array is now empty (the handler decides whether to delete the export). No file of mine was in `controlExemptions`.
- Localization (sl and en, both removed): 20 unused keys (taylor degree buttons/limits, uniform_n decrease/increase/limit, interp_runge_degree decrease/increase/limit, fourier_n decrease/increase/limit, fourier_zoom_full, epicycle_n_minus_one/plus_one). The `*_rejected_hint` keys stay (the message modules use them).

## Tests updated so far
- RungeInterpolationGraph.host.test.tsx, FourierSeriesGraph.host.test.tsx (Fit replaces "whole view", via an added `fit()` on the observed class), TaylorGraph.test.ts, UniformConvergenceGraph.test.ts, UniformConvergenceGraph.host.test.tsx: edited, NOT re-run.

## Not done
1. TaylorGraph.host.test.tsx: buttons `Povečaj/Zmanjšaj stopnjo n za 1` -> `Povečaj/Zmanjšaj število`; remove the `decrease().disabled`/`aria-describedby 'taylor-degree-help'`/`increase().disabled` checks; `getByLabelText('Stopnja n')` -> `getByRole('spinbutton', {name: ...})` (also `Degree n`); `center.disabled` -> `aria-disabled="true"` and the readOnly check.
2. EpicycleGraph.host.test.tsx: `getByTestId('epicycle-status')` (line 112, 162) -> `document.querySelector('[data-epicycle-status]')` (the aria-live check at 162 moves to the `LiveReadout`); lines 177-180 buttons `Povečaj/Zmanjšaj N za 1` are gone (drop them; N cap text checks stay); `epicycle-rejection` test ids (245-249, 486, 506) -> read the `RefusalNotice` region; `getByLabelText` for fields (115-116, 387) may need `getByRole('spinbutton', ...)`; the Shift+ArrowDown test (224) now goes through `NumberInput` `bigStep` (clamped at the limit, no message).
3. FourierCoefficientsGraph.host.test.tsx: `fourier-decay-rejection` (lines ~346-351) -> the refusal notice; the keyboard step case at ~115 is a controls-impact duplicate (delete or keep one thin wiring check).
4. Re-run: `just unit src/graphs/functions/{Taylor,UniformConvergence,RungeInterpolation,FourierSeries,Epicycle,FourierCoefficients}Graph` (first run: 32 failures, all from the test mechanics above). Then lesson tests (`grep -rl 'taylor\|uniform\|fourier\|epicycle' src/learning`), `just typecheck` and `just lint` on the six files.
5. Add one thin wiring check per migrated graph (shared control mounts, one edit reaches the model; Runge and Uniform host tests already have one), observed-failure/mutation notes, and test-time delta (first run total: 24.2 s for 8 files, mostly failing; before-times not measured).
6. Evidence file `w2-f2.md` not written.
7. `FunctionReadout.css`: `.epicycle-status` (EpicycleGraph.css:3) now styles the `FunctionStatus` div; check that the margin and color still look right. `.taylor-status p`, `.demo-status p` rules unchanged.

## Flags
- `OnOffSwitch disabled` (Runge semicircle) keeps native `disabled` with linked help; the shared `BooleanField` has no unavailable-reason prop. Proposed: add `unavailableReason` to `BooleanField` (shared file, not mine).
- Typed out-of-range values on a stepper's field are checked by `NumberInput` first; a model refusal that reaches `guard` also shows in the graph notice (as in Correlation).
