# JSXGraph surface view — handler handoff 1

Date: 2026-10-30. Objective: carry out [docs/tasks/jsxgraph-surface-view/](../../tasks/jsxgraph-surface-view/README.md) (source spec [jsxgraph-surface-view.md](../../specs/jsxgraph-surface-view.md)) under AGENTS.md.

## State

- Worktree `.claude/worktrees/jsxgraph-surface-view`, branch `worktree-jsxgraph-surface-view` (also on `origin`). `node_modules` installed.
- `master` = `ef010ea` (gate adapter, harness, gate record, ADR 0019). Task 02 is commit `0bf9f35` on the branch; this note's commit follows it. If `just check` passed on `0bf9f35` (it was running at handoff), these commits are pushed to `master`; otherwise the successor reruns `just check`, fixes, and pushes (fetch, rebase onto `origin/master`, `git push origin HEAD:master`).

## Accepted work

- **Task 01 done.** Gate passed under owner option A (2026-10-30): [gate.md](gate.md), [ADR 0019](../../adr/0019-jsxgraph-surface-view.md) supersedes 0018. `board2d` strategy; owner accepted 2–3 frames orbit latency and a reduced-detail teapot orbit. Harness `docs/prototypes/jsxgraph-surface-view/measure-app.mjs`; records in `gate-2026-10-29/`.
- **Task 02 done.** `jsxProjection.projectToScreen` is the single projection; view3d frame mapping in `jsxView3dMapping.ts`; independent oracle `pinholeOracle.test-helper.ts`; `three` removed from oracle tests (assertions one-for-one, checked by the handler); 86-case framing test `src/graphs/patches/jsxSurfaceFraming.test.tsx` (fails pre-fix). Root cause of the gate's framing: NDC x lacked division by aspect.
- Checks at `0bf9f35`: tsc clean; surface-view + framing + lesson oracle tests 88/88 (handler); worker ran `just unit src/graphs/patches src/learning` 1907 passed and the `jsx-board2d` build.

## Remaining, in order

1. **03 and 04 in parallel** (README allows it). Ownership: 04 moves pointer/drag/select handling into a new `jsxInteraction.ts` and edits `jsxSurfaceView.ts` only at those call sites; 03 owns the rest of `jsxSurfaceView.ts` plus new rendering/depth files. Gate items already written into each task file ("From the gate" paragraphs): 03 = synchronous camera redraw (`reconcile` defers to rAF), teapot reduced detail while orbiting, joins top-preset `net-2` depth failure, re-run `measure-app.mjs`; 04 = first press on an unselected point never drags (`select` rebuilds the board mid-gesture, `jsxSurfaceView.ts` select emit), map z-mode onto `verticalDrag` (Shift; touch needs the toggle). Use separate build outDirs and preview ports.
2. 05 labels/export, 06 lifecycle (after 03/04), 07 switch-over (full smoke, bundle size, posters/clips, docs).

## Worker notes

`C:\Users\1337Hacker\.claude\jobs\302d1e29\tmp\` holds 01a/01b/02 handoff notes and logs (job-local; may be gone). Lessons: workers hit the 135k budget at ~55–80 tool uses on this feature — size slices smaller than the gate's; measurement runs are long (01B: ~25 min).

## Open risks

- Gate metric (event → next rAF) is vacuous with deferred drawing; judge orbit with the harness's `eventToFrameAfterLastMutationMs` and frame-interval p95.
- `applyDomOrder` (`jsxDepthOrder.ts`) is greedy, not minimal moves; may matter for teapot cost.
- Three is still the default; the deploy is unaffected until 07.

## Settings to keep

Handler: Opus 5.5 (`claude-opus-5-5`), permission mode `auto`, self watcher `--until 175000` (owner override), 190k closeout. Workers: `bezeg-worker`, Sonnet 5.5; `effort: high` for rendering/interaction/math slices (recorded reason: renderer design and camera mathematics), medium for routine fixes; start `claude_worker_watch.py <id> --until 135000` per worker and send `HANDOFF` at the threshold. At handoff, start the successor yourself with `claude --bg` and tell it to do the same.
