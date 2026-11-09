# Wave 2 slice F1: functions base, notices, view and unavailable controls

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** `src/graphs/functions/BaseFunctionGraph.tsx`, `CltGraph.tsx`, `CorrelationGraph.tsx`, `SummaryStatisticsGraph.tsx`, `BinomialNormalGraph.tsx`, `DensityAreaGraph.tsx`, `LinearFunctionGraph.tsx`, `ConicFocalGraph.tsx`, `DarbouxGraph.tsx`, `LeastSquaresGraph.tsx`, their test files, and helpers used only by them. `FunctionReadout.css` rules for these graphs only. Workers F2 and F3 own the other function graphs; `FunctionStatus.tsx` is the handler's (read it, do not edit; report a needed change).

**Work (inventory rows 16, 18, 19, 22, 23, 25, 37, 38, 46):**
- **Status groups (C21).** Each `role="status" aria-live` group in your graphs becomes `FunctionStatus` (`src/graphs/functions/FunctionStatus.tsx`, test beside it): same lines, same CSS class, the line's data marker through `dataAttribute`. `LeastSquaresGraph.tsx` has a single `role="status"` line (`data-lsq="reason"`): decide whether it is a refusal (then the refusal channel) or a status line (then `FunctionStatus`), and say which. Update tests that read `role="status"` to the new markers.
- **Private notices (C22).** CLT, Correlation and Summary statistics keep a private `notice`/`setNotice` (and `guarded`). Route their refusals through the graph's one `RefusalChannel` (`BaseFunctionGraph.tsx`, `this.refusals`, decision 17) and the shared `guard` (`src/graphs/base/controls/guard.ts`), so the notice is shown alone and clears on the next accepted edit (decision 14). Correlation's drag refusal at the limit loses its notice (task 0 decision 7); its mathematical refusals keep a reason.
- **View buttons (C20, task 0 decision 2).** Remove Binomial "fit the view to the bars" and Density "fit the view to the curve". Override `fitView` so host Fit frames what those buttons framed (precedent: `BSplineBasisGraph`, `HullRobustnessGraph`). A pure test of the bounds plus one real-graph case each.
- **Unavailable controls (C6, decision 13).** Darboux Refine (native `disabled` + help) becomes `UnavailableButton`; LinearFunction k and n fields use `NumberInput`'s `unavailableReason` instead of `disabled`; ConicFocal's matched-weight button gets its reason through `UnavailableButton` and the weight slider uses `Slider`'s `unavailableReason`; Summary statistics' local Add value button gets a reason.
- **Counts (C5).** Darboux `n` (a count in a `NumberInput`) becomes `CountSetter` with its typed path (`onSet`), same range.
- **Off-grid typed values (decision 8, task 0 decision 3).** Where your fields refuse an off-grid typed value today, the shared field's `grid` snaps it with its notice; the models keep refusing off-grid values (Presets, lessons).

**Lessons:** these graphs back Guided lessons (CLT, correlation, least squares, Darboux and others; find them by graph id under `src/learning`). Run their lesson unit tests. A lesson text quoting a removed button or a changed refusal must be updated; list each.

**Evidence file:** `w2-f1.md`. **Handoff note:** `w2-f1-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
