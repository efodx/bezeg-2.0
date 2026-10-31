# Curves stream: handler handoff 6

Written 2026-10-31 by handler 6 at its 150k soft threshold, with no agents running. Settings to keep:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Mathematical and engineering reviews: `bezeg-reviewer` Sonnet.

## State

- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` holds everything through `1f8e805`. The tree is clean apart from this note.
- Machine load: run path-filtered `just unit <paths> --maxWorkers=2`, one run at a time. `master` moves every few minutes: fetch, rebase, run `tsc` and push, with no other steps in between.
- `just check` on master now also runs lint, and other streams wait on a green check: run `just lint <changed paths>` before every push.

## Accepted this session

| Slice | Commit | Evidence | Notes |
| --- | --- | --- | --- |
| Curvature collection out of the file contract | `57756e6` | commit message | Reported by geometry handler 2. `curve-curvature` was in `curvePresetCollections` before G-REG; now the separate export `curvatureCurvePresetCollection`. Registration adds it to `presetCollections` and `PresetCatalog.test`'s key list |
| `PointListInput` lint fix | `c1ebefb` | commit message | Reported by geometry handler 3: `react-hooks/set-state-in-effect`. The refusal is now cleared during render |
| IA-B-2a I3 Hermite graph | `bc584b9` | [ia-b-2a](../../interpolation-approximation/ia-b-2a-graph.md) | `src/graphs/curves/hermite/`; Preset key `interp-hermite`; tangent cap 4000 (covers every reachable Catmull-Rom tangent) |

## Next steps, in order

1. **I5 graph** (IA-C, F2a, ungated): `interp-subdivision`. **Decision (handler 6):** build it on `BaseGraph` with `IterationController` (`src/learning/runtime/iterationController.ts`), not on `IterativeFunctionGraph`. That class extends `BaseFunctionGraph`, the function-model base that `G-FN` (Platform A7/A8) restructures, so reusing it would gate I5. Record this in the IA tasks README Decisions and in the spec's Implementation Decisions line about I5. Kernels: `subdivisionRounds`, `fourPointStep` and `MAX_SUBDIVISION_ROUNDS` in `src/analysis/subdivision.ts`, plus the imported B-spline `chaikinStep` and `uniformQuadraticSegment`; the open end rule is in [ia-1c](../../interpolation-approximation/ia-1c-kernel.md). Spec I5 acceptance 5: playback stopped by default, paused on edit, scene change, exit, import, capture and unmount. Add an IA-C-2a row first. Reuse `PointListInput` and the I1/I3 owned-scene pattern. Engineering + UI and mathematics reviews.
2. **AB-C F2a Coons graph** on `BaseSurfaceGraph` (ADR 0028 item 3; the net feeds `TensorProductBezierPatch` directly).
3. Gated work as in [handoff 2](handler-handoff-2.md) step 4. PS graphs wait for `G-FN`; AB-A (D1/D3 graphs) waits for `G-CURVE`; I2 and I4 graphs wait for `G-FN`.

## Engineering brief checklist

- For `BaseGraph` subclasses that keep Preset data in scene state, name these paths in engineering briefs and tests: `prepareLessonFixtureScene`, `prepareLessonDefaultScene` (`lessonDefaultState` must carry the imported data), checkpoint restore, figure batch, and `importPreset` (the saved view is applied before the data).
- Ask the mathematics reviewer to check every cap and clamp against the values the formulas can actually reach. IA-B-2a's tangent clamp at 1000 was below the reachable 4000.
- Cap worker mutations at about 10 key ones. The IA-B-2a worker ran 24 and reached its 135k budget before the final checks.
- Graph Preset collections stay local to their graph until registration. Never add them to `curvePresetCollections` or `presetCollections` before G-REG.

## Open items for registration (F2b/F3)

- `PARAMETRIC_ROLL_ANIMATION_ID` to `LESSON_ANIMATION_IDS`. Add the parametric, `curve-curvature`, `interp-lagrange` and `interp-hermite` collections to the preset collections and to `PresetCatalog.test`'s key list.
- Browser checks: the parametric, curvature, interpolation and Hermite graphs (drawing, live SL/EN switch, dragging including the Hermite tangent tips, readouts and the basis plot at projection and narrow sizes, dark mode, touch).
- Measure dragging with the basis plot shown.
- I3 lesson text must state that the Bézier handles are \(P_i+\tfrac13h_im_i\) (the spec's \(P_i+\tfrac13m_i\) only for uniform parameters), and that in Hermite mode a uniform/chord switch rescales the local tangents and so changes the shape.
- Deferred low findings: the parametric `checkGraphState` checks a partial state's parameter against the cycloid domain. Hermite and I1 Add at the coordinate limit can be refused with a notice.

## Risks

- One worker repair round can reach 105–115k; start a fresh worker from a note rather than a third round.
- `await act(async () => graph.reset())` times out under jsdom; use `waitFor`.
- To push a fix while a worker has uncommitted files in this worktree, cherry-pick it in a temporary detached worktree under `$CLAUDE_JOB_DIR/tmp`, add a `node_modules` junction, run tsc and lint, and push from there. Delete the junction before `git worktree remove`.
- The evaluation log is complete through this session.
