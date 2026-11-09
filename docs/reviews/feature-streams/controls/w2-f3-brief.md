# Wave 2 slice F3: function Reset removals, zero lists and status groups

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** `src/graphs/functions/FunctionInverseGraph.tsx`, `FunctionTransformationGraph.tsx`, `PolynomialZerosGraph.tsx`, `RationalFunctionGraph.tsx`, `ZeroListEditor.tsx` (and the zero-list store it uses), and for the status-group change only: `AccumulationGraph.tsx`, `BisectionGraph.tsx`, `ConvexityGraph.tsx`, `ExtremaGraph.tsx`, `FixedPointGraph.tsx`, `GeometricSeriesGraph.tsx`, `MeanValueGraph.tsx`, `EulerGraph.tsx`, `RootFindingGraph.tsx`, `QuadratureGraph.tsx`; their test files; `FunctionReadout.css` rules for these graphs only. Workers F1 and F2 own the other function graphs; `FunctionStatus.tsx` is the handler's (read it, do not edit).

**Work (inventory rows 34, 35, 40, 42, 50; status groups in rows 13, 17, 21, 28, 30, 31, 36, 39, 41, 43):**
- **Local Reset removals (C9, task 0 decision 1).** Remove the local Reset buttons of FunctionInverse, FunctionTransformation, PolynomialZeros and RationalFunction; the host Reset gives the default model, or the Preset when one is selected. Check that the host Reset restores everything the local Reset did (model and any reveal or display state it reset); a difference other than the Preset is a finding to report. Delete their keys if unused.
- **Zero lists (C6, C22; listed exception "Multiplicity field of zeros").** `ZeroListEditor` keeps its pair rows. Its add button (native `disabled` + reason) becomes `UnavailableButton`; per-row remove at the minimum gets its reason; its own notice region (`zero-list-notice`, a subscribe store) routes through the graph's `RefusalChannel` (`this.refusals`, decision 17) and the shared `guard`, so the notice is shown alone and clears on accept. First-free placement stays (decision 1). If the store is shared by both zero lists of RationalFunction, keep one channel per graph.
- **Status groups (C21).** Each `role="status" aria-live` group in your graphs becomes `FunctionStatus` (`src/graphs/functions/FunctionStatus.tsx`) with the same lines, class and data markers; pass `muted` while a run plays (Bisection, FixedPoint, RootFinding, Euler, GeometricSeries where they have Play). Quadrature's separate adjustment line (`data-quadrature-status="adjusted"`, a `role="status"` paragraph) joins the status lines or becomes a field notice: decide and say which. Update tests that read `role="status"`.

Out of scope: reveal buttons (C11) and Euler's own Next step / Show all (C12).

**Lessons:** inverse, transformation, zeros, rational, bisection, fixed point, Euler and quadrature lessons exist; find them by graph id under `src/learning`. Run their lesson unit tests. A lesson text quoting a removed Reset must be updated; list each.

**Evidence file:** `w2-f3.md`. **Handoff note:** `w2-f3-handoff.md`.
