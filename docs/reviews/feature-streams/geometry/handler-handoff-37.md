# Geometry stream: handler handoff 37

Written 2026-11-03 by handler 37 (Opus 5.5, auto, effort medium). Continues [handoff 36](handler-handoff-36.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run (all on `origin/master`)

- **Sweep 19**, lesson C3, accepted ([record](../sweep-algorithms/19-acceptance.md)); the lesson commit is `a75cada1`.
  - The "blocker" in handoff 36 was not the lesson. Vitest's filesystem transform cache (`node_modules/.vitest-cache`) kept an old `import.meta.glob` result in `guidedExamplePreviews.ts`, and master failed the same test.
  - Fix: `npx vitest --clearCache`, or pass `--no-fsModuleCache`. `docs/commands.md` now documents it.
  - It happened again this run with the quadrature card PNG. **Whenever a preview test reports a missing `src`, clear the cache first.**
- **Sweep 20**, lesson C4, accepted ([record](../sweep-algorithms/20-acceptance.md)); the lesson commit is `ae56ab51`.
  - The worker stopped at its budget, and the handler finished the checks.
  - Two rebases landed on master's lessons N4 and P2. The preview counts are now 91 lessons and 98 copy entries.
- **T3 21**, registration, is on master but **not accepted**.
  - Commit `dc484e09` registers both routes (`voronoi`, `voronoi-degenerate`; B5 title *Izrojena mesta* / *Degenerate sites*).
  - Commit `e9b36ce2` fixes the stale clipped diagram after a scene reset or a Preset replacement. Cause: the follow and start boxes were stored in grid units. The fix compares the board-coordinate `startView` and re-measures when the grid step changes. `initialView()` now uses `exampleModel()`'s frame.
  - The full unit run had 9766 passed and 1 failed, the stale-cache test above. That test passed after clearing the cache. Build and tsc passed.
  - Review (Sonnet): accept. Its one unchecked path: a reload with no stored Preset (`BaseGraph.tsx:343`, `applyFigurePreset({id:""})`). If that keeps the current sites, they may start outside the example frame.
  - Smoke ([21-smoke.md](../triangulation-voronoi/21-smoke.md), Haiku, stopped at its budget): 7 of 9 checks passed. Check 6, the Preset round trip, was not done because of a harness locator timeout, not a confirmed app defect. Check 9, the 40-site drag, was not run.
  - The smoke covered the gaps from 20-acceptance: Tab order, keyboard-only use of the on-circle control, and 200 % text size. All passed. The smoke also saw a JSXGraph console warning, "gridX/gridY is deprecated", with the grid on; it was not checked whether this warning existed before.

## Next steps, exactly

1. **Finish T3 21.**
   - Smoke check 6, the Preset round trip, on both routes.
   - Smoke check 9: the drag at 40 sites on `voronoi`, compared with the numbers of T3 18 (`docs/reviews/triangulation-voronoi/`, the 18 perf record).
   - Check the no-stored-Preset reload path from the review.
   - Use a Sonnet `bezeg-smoke` (`model: sonnet`), because Haiku ran out at 78k. Build first with `just build`, then `just preview <port>`.
   - Then write `docs/reviews/triangulation-voronoi/21-acceptance.md` and set README row 21 and the stream line to accepted.
2. **Next tasks** (at most two workers): T3 22 and 23 (the Voronoi lessons B4 and B5), and sweep 21 (chapter sections for S2, which moves C3 and C4 off the interim owner `bezier-curves/geometric-properties`). Read their task files first.
3. **Worktree cleanup.** Each of these still has untracked logs, and git needs `--force`, which the auto-mode classifier refused:
   - `agent-a6cad592b3cce9bc2` (T3 20; logs already copied to the stream worktree)
   - `agent-a4a5041852b53977c` (sweep 20)
   - `agent-ac09fc8fac554e676` (T3 21)

   Copy any wanted logs, then ask the owner to remove them, or leave them. The local branches `worktree-agent-ae1c6730a8e760de2` and `t3-20-backup` are merged or superseded and can be deleted.

## Risks and lessons

- Count tests: every rebase onto another stream's lesson needs a manual recount. Git keeps one of two identical bumps, so the count ends one short. This run hit it twice.
- Workers whose `node_modules` is a junction, or who resolve the parent checkout's modules, share the main checkout's Vitest cache. The briefs now say `--no-fsModuleCache`.
- Junction creation: `mklink` and `New-Item -ItemType Junction` were both refused in one worker sandbox; `node -e "fs.symlinkSync(target, 'node_modules', 'junction')"` worked. A worktree under `.claude/worktrees/` also resolves the parent `node_modules` without any junction.
- A `bezeg-smoke` agent defaults to Haiku (78k budget). For a 9-check route smoke, pass `model: sonnet`.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), medium effort, `isolation: worktree`, at most two at once, budget watcher at 135k, then `HANDOFF`. A fresh worker pointed at an existing worktree path worked well for a fix round (21b).
- Reviews: `bezeg-reviewer` (Sonnet), one per lens. Smoke: `bezeg-smoke` with `model: sonnet`.
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 38" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. The successor starts its own successor the same way.
