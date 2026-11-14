# Control choice task queue

Source and acceptance: [control choice and composition](../../specs/control-choice-and-composition.md). State note for handlers: [state.md](../../reviews/control-choice/state.md). The table below is the only status.

The owner started this on 2026-11-14 and asked for the whole plan to run without questions; handlers decide and record ([spec, owner direction](../../specs/control-choice-and-composition.md#owner-direction-2026-11-14)), and may change the plan when a task runs slower than expected.

This queue has no file in `docs/tasks/feature-streams/` on purpose: the stream supervisor starts a handler for every file there with a `Run state:` line, and this chain starts its own successors. Worktree `.claude/worktrees/stream-control-choice`, branch `worktree-stream-control-choice`, dev server and smoke port 4324.

## Migration rules for every slice

These settle what a worker would otherwise ask. The [controls catalogue](../../controls.md) has the choice table.

1. A `NumberInput` with `min`, `max` and `step` becomes a `Slider` with the same range, step, `grid`, `decimals`, `bigStep`, handler and refusal hint. `label` becomes `customText`.
2. Help that only states the range, the step or "a value off the step is refused" is deleted with its keys in `sl.ts` and `en.ts`. Help that explains what the value means stays as the slider's `help`.
3. A count of things becomes a `CountSetter`.
4. Number fields that are the coordinates of one drawn point become one row of `PointListInput` (`title` is the group's caption, `pointLabel` the point's name). Points that belong together (the two points of a line, the vertices of a triangle) are rows of one list.
5. A number with no useful range stays, with an entry in `decisions.json` (`"<file>#<owner>#<label>": "keep: <reason>"`, keys as the inventory prints them). Matrix entries stay for now with `keep: matrix cell, waits for the number grid`.
6. Local helpers that only wrap a shared control (`numberField`, `IntField`, `PointFields`) are removed.
7. Unchanged: state shape, Presets, routes, lesson actions, mathematics, commit timing (typed values on Enter or blur, drags at once), refusal messages. A lesson or chapter sentence that tells the student to type into a field is reworded to name the slider.
8. Tests follow the control: a field found by role `spinbutton` and name is still there (the slider's exact field has the same name); tests that relied on the old markup are updated, not deleted.
9. Evidence per changed panel: a screenshot of the inspector at 1440 × 900, looked at by the worker and listed in its report. `node scripts/controls-sweep/shot.cjs <out.png> <route without leading slash> --port <port>` takes one from a dev server (`--eval` selects a curve or opens a disclosure first, `--present` switches to Presentation mode).
10. After a slice, `node scripts/controls-inventory.cjs` is rerun and the regenerated `inventory.md` is committed with it.

## Queue

| Step | Task | Status |
| --- | --- | --- |
| 0a | Reported defects 3, 4, 5: point row on one line, editing-mode box edge, fixture composition check | done, `45abbb11` |
| 1 | Catalogue `docs/controls.md`, links from AGENTS.md and the family template, inventory script and table | done |
| 2a | Pilot: compgeo. `InversionPanel` (defect 2), `SimsonLinePanel`, `CircleConstructionGraph`, `HullRobustnessControls`, `PointSetControls` | next |
| 2b | Pilot: `mechanics/DescentGraph` (defect 1), `curves/kinematics/KinematicsGraph`, `dynamics/PhasePortraitGraph`, `dynamics/LogisticMapGraph`, `lines/LineGeometryGraph`, `linear/LinearMapGraph` (start point only; matrix cells stay) | next |
| 2c | Functions, analysis: Accumulation, ArcLength, AreaBetweenCurves, Convexity, Darboux, DefiniteIntegral, Derivative, Euler, Extrema, MeanValue, Quadrature | after the pilots are reviewed |
| 2d | Functions, series and iteration: BinomialNormal, Bisection, DensityArea, Epicycle, FixedPoint, FourierCoefficients, FourierSeries, GeometricSeries, RootFinding, Sequence, Taylor, UniformConvergence | after the pilots |
| 2e | Functions, school graphs and trig: FunctionInverse, FunctionTransformation, LinearFunction, PolynomialZeros, RationalFunction, Waves, ZeroListEditor, TriangleSolver, UnitCircle | after the pilots |
| 2f | Complex (five graphs), isometry, level sets (two graphs) | after the pilots |
| 2g | Combinatorics (two), random Simulation, recursion (Growth, Cobweb), B-spline Insertion and Nurbs (`KnotEditor` is a recorded exception) | after the pilots |
| 3 | Sweep: capture every route, contact sheets by composition, detectors, critique, ranked findings (spec Part B) | after step 2, so it judges the migrated panels |
| 4 | Shared-component fixes from the findings; shared number grid for matrices; catalogue pictures from the fixture | after step 3 |
| 5 | Close-out: inventory has no open reading, spec acceptance checked, before and after images recorded | last |

## Findings already seen

Collected while fixing step 0; step 3 will add to them, step 4 fixes them.

- `PointCollection` typed entry ("x [ ] y [ ]" above "Dodaj na koordinatah") does not line up with the list's `x` and `y` columns below it.
- The curve workspace's editing-mode box uses the native triangle marker; every other disclosure uses the chevron. Its unavailable mode buttons wrap into a ragged second line.
- Inversion shows "Slika X' = (6/5, 2/5)" twice: in the status line under the selects and as the first readout bullet.
- A `ChoiceSelect` followed by another labelled control has no gap above the second label (Inversion: "Primer", then "Prikaz").
- Descent: the playback buttons carry a three-line reduced-motion explanation directly under them.
