# Audit: figurePresetGraphState overrides and data-dependent state (read-only review)

Scope: every `override figurePresetGraphState` under `src/` (30 including the Blossom fix, `PointSetGraph` base override counted) and the non-overriding graphs whose state holds data-dependent fields. Base merge: `BaseGraph.tsx:758-763` (mount-time default over nothing, stored graphState on top); consumer `BaseGraph.tsx:1265`; state replaced after the data import (`SceneReplacement.ts` replaceDeferred). Nothing was executed; all rows are by reading unless noted.

## Findings

| Graph | Field | File:line | Risk | Consequence |
|---|---|---|---|---|
| LinearProgramGraph | whole state (constraints, objective, sweep) is the Preset `data`; `graphState` is exported as the full state but `lpPresetCollection.checkGraphState` allows only `initialized` | `src/graphs/levelsets/lpPresetCollection.ts:62-66`, `LinearProgramGraph.tsx:95-113` (no `savedGraphState` or `figurePresetGraphState` override) | suspected (high; needs one JSDOM run: save a 3-constraint LP Preset, select it) | A saved Preset either is refused on selection (unknown field `constraints`), or, if its graphState were `{initialized}` only, the figure state is the mount-time default over the imported data: the Preset of another constraint count shows the default 2 rows. |
| ContourMapGraph | same shape: whole state (`fn`, `probe`, `start`, `level`, `lineParam`, `circleParam`) in `data`, graphState limited to `initialized` | `src/graphs/levelsets/contourPresetCollection.ts:62-66`, `ContourMapGraph.tsx:168-193` | suspected (high) | Same as above; a stale default `probe`/`start` is outside the window of another `fn`, if the merge wins. |

No confirmed case found: every override reads the imported data from `this.state`/`this.model` (set by `importPresetData` before `next()` runs) and clamps or revalidates the index.

## No issue (overrides)

- BSplineBlossom `BSplineBlossomGraph.tsx:103`: segment and args revalidated against imported knots (the fix).
- DeBoor `DeBoorGraph.tsx:117`: `level` clamped to degree; `t` is clamped at every read (`DeBoorScene.ts:71`, slider `DeBoorGraph.tsx:332`).
- BSplineBasis `:117`: `t` clamped at read (`BSplineBasisScene.ts:118`, slider `:280`).
- BSplineNurbs `:125`: `t` clamped to the imported domain; refusal reset.
- BSplineInsertion `:118`, BSplineExtraction `:98`: ghost/moved reset; `insertValue` is a free number (a refused insertion, not an invalid control).
- Point-set family: HullTrace `:244`, HullRobustness `:275` (cell, pop, rules parsed; step clamped), Fortune `:254`, BentleyOttmann `:223`, EarClipping `:229`, MonotonePartition `:246`, IntervalSweep `:222`, Delaunay `:307`, TraceCurvePair `:218`, BezierClipping `:221`: `step` clamped by a run of the imported model. Delaunay/Triangulation force `triangles: this.triangles` (`TriangulationGraph.tsx:396`); TraceCurvePair runs on merged tolerance.
- Voronoi `:805`: cellSite, construction, mode validated against site count.
- PointInPolygon `:271`: query is a free grid point. PointSetGraph `:512`: model only.
- Projective: CrossRatio `:177`, Pascal `:251`, PolePolar `:234` (model only); FivePoint `:269`, ThreeViews `:172` (persistence `reconstruct` recomputes derived `lastUnique`).
- BaseSurfaceGraph `:355`: keeps the live (imported) state.
- Selected curve (BaseCurveGraph): the transient restore clears the selection on the figure path (`BaseCurveGraph.tsx:379-385`).
- Function graphs: `replaceState` keeps the imported model (`BaseFunctionGraph.tsx:436-445`).
- Hermite, Interpolation, Subdivision curves, Bernstein, Parametric, Decasteljau family: data fields live in the saved graphState and are consistent with `data`; their other fields (`t`, `round`, `n`) have data-independent domains.

## Not verified

- Whether a hand-edited Preset file with a partial graphState (for Hermite and the like) lets mount-time defaults survive next to imported data; `checkGraphState` per collection was not read for each.
- The LP/Contour rows were not run.
