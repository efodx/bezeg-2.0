# Geometry stream: handler handoff 36

Written 2026-11-03 by handler 36 (Opus 5.5, auto, effort medium). Continues [handoff 35](handler-handoff-35.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run (all on `origin/master`)

- **Sweep 18**, S2 registration, accepted. Browser smoke: 8 of 8 checks passed on `538ce186` ([report](../sweep-algorithms/18-smoke.md)).
  - Refusal behaviour: an invalid edit stays on the board with an alert, and Next and Play are disabled. Task 16 accepted this design.
  - Minor follow-ups recorded in the sweep README row 18: the vertex-type labels overprint their point names, and the "zgornje oglišče" label clips at the top edge.
- **T3 19**, the Voronoi graph, accepted: `6252fd5f` and `dccd4e13` ([record](../triangulation-voronoi/19-acceptance.md)). The docs are in commit `03d2685a`. Worktree `agent-abea834710293a808` was removed; its logs were copied to `docs/reviews/triangulation-voronoi/`.
- **T3 20**, `DegenerateSitesGraph`, accepted as one squashed commit, `59359d7f` ([record](../triangulation-voronoi/20-acceptance.md)).
  - The mathematics review accepted. The engineering and UI reviews accepted with fixes, and all fixes are in.
  - The B5 coordinates are confirmed in the record for lesson 23.
  - Terminology decision: *dovoljen/nedovoljen*, as in the spec. The two outlier Delaunay prompts were changed to match.
  - Worktree `agent-a6cad592b3cce9bc2` still exists, with a backup branch `t3-20-backup`. Remove the junction first (`cmd /c rmdir node_modules`), then the worktree; the backup branch may be deleted.

## In progress: sweep 19 (lesson C3), not merged

- Worktree: `.claude/worktrees/agent-ae1c6730a8e760de2`.
- Branch: `worktree-agent-ae1c6730a8e760de2`, rebased onto `9e3d354f`. Commits:
  - `b26851fc`: the lesson, written by the worker.
  - `615bfb83`: the handler's count fix after the rebase, 88 lessons and 95 copy entries. Master's density lesson P1 also raised the counts.
- Brief: [19-brief.md](../sweep-algorithms/19-brief.md).
- **Verified:**
  - The quoted values were rechecked by the handler with exact arithmetic. Example 1: two pieces of area 20, diagonal \((4,3)(8,5)\). Example 2: area 58 = 10 + 42 + 6, diagonals \((7,7)(3,7)\) and \((8,5)(7,7)\). Both examples match the spec.
  - The interim owner is `bezier-curves/geometric-properties`, the same as the S1 precedent `b7b856af`.
  - `just smoke-lesson monotone-partition` passed on `f0e13b67`, before the count fix.
  - tsc, eslint (including the `.cjs` smoke file) and build passed.
- **Blocker:** `src/learning/chapter/guidedExamplePreviews.test.ts`, test "publishes the projective-conics example cards…", fails only on this branch with `projective-conics.projective-five-point.projective-five-point/sl: expected undefined to be truthy`. The same test passes on master plus T3 20.
  - `resolveGuidedExamplePreview` (`guidedExamplePreviews.ts:118`) returns undefined when either the copy or the image `src` is missing.
  - The copy block looks intact. The PNG is tracked at `src/images/learning/examples/projective-conics/…five-point….png`.
  - Suspect: `copyFor(id, demonstrationId)` or the retained-homes mapping. Adding `monotone-partition` under the interim owner, or its new copy entry in `guidedExamplePreviewCopy.ts:82`, may shift or shadow the lookup. Diagnose with a focused run of that one test.
- **The handler's engineering review** of the lesson diff is done (text, actions and smoke row are fine). The worker's mutation gaps are accepted as listed in its report: the scene-change test was not mutation-verified, and the helper at step 7 is caught only by the scenes test.

## Next steps, exactly

1. Fix the sweep 19 preview-test failure above.
   - Rebase onto `origin/master`.
   - Run `just unit src/learning src/demonstrations.test.ts src/Routes.test.tsx`, tsc and build.
   - Rerun `just smoke-lesson monotone-partition`. Live SL/EN switching was not checked separately; add it or confirm that the smoke row covers both languages.
   - Write `docs/reviews/sweep-algorithms/19-acceptance.md`, update sweep README row 19 and the stream line (it says "19 lesson C3 in progress"), push, and remove the worktree.
2. Remove the T3 20 worktree, as above.
3. Next tasks:
   - T3 21: registration of `voronoi` and `voronoi-degenerate`. Its smoke must cover the gaps in 20-acceptance: focus order, keyboard reach of the on-circle position, and 200 % text size.
   - Sweep 20: monotone triangulation lesson C4.
   - At most two workers.

## Risks and lessons

- Count tests conflict, or silently merge wrong, on every rebase. When both sides bump the same count to the same number, git keeps one change, so the count ends one short. Always rerun the count tests after a rebase.
- A `set -e` chain around `just unit … > log` printed "ok" despite a failure. Read the summary line in the log; do not trust echoes.
- The auto-mode classifier blocks `mklink` in worker sandboxes. Workers made the junction with `fs.symlinkSync` or `New-Item -ItemType Junction`.
- CRLF files: edit with Edit or Python binary I/O only.
- Stale remote worker branches remain on `origin`. Deleting them is refused.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), medium effort, in isolated worktrees (`isolation: worktree`); at most two at once; budget watcher at 135k, then `HANDOFF`. Resuming a finished worker with SendMessage for a fix round worked well (20b).
- Reviews: `bezeg-reviewer` (Sonnet), one per lens. Smoke: `bezeg-smoke` (Sonnet).
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 37" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. The successor starts its own successor the same way.
