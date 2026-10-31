# Curves stream: handler handoff 4

Written 2026-10-31 by handler 4 at its 150k soft threshold, after all of its agents had returned. Settings to keep:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Mathematical and engineering reviews: `bezeg-reviewer` Sonnet.

## State

- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- `master` holds everything through `198c7d0` (PS-1b).
- The local commits `8c4b3ca` (CG-B1-2a, **not yet reviewed**), the evaluation log and this note are pushed only to `origin/stream-curves-4` as a backup. Do not push CG-B1-2a to `master` before its review.
- Machine load: run path-filtered `just unit <paths> --maxWorkers=2`, one run at a time. The CG-B1-2a real-board test once timed out at 15 s under load and passed on rerun.

## Accepted this session

| Slice | Commit | Evidence | Notes |
| --- | --- | --- | --- |
| PS-1c review | `c3e3774` | [ps-1c](../../probability-statistics/ps-1c-kernel.md) | Handler repair: `toTenths` rounds half away from zero and never returns -0; `correlation.ts` reuses it |
| CG-B1-2a' L2 curvature graph | `6f812a5` | [cg-b1-2a-prime](../../curve-geometry/cg-b1-2a-prime-graph.md) | Extends `BaseBezierCurveGraph` (not `BezierCurveGraph`, which fixes its state type); tangent-angle readout added in round 1; browser check deferred to CG-B1-2b |
| PS-1b convolution + [ADR 0031](../../../adr/0031-probability-convolution-representation.md) | `198c7d0` | [ps-1b](../../probability-statistics/ps-1b-kernel.md) | Spec P3 numbers amended to an exact rational oracle (skewed K 0.02492, 0.01852, 0.01248; n = 2 density error is round-off); new `zero-variance` status; phone drag measurement moves to the P3 graph slice |

## Next steps, in order

1. **CG-B1-2a review** of `8c4b3ca` (`src/graphs/curves/parametric/`, 14 localization keys, evidence [cg-b1-2a-graph.md](../../curve-geometry/cg-b1-2a-graph.md)). It is a multi-file graph with mathematics, so per AGENTS.md run parallel `bezeg-reviewer` Sonnet reviews:
   - Engineering: ownership and disposal of `ParametricScene`, the `requestAnimationFrame` roll and its cancellation, the `BaseGraph` base choice, Preset validation and rejections.
   - Mathematics: the catalogue oracles (cycloid 8r and 3πr², the cardioid, rose and spiral lengths and areas, velocity, cusp status) against spec L1.
   - Owner-level decision: the worker fitted the view only in `initialize` and on user actions, not on import, so a saved board state survives. Accept or change it.
   Then write the disposition, set the CG-B1-2a row in `docs/tasks/curve-geometry/README.md` to done (browser check in 2b), update the stream row, rebase onto `origin/master`, run `tsc` and push.
2. **I1, I3 and I5 graphs** (interpolation F2a, ungated; read ADR 0026 and the interpolation tasks README first).
3. **AB-C F2a Coons graph** on `BaseSurfaceGraph` (ADR 0028 item 3; the net feeds `TensorProductBezierPatch` directly).
4. Gated work as in [handoff 2](handler-handoff-2.md) step 4. PS graphs wait for `G-FN`; AB-A (D1/D3 graphs) waits for `G-CURVE`.

## Open items for registration (CG-B1-2b and F3)

- Add `PARAMETRIC_ROLL_ANIMATION_ID = 'parametric-roll'` (now local in `parametricCatalogue.ts`) to `LESSON_ANIMATION_IDS`, and `parametricPresetCollection` to `curvePresetCollections`.
- Browser checks of both graphs: drawing, live SL/EN switch, dragging, and readout placement at projection sizes.

## Risks and lessons

- **Spec "checked" numbers can be wrong.** PS-1b's draft numbers came from another grid scheme. An exact oracle in review settled it, and tests now pin the exact values tightly enough to fail under the old scheme.
- **Pushes and running workers:** a rebase needs a clean tree. Push accepted work before dispatching a worker that edits shared files, or set the worker's files aside in a tagged stash after it returns.
- **Push races:** `master` moves often (functions and drawing streams). Fetch, rebase, run `tsc` and push without other steps in between.
- The evaluation log is complete through this session.
