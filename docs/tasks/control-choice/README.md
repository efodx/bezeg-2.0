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
| 0a | Reported defects 3, 4, 5: point row on one line, editing-mode box edge, fixture composition check | done |
| 0b | New-point entry lined up with the list, editing-mode chevron, board tools as a list | done |
| 1 | Catalogue `docs/controls.md`, links from AGENTS.md and the family template, inventory script and table | done |
| 2a | Pilot: compgeo. `InversionPanel` (defect 2), `SimsonLinePanel`, `CircleConstructionGraph`, `HullRobustnessControls`, `PointSetControls` (segment rows, kept) | done, `ed06f50a` and the big-step repair after it |
| 2b | Pilot: `mechanics/DescentGraph` (defect 1), `curves/kinematics/KinematicsGraph`, `dynamics/PhasePortraitGraph`, `dynamics/LogisticMapGraph`, `lines/LineGeometryGraph`, `linear/LinearMapGraph` (start point only; matrix cells stay) | Descent and Kinematics done (`7ad886af`, `aecf4295`); PhasePortrait, LogisticMap, LineGeometry and LinearMap moved to 2h |
| 2c | Functions, analysis: Accumulation, ArcLength, AreaBetweenCurves, Convexity, Darboux, DefiniteIntegral, Derivative, Euler, Extrema, MeanValue, Quadrature | done (worker commit `b1447c61`, picked onto the handler branch) |
| 2d | Functions, series and iteration: BinomialNormal, Bisection, DensityArea, Epicycle, FixedPoint, FourierCoefficients, FourierSeries, GeometricSeries, RootFinding, Sequence, Taylor, UniformConvergence | done on the handler branch (two workers; the handler made the Fourier handle values sliders and put Density's ends back as typed fields) |
| 2e | Functions, school graphs and trig: FunctionInverse, FunctionTransformation, LinearFunction, PolynomialZeros, RationalFunction, Waves, ZeroListEditor, TriangleSolver, UnitCircle | done on the handler branch in two slices (2e-a school graphs, 2e-b waves and trig); Linear `k` and `n` stay typed |
| 2f | Complex (five graphs), isometry, level sets (two graphs) | done on the handler branch in two slices (2f-a complex, 2f-b isometry and level sets) |
| 2g | Combinatorics (two), random Simulation, recursion (Growth, Cobweb), B-spline Insertion and Nurbs (`KnotEditor` is a recorded exception) | done on the handler branch in three slices (2g-a combinatorics and Cobweb, 2g-b Simulation and B-spline, 2g-c Growth, LogisticMap and LineGeometry) |
| 2h | `dynamics/PhasePortraitGraph` (seeds are a point list; matrix cells stay), `linear/LinearMapGraph` (start point; matrix cells stay). LogisticMap and LineGeometry moved to 2g-c | done on the handler branch; the inventory check reports no undecided typed field |
| 2i | Capture recipes follow the controls: preview, clip and control-step scripts under `scripts/` that address a migrated field by label and kind `number` (for example `demonstration-preview-analysis-motion.cjs`, 'Točka dotika c') are pointed at the slider's exact field or the point row, and their recipe tests rerun. Added by handler 2 after the 2c worker flagged it | done on the handler branch: a shared `scripts/number-field-locator.cjs` resolves a `number` action to the slider's exact field, point-row recipes are renamed. **Open:** six clip rows keep their old labels (`euler-method` 'Začetni y₀', now 'P₀, y₀'; `complex-reciprocal` 'Re z', now 'z, Re'; `complex-roots` 'Re w', now 'w, Re'; `projective-pole-polar` 'Točka P: y', now 'P, y'; `projective-five-point` 'Točka E: x', now 'Točka E, x'; `projective-cross-ratio` 'Točka O: x', now 'Točka O, x'). Handler 3 put the labels back on 2026-11-14 because a renamed row makes the stored clip stale (`tests/demonstrations.smoke.spec.cjs`, "captured from an older row") and the capture could not run: `validateRecipes` refuses while five registered Demonstrations (`complex-euler`, `complex-power`, `contour-map`, `recursion-cobweb`, `solids`; families-prep F5 media) have no recipe. The six rows passed `_preflight.cjs` with the new labels. Whoever next captures clips renames these six labels and recaptures the six ids, plus `complex-multiplication`, whose motion restore already uses the new names. Not driven live: 44 of the recipe labels (locator check only), the English names, the guided-example control steps. `scripts/demonstration-previews/manifest.json` keeps old labels until the next capture regenerates it |
| 3 | Sweep: capture every route, contact sheets by composition, detectors, critique, ranked findings (spec Part B) | done: sweep on 138 routes in three views (48 contact sheets), three reviewers; findings ranked in `docs/reviews/control-choice/findings.md` |
| 4 | Shared-component fixes from the findings; shared number grid for matrices; catalogue pictures from the fixture | 4a (slider bounds, rhythm, readout rows), 4b (Presets and button grids, point list), 4c (call-site help, labels, duplicate text, disclosure) and 4d (`NumberGrid` for both matrices and the knot editor) are on the handler branch; 4e (catalogue pictures) is with a worker. Open items are listed in the findings |
| 5 | Close-out: inventory has no open reading, spec acceptance checked, before and after images recorded | last |

## Notes from the pilots

- A worker resumed after its first stop runs in the handler's worktree, not its own. Two workers then share one checkout: give them disjoint files and tell them to stage only their own hunks of `sl.ts` and `en.ts`.
- A fresh worker worktree starts from the local `origin/master`. Its brief says `git reset --hard <handler tip>` (the branch is new and empty), not a fast-forward merge, which fails when master has moved.
- `Slider` treats an integer step as integer-only; a field that accepted decimals needs `fieldDecimals`.
- `PointListInput` has `bigStep` since the pilots; pass the graph's old big step so PageUp and Shift keep their size.
- With `integer` a point row refuses 2,4; with `grid={1}` it rounds with a notice. Keep whichever the old field did.
- Twelve graphs is too many for one Sonnet worker: the 2d worker reached its budget with the source done and no test updated. Slices from 2e on hold about six graphs; the common brief is [slice-brief.md](slice-brief.md).
- A migration can break three things outside the slice's own tests, and the publish gate runs none of them for you: the Playwright smoke specs under `tests/` (CI went red on the Inversion lesson's `X: x` locator), `src/graphs/base/sharedControls.graphs.test.tsx` (it names two graphs per control kind and failed a gate when Accumulation's `a` became a slider), and the capture recipes under `scripts/` (slice 2i). Before a publish, search `tests/` for the labels of migrated fields and run the full `just smoke`.
- The machine is CPU-bound: a 35 s fixture run waited 25 minutes for a test slot while two workers and a publish gate ran. Run two workers at most.

## Findings already seen

Collected while fixing step 0; step 3 will add to them, step 4 fixes them.

- Inversion shows "Slika X' = (6/5, 2/5)" twice: in the status line under the selects and as the first readout bullet.
- A `ChoiceSelect` followed by another labelled control has no gap above the second label (Inversion: "Primer", then "Prikaz").
- Descent: the playback buttons carry a three-line reduced-motion explanation directly under them.
- Controls inside one inspector group have no shared vertical rhythm: in Inversion the slider's min and max labels touch the next caption, and the readout bullets touch the point row. Circle constructions puts each control in its own group and reads better.
- Slider help that restates the range ("od 0 do 1,19, korak 0,01") under min and max labels that already show it (Descent "Čas").
- Readout bullets (`pointset-list`) are larger than the controls around them and deeply indented.
