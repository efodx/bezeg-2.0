# Wave 2 slice K1: curve base controls, splines and rational weights

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** `src/graphs/base/AxisSelector.tsx`, `src/graphs/base/BaseCurveGraph.tsx`, `src/graphs/base/CurvePointControls.tsx`, `src/graphs/base/controls/RationalBezierCurveControls.tsx`, `PhBezierCurveControls.tsx`, `CurveDisplayControls.tsx`, `SelectedCurveControls.tsx`; `src/graphs/curves/spline/**`, `src/graphs/curves/rational/**`; their tests; and `src/inputs/CountSetter.tsx` with its test and CSS, for one optional addition if the weight stepper needs it (keep every existing caller's behaviour; props optional). Do not edit `BaseGraph.tsx`. Other workers own the other curve directories later; nobody else edits these files this round.

**Work (inventory rows 112–118, 129, 132, 137, 138; typed paths 193–199):**
- **Coordinate system select (C10).** `AxisSelector.tsx` raw `Form.Select` becomes `ChoiceSelect`; delete its `controlExemptions` entry (the whole entry).
- **Rational weight stepper (C5).** The two hand `Button`s (−/+ 0.25) and the weight `NumberInput` in `RationalBezierCurveControls.tsx` become one `CountSetter` using `onPlus`/`onMinus` for ±0.25 and `onSet` for a typed weight; typed w ≤ 0 stays refused with its reason. If `CountSetter`'s typed field only takes whole numbers, add the smallest optional prop (for example a typed `step` or `grid`) with a `CountSetter.test.tsx` case that fails first. Previous/Next weight and the local "Reset weight" stay (Reset weight is a listed exception). Remove the file from `uncaughtSteppers`.
- **Unavailable controls (C6, decision 13).** The curve editing-mode buttons in `BaseCurveGraph.tsx`, natively `disabled` with no curve selected, become `UnavailableButton`s with the reason, staying a pressed group (decision 9). PH offsets' lines switch (`PhBezierCurveControls.tsx`, native `disabled`) states its reason (`BooleanField`/`OnOffSwitch` support for a reason, or report the smallest prop needed).
- **CnSpline (C5).** Its two `CountSetter`s (continuity, degree) gain the typed path (`onSet`), same ranges and refusals. `RationalCircleN`'s count setter likewise if it lacks `onSet`.
- **Typed point paths (task 0 decision 4).** For the boards you own (C1, C2, Cn, G1, G1Symmetric splines; rational Bezier, Decasteljau, Subdivision2, Elevation, Extrapolation, FarinPoints, CircleN), check whether the curve workspace point list (`CurvePointControls.tsx`, task 2) now gives each draggable point a typed path. Write the table to your evidence file. Where a board lacks one and the workspace list applies, wire it; where it does not apply (function-bound spline junctions, b_i sliders), say why. Stop and report instead if a board needs a model change.
- **Curve workspace intent (open item).** With a curve selected, dragging one control point moves the whole curve. Find in code and `git log -S` whether this is intended (a whole-curve move mode) or a defect. Report with evidence; fix only if it is clearly a defect and you can show it with a failing test first.

**Lessons:** spline and rational lessons set weights and counts; run their lesson unit tests and `src/graphs/base/sharedControls.graphs.test.tsx` (a curve graph is one of its two per kind).

**Evidence file:** `w2-k1.md`. **Handoff note:** `w2-k1-handoff.md`.
