# Geometry stream — handler handoff 12

Written 2026-11-01 by handler 12 (Opus 5.5, permission mode auto, effort medium) at the 150k soft threshold. Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry` at `origin/master` (`7736eea8` plus this note's commit). No WIP commits. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- Untracked `docs/reviews/convexity-hulls/*.log` and the `docs/reviews/feature-streams/geometry/13*` logs and `13-shots/` are not committed; leave them or delete the geometry ones.
- No worker is running.

## Done this run (all on `master`)

| Item | Commit | Notes |
| --- | --- | --- |
| Sweep S1 graph tasks 08 interval sweep graph, 09 Bentley–Ottmann graph | `a0f55631` | F2a, no route; registration and lessons wait for `G-REG`. |
| Convexity 13: point-set lesson actions, lessons A1 and A2 | `7736eea8` | Two Sonnet `medium` workers (the first hit the 135k budget; its note is `13-worker-handoff.md`). Handler decisions recorded in the task: a seventh overlay `values` hides readouts and board numbers in predict steps; interim chapter owner `bezier-curves`/`geometric-properties` until F4. Sonnet engineering review: Presets without `values` restored it hidden → fixed in `PointSetGraph.overlayShown` (an absent id takes the initial value; mutation observed); worked-example numbers untested → readout-tied test added (mutation observed). Handler repairs: A2 fan step and the orientation preview revealed predicted values. |

Checks at `7736eea8`'s content: `npx tsc --noEmit` 0, `just lint` on touched paths 0, full `just unit` passed (495 s), `just build` 0, `just smoke-lesson orientation polygon-area` 4/4 plus a scripted predict/reveal/language/Back check (Haiku smoke; screenshots looked at by the handler).

## Next, in order

1. **Sweep 07 interval mode** ([task](../../../tasks/sweep-algorithms/07-interval-mode.md)): edits `pointSetModel.ts`, `PointSetGraph.tsx`, `PointSetControls.tsx`, locales. Sonnet `medium`; engineering + UI/a11y review. Note `overlayShown` now falls back to `getInitialState().overlays`.
2. **Convexity 14** ([task](../../../tasks/convexity-hulls/14-lesson-convex-hull.md)), lesson A4; uses the `point-set` actions from 13 (`trace`, `hull` overlays). Serialize after 07 if both touch `PointSetGraph.tsx`.
3. Sweep 08 then 09 (09 reuses 08's side list if 08 lands first; 09 needs a drag measurement at 12 segments).
4. F4 convexity chapter (moves the interim owners of `orientation` and `polygon-area` in `guidedLessonOwnership.ts`), F5 media (posters need a `linear-map` recipe from Maps, or pending-id support in `capture-demonstration-previews.cjs`; record the request in the stream file first), F6.
5. Triangulation T1 route/registration task must register `earClippingPresetCollection` in `presetCollections`.

## Open risks

- At 1366×768 the lesson card covers the A2 pentagon until moved (shared lesson-runtime layout; not ours to change in a lesson slice). Consider a scene view box if the F4/F6 review agrees.
- `orientation-predict` hides the `turn` overlay, so line \(pq\) is not drawn while the text names it (review low finding, left as is).
- Low review notes not repaired: `lessonCatalog.ts` `checkAuthoredAction` uses global `isFinite` (coercing); the graph's parse still rejects strings.

## Lessons from this run

- Heredocs in Bash collapse `\\` in TS test strings (memory note confirmed twice); write LaTeX test strings with Python `chr(92)` or the Edit tool and run the test.
- `BaseGraph.importPreset` and other restore paths write `graphState` shallowly; normalise overlay defaults in the reader (`overlayShown`), not in `figurePresetGraphState`.
- Ask the smoke worker for board-number checks by object name, not by digits in board text (axis ticks are digits).

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`high` for exact predicates and kernels, `medium` for graphs and lessons); math and engineering review `bezeg-reviewer` Sonnet; narrow smoke `bezeg-smoke` Haiku. Lesson slices exceed one Sonnet worker's 135k budget; plan two sequential workers or a narrower first brief.
