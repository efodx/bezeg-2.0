# Curves stream: handler handoff 5

Written 2026-10-31 by handler 5 after its 150k soft threshold, once all of its agents had returned. Settings to keep:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Mathematical and engineering reviews: `bezeg-reviewer` Sonnet.

## State

- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` holds everything through `7602bb9`. The tree is clean apart from this note.
- Machine load: run path-filtered `just unit <paths> --maxWorkers=2`, one run at a time. `master` moves often (maps, functions and drawing streams): fetch, rebase, run `tsc` and push, with no other steps in between.

## Accepted this session

| Slice | Commit | Evidence | Notes |
| --- | --- | --- | --- |
| CG-B1-2a review + repair | `d7204ce`, `6950745` | [cg-b1-2a](../../curve-geometry/cg-b1-2a-graph.md) | Mathematics: no finding. View fit decided: `importPreset` fits a Preset without a saved view; a saved view is kept. Leak on a throwing build fixed. The lesson fixture fix (`6950745`) came from the IA-A-2a review |
| IA-A-2a I1 graph core | `21e0454` | [ia-a-2a](../../interpolation-approximation/ia-a-2a-graph.md) | `src/graphs/curves/interpolation/`, `BaseGraph` + owned `InterpolationScene`; shared slider \(s\) (Lagrange \(t=s\,t_n\), Bézier \(s\)); Preset key `interp-lagrange` |
| IA-A-2b point list + basis plot | `7602bb9` | [ia-a-2b](../../interpolation-approximation/ia-a-2b-graph.md) | Shared `src/inputs/PointListInput.tsx` (keyboard route for ADR 0026); inline SVG `BasisPlot`; Preset field `showBasis` (old Presets import with it off) |

## Next steps, in order

1. **I3 graph** (IA-B, F2a, ungated): `interp-hermite`, Hermite and Catmull-Rom modes with tangent handles, Bézier conversion, uniform/chord parameters, tension; kernels in `src/analysis/hermite.ts`. Reuse the I1 pattern (`InterpolationGraph.tsx`, `InterpolationScene.ts`, `PointListInput`) and spec I3 acceptance (locality: four segments). Add an IA-B row to `docs/tasks/interpolation-approximation/README.md` first. Engineering + UI and mathematics reviews.
2. **I5 graph** (IA-C, F2a, ungated): `interp-subdivision`, Chaikin and four-point rules, rounds with Next step/Reset, stopped-by-default playback (spec I5 acceptance 5). The spec suggests `IterativeFunctionGraph`; check whether it suits a polygon before reusing it. Kernels: `src/analysis/subdivision.ts` plus the imported B-spline `chaikinStep` and `uniformQuadraticSegment`.
3. **AB-C F2a Coons graph** on `BaseSurfaceGraph` (ADR 0028 item 3; the net feeds `TensorProductBezierPatch` directly).
4. Gated work as in [handoff 2](handler-handoff-2.md) step 4. PS graphs wait for `G-FN`; AB-A (D1/D3 graphs) waits for `G-CURVE`; I2 and I4 graphs wait for `G-FN`.

## Engineering brief checklist (learned this session)

For `BaseGraph` subclasses that keep Preset data in scene state, name these paths in engineering briefs and tests: `prepareLessonFixtureScene` and `prepareLessonDefaultScene` (state is replaced with `getInitialState()` + `lessonDefaultState()` after the import, so `lessonDefaultState` must carry the imported data), checkpoint restore, figure batch and `importPreset` (the saved view is applied before the data). Both the parametric and interpolation graphs now override `lessonDefaultState`.

## Open items for registration (F2b/F3)

- `PARAMETRIC_ROLL_ANIMATION_ID` to `LESSON_ANIMATION_IDS`; `parametricPresetCollection` and the `interp-lagrange` collection to the preset collections.
- Browser checks: parametric, curvature and interpolation graphs (drawing, live SL/EN switch, dragging, readouts and the basis plot at projection and narrow sizes, dark mode, touch).
- Measure dragging with the basis plot shown (memoizing its samples is deferred to this measurement).
- Deferred low finding: the parametric `checkGraphState` checks a partial state's parameter against the cycloid domain (no user impact).

## Risks

- Worker repair rounds on the same worker reach 105-115k tokens; a third round on the same worker would exceed the 135k budget, so start a fresh worker from a note instead.
- `await act(async () => graph.reset())` times out under jsdom; the interpolation tests use `waitFor`.
- The evaluation log is complete through this session.
