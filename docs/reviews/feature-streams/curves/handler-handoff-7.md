# Curves stream: handler handoff 7

Handler 7 wrote this on 2026-10-31, after passing its 150k soft threshold. No agents are running. Keep these settings:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Mathematical and engineering reviews: `bezeg-reviewer` Sonnet.

## State
- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout; delete the junction before removing the worktree.
- `master` holds everything through the commit that adds this note, including IA-C-2a. The branch has one more commit, the **WIP commit for AB-C-2a**. It is pushed to `origin/worktree-stream-curves` only, **not to master**: one test fails and the checks are incomplete. Do not push it to master until the slice is accepted. Amending is not allowed: finish with new commits, then rebase them onto `origin/master` and push as usual.
- Load and the push procedure are unchanged from [handoff 6](handler-handoff-6.md): use path-filtered `just unit ... --maxWorkers=2`, one run at a time. Run `just lint <changed paths>` before every push.

## Accepted this session

| Slice | Commit | Evidence | Notes |
| --- | --- | --- | --- |
| IA-C-2a plan | `7f3c7f9` | tasks README Decisions "I5 graph base", "I5 scene" | Spec line about I5 updated: the graph runs on BaseGraph with IterationController |
| IA-C-2a I5 subdivision graph | `9e2c773`, docs `ba11627` | [ia-c-2a](../../interpolation-approximation/ia-c-2a-graph.md) | `src/graphs/curves/subdivisionCurves/`; Preset key `interp-subdivision`; `SUBDIVISION_ANIMATION_ID = 'interp-subdivision-rounds'` |
| AB-C-2a plan | `6ea2a1d` | advanced-bezier tasks README Decisions "D4 graph scene" | One shown surface (\(L_c/L_d/B/S\)); linked-corners switch |

## Next steps, in order
1. **Finish AB-C-2a, the `patch-coons` graph.** Sources: the [brief](../../advanced-bezier/ab-c-2a-brief.md) and the [worker handoff](../../advanced-bezier/ab-c-2a-worker-handoff.md). Start a fresh `bezeg-worker` Sonnet from those two files. Do not continue the old worker, which is at 141k.
   - Open problem: `CoonsPatchLifecycle.test.tsx` fails. After the first unmount the probe counts 1 document listener against a baseline of 0, and `outstanding()` is empty. Compare with `jsxSurfaceLifecycle.test.tsx`: check when the baseline is taken, whether `view.flush()` runs before unmount, and run the same probe on `TensorPatchGraph`. If the leak is real, fix it in the Coons graph or panels.
   - Then run tsc, `just lint src/graphs/patches src/localization`, `just unit src/graphs/patches src/localization --maxWorkers=2`, and about 8 mutations.
   - Reviews: engineering + UI, and mathematics (the net, the corner status and relink snapping).
   - The handler decides two worker decisions: the Slovenian term "premonosna ploskev" for ruled surface (not in the spec's term table; check it per `docs/localization.md#choosing-new-terms`), and rejecting an imported file whose `linkedCorners` is true but whose corners differ.
   - Afterwards write `docs/reviews/advanced-bezier/ab-c-2a-graph.md`, mark the AB-C-2a row done in the advanced-bezier tasks README, update the stream status line in `docs/tasks/feature-streams/curves.md` (family 5), and add an evaluation-log entry.
     - Its data: worker dispatched 19:50 UTC; 49 uses, ~141k, 8.8 min; HANDOFF at 42 turns with the lifecycle test failing and no mutations run.
     - The brief already put the final checks before mutations, and the worker still did not reach the checks.
2. Gated work as in [handoff 2](handler-handoff-2.md) step 4: PS graphs, I2 and I4 graphs wait for `G-FN`; AB-A waits for `G-CURVE`; registration and lessons for `G-REG`.
   - When no ungated F2a slice remains, the stream waits on its gates. Check gate status in `docs/tasks/feature-streams/` before deciding.

## Brief lessons (this session)
- Both M graph workers reached the 135k budget, at 55 and 42 turns, before their final checks. The mutation cap (12 mutations, against 24 earlier) did not prevent it.
- Next time, split an M graph slice: worker A implements it and adds core tests. Worker B, or the handler, adds lifecycle tests, runs the mutations and runs the final checks.
- Earlier lessons in [handoff 6](handler-handoff-6.md) "Engineering brief checklist" still apply.

## Open items for registration (F2b/F3), in addition to handoff 6
- Add `SUBDIVISION_ANIMATION_ID` to `LESSON_ANIMATION_IDS` and wire lesson actions to `nextStep/play/pause/resetRounds`. Add the `interp-subdivision` and `patch-coons` collections to the Preset collections and to `PresetCatalog.test`.
- I5 lesson text must state:
  - open Chaikin keeps its end points;
  - open four-point is linear at the ends;
  - the four-point \(C^1\) claim is "to verify".
- Browser checks: the subdivision graph (playback, pause paths, `exportBusy`, figure batch) and the Coons graph (drag, relink, shown surface). Measure drag cost with 512 pooled vertices.
