# Points W1 evidence (workers 1 and 2)

No commit. Logs: `.command-logs/w1-*.log` (worker 1), `w1b-*.log` (worker 2). "Pre-change" = the test failed before the code change.

| # | Item | Code | Test | Pre-change |
|---|------|------|------|------------|
| 1 | Typed add reports acceptance; fields clear only on acceptance, refusal text shown | `src/inputs/PointCollection.tsx` (`add()`), Interpolation `InterpolationGraph.tsx:294`, Hermite `HermiteGraph.tsx:337`, PointSet `PointSetControls.tsx` (`onAdd`, `textOf`) and `PointSetGraph.tsx` (`actions.addPoint` returns the notice), curve workspace `CurvePointControls.tsx:27` / `BaseCurveGraph.tsx` `addTypedPoint` returns `string \| undefined` | `PointListInput.props.test.tsx` (3), `PointSet.sharedControls.test.tsx` "typed add reports its refusal" | first three failed (worker 1); PointSet case written against the new return, not run against the old void (not shown failing) |
| 2 | Pressed reason follows min/max | `PointCollection.tsx`: stored reason is a function of the current `reasons`, evaluated at render (the earlier ref write during render was a `react-hooks/refs` lint error; removed) | "the shown reason follows a changed min" | failed: 'Najmanj 1.' |
| 3 | Hermite `editPoint` frames tangent tips | `HermiteGraph.tsx` `editPoint` | `SharedPointDecisions.test.tsx` "Hermite view" | failed |
| 4 | Distinct default placement (decision 31) | `points/placement.ts` `distinct`; used by Interpolation, Hermite, PointSet | `placement.test.ts`, `SharedPointDecisions.test.tsx`, `PointSet.sharedControls.test.tsx` | PointSet 19 vs 18 |
| 5 | Refusal clears on Reset, Preset, lesson restore; typed `w` outside hodograph refits | `BaseCurveGraph.tsx` `restoreTransientState`; `BasePhBezierCurveGraph.tsx` `afterTypedHodographEdit` | `CurveWorkspacePoints.test.tsx` (Reset, preset, lesson restore, hodograph refit) | Reset and hodograph failed (worker 1); preset and lesson cases share the same path, not run against the old code |
| 6 | Throughput (spec phase 5) | `sharedControls.graphs.test.tsx`: full behaviours on two graphs per kind (collection: interp-lagrange, PointSet; list: interp-lagrange, PointSet), thin wiring for bezier, ph-cubic, interp-hermite | see wall times below | n/a |
| 7 | Listener disposal | existing `CurvePointControls.tsx:58` | `CurveWorkspacePoints.test.tsx` "dispose their board listeners" (bezier, ph-cubic; unmount, replaced scene) | 2 failed when the `off` was removed |
| 8 | Focus after row remove | `PointListInput.tsx:92-101` effect | `sharedControlBehaviour.tsx` "commit: a remove above the fewest rows applies at once" | 3 failed with the effect disabled |
| 9 | Accessible names of select toggles | `PointListInput.tsx` `SelectablePointButton`; key `point_controls_select_named`; PointSet segment/interval rows reuse `pointset_select_*` | `PointListInput.props.test.tsx` "names its point" | n/a (new name) |

Also fixed: `BaseCurveGraph.pointRefusals` was a field initialiser, but the base constructor calls `restoreTransientState` first, so `.clear()` hit undefined in 11 curve tests; it is now a lazily created getter.

## Deletions (duplicated shared mechanics)

- `InterpolationGraphReal.test.tsx` "a typed coordinate beyond 1000 is refused by the field..." covered by the shared typed-field out-of-range case in `pointListBehaviour('interp-lagrange point list')`.
- Kept: the other Interpolation, Hermite, PointSet (`PointSetSegments.host.test.tsx:149,200`) and curve-workspace cases test graph rules (segment limit, nudge keys, view refit, parameter refusal), not shared mechanics.

## Not done

- Mount once per group with reset between cases: not done. Cases mutate the graph (removals, limits), so it needs a per-graph restore contract in `sharedControlBehaviour.tsx`. The saving came from running fewer graphs.
- Decision 31 is numbered 31 in `docs/specs/shared-graph-controls.md` because 30 was taken.
- The curve workspace add has no refusal source yet (no maximum), so its return is always `undefined`.

## Checks (observed, worker 2)

- `just typecheck` passed; `just lint` on the changed directories passed; `just check-changed` passed (1184 s, includes lint, vitest on changed files, build); `just build` passed (warnings present in the log, not read).
- `sharedControls.graphs.test.tsx` wall time: 46.3 s before, 30.1 s after (single file, `just unit`).
- Not verified: no smoke test in a browser; the focus and accessible-name changes are checked by unit tests only.
