# 10J-1 handoff (partial, nothing implemented)

State: no source files were written or edited by this worker. Only research was done. No checks were run (no tsc, eslint, or vitest).
Files touched: this note only. `.claude/scratch/` and `t10sj-core-brief.md` were left as found.

## Findings for the next worker

- `tensorJoins.ts` already exports `JoinContinuity`, `JOIN_ALPHA_RANGE`, `matchBoundaryDegree`, `enforceJoin(a, b, mode, alpha)` and `classifyJoin` (`JoinReport` includes `derivativesVanish`).
  - `enforceJoin` with `"none"` returns B elevated to the matched degree. Do not store that result (review L4). In `none` mode keep B as edited.
  - For `c1`/`g1`, B row 1 is `B0j + alpha * (mA/mB) * (A[mA][j] - A[mA-1][j])`.
- Template: `TensorDerivativesGraph.tsx` and `TensorDerivativesScene.ts`.
  - `buildScene` merges the extra scene into `super.buildScene`.
  - `geometryChanged` is overridden.
  - `stateDto` and `stateOf` are overridden. The `stateOf` parameter type may be widened with an own `JoinStateDto extends PatchStateDto`. Method bivariance allows it, and no casts are needed.
  - `startingPatchKept` keeps the join state across starting patches.
- `TensorPatchGraph` hooks: `hasPoint`/`movePoint` (ids `p-i-j`) and `setDegree` (a protected hook may be needed, since A's `setDegree` must also change B's `n`).
  - Scene points have no draggable flag (`ScenePoint` is only `{id, xyz, selected?}`).
  - `applyEdit` in `BaseSurfaceGraph.tsx:113-120` calls `movePoint` only if `hasPoint(id)` is true. This is the rejection path for derived B points.
  - Derived B points can still be drawn as scene points; the view may let them be dragged, but the graph rejects the move.
- Scene: `ScenePolyline` roles `net`, `net-2`, `highlight`, `vector-u`, `vector-v` and `boundary`. The mesh is a single `{positions, faces}`. To concatenate, offset B's face indices by A's vertex count.
  - Arrows: reuse `drawDifferentials`' idea (`tensorDerivatives.ts:143`). Use one common factor `k = displayFraction * D / max(|S_Au|, |S_Bu|)`, with `D` the diagonal of both nets.
- Preset collection: only `patch-tensor|triangular|decasteljau|derivatives` exist in `patchPresetCollections.ts:83-86`. `checkPatch` rejects unknown state fields. Until 10W, `presetCollection()` can return `patch-tensor` as a placeholder. Export and import of B state will then fail validation, so list this as a 10W item.
- Planned DTO state fields (in `stateDto`/`stateOf`):
  - `joinContinuity` ("none" | "c0" | "c1" | "g1", default "c1")
  - `joinAlpha` (finite, clamped to `JOIN_ALPHA_RANGE`, default 2)
  - `joinV` (finite, in [0, 1], default 0.5)
  - `mB`, `nB` (integers 1..4)
  - `netB` (`(mB+1)*(nB+1)` finite Point3Dto, row-major)
- Transient state: none needed for 10J-1.
- Tests: mount via `GraphHost` with `FakeSurfaceView` as in `TensorDerivativesGraph.test.tsx:1-30`.

## Remaining steps (all of 10J-1)
1. `TensorJoinScene.ts` (pure) and its test.
2. `TensorJoinGraph.tsx` and its test:
   - state `netB`/`mB`/`nB`/`joinContinuity`/`joinAlpha`/`joinV`;
   - public methods `setJoinContinuity`, `setJoinAlpha`, `setJoinV`, and a B degree path;
   - re-derive B after every A edit, degree change, and mode or alpha change;
   - `b-i-j` point ids;
   - `joinReport()` exposing `classifyJoin`.
3. Mutation checks per assertion group.
4. Run `npx tsc --noEmit --pretty false` and `npx eslint <files>`, with logs in `.command-logs/t10j1-*.log`.
