# JSXGraph surface view — handler handoff 2

Date: 2026-10-30. Objective: carry out [docs/tasks/jsxgraph-surface-view/](../../tasks/jsxgraph-surface-view/README.md) (source spec [jsxgraph-surface-view.md](../../specs/jsxgraph-surface-view.md)) under AGENTS.md. Previous note: [handler-handoff-1.md](handler-handoff-1.md).

## State

- Worktree `.claude/worktrees/jsxgraph-surface-view`, branch `worktree-jsxgraph-surface-view` (also on `origin`). All commits below are on `origin/master`; this note's commit follows them.
- Commits: `343a499` (03A styling/sync camera/reduced teapot orbit + 04A `jsxInteraction.ts`, first-press drag, z-mode → `verticalDrag`), `a1eb687` (03B depth pieces + automated four-view depth check + screenshots; 04B JSX editing tests, touch retarget, `interaction.md`), `5a3830b` (05 labels/capture + 03B review fixes: re-split on length, decisive samples, dash caches), `15703dd` (06 lifecycle tests, queued-frame fix, jsdom heap cause). `just check` passed on each before commit.
- 03C (measurement re-run, framing comparison) is committed with this note; see "03C".

## Accepted work

- **03 done** except whatever 03C left open: role styling from `surfaceStyles.ts` (shared with Three), synchronous camera-only redraw, ≥1500-triangle meshes orbit at every-third-triangle detail with a full redraw 150 ms after settle; polylines split into depth pieces (~1 mean mesh edge, ≤16, re-split when a drag changes the length, deferred to drag end); `jsxSurfaceDepth.test.tsx` (pinhole oracle vs DOM paint order, 1.25-edge tolerance, decisive samples required); screenshots `depth-2026-10-30/`. Gate's joins/top `net-2` cut: fixed (remaining hidden parts are true occlusion).
- **04 done**: [interaction.md](interaction.md) documents axes, Shift/switch vertical drag, touch (switch is the path), keyboard; browser table incl. CDP touch. Drag is clamped to a cube of half side `max(2, 1.25 × extent)` around the target (Three had no limit) — a user-visible change to record in 07.
- **05 done**: [labels-export.md](labels-export.md). Handler decision: figure SVG export keeps the raster (vector surface deferred). Parity gap: control-point spheres do not occlude labels (Three's do).
- **06 done**: `jsxSurfaceLifecycle.test.tsx`, `jsxSurfaceHeap.test.tsx` (uses `v8.setFlagsFromString` for gc — breaks, not skips, if that stops working). jsdom retention was JSXGraph's zero-delay text timer; helpers call `letBoardTimersFire()` after dispose.

## 03C

Measured and committed with this note: [measure-2026-10-30.md](measure-2026-10-30.md) (revision 15703dd). Framing matches Three (JSX 1–3% smaller). Orbit, desktop/narrow p95: synchronous camera redraw did **not** remove a frame — it moved the draw into the pointermove task (next-rAF 3 → 16–30 ms), visible latency ≈ 49–51 ms (≈3 frames) for tensor/triangular at both densities (gate: 34 ms at density 8), frame cadence still 16.7 ms. Teapot reduced-detail orbit: frame p95 100 → 83 ms (≈12 fps), visible 193/286 ms. Tensor/triangular are inside ADR 0019's accepted envelope (60 fps cadence, ≤2–3 frames); the teapot is accepted "at reduced detail" without a rate, but 12 fps is a weak result and the synchronous redraw is not earning its cost.

**Next step before 07 (03D, performance follow-up):** CPU-profile one orbit frame (tensor 16 and teapot) on the production board2d build to see where draw time goes (path writes, sort/`applyDomOrder` reordering — handoff 1 flagged it as greedy, label occlusion now per frame, dash offsets, JSXGraph `board.update` of point3d). Then: (a) revert or keep the synchronous camera redraw by measurement (the 03C record says it raised next-rAF without lowering visible latency); (b) make teapot reduced detail substantially cheaper (e.g. larger stride, skip net/segment pieces and label occlusion during orbit, avoid DOM reordering when order is unchanged) and re-measure with `measure-app.mjs` (≈6 min for board2d+three, quiet machine). Only if the teapot cannot reach a reasonable orbit rate (state a target, e.g. ≥30 fps) or tensor/triangular leave the 2–3-frame envelope does it become an owner decision under ADR 0019; then stop and ask.

## Remaining, in order

1. 03D performance follow-up (above).
2. **07 split** (too large for one worker): 07A default swap (`defaultSurfaceView.ts` → `JsxSurfaceView`), delete `threeSurfaceView.ts`/tests/`three` dependency and `AttachOptions.onContextLost/Restored`, rewrite tests asserting Three internals against the `SurfaceView` contract, bundle size before/after for patch routes, `VITE_SURFACE_VIEW` switch removal or retention decided; 07B recapture patch posters, the six surface-orbit clips (`PREVIEW_RECAPTURE_IDS`, docs/commands.md line ~30) and check whether the eleven patch guided-example PNGs (docs/ui-functionality.md:69, [examples-previews](../bezier-patches/examples-previews.md)) need recapture for the new look; 07C full `$smoke-tester` checklist for patch routes and lessons plus bilingual patch walks (`bezeg-smoke` worker); 07D docs: ADR 0019 status, capabilities, architecture, patches spec rendering contract, hosting notes, user-visible changes (look, drag cube clamp, labels not occluded by points, raster SVG export), no route/Preset break. 07A first; 07B/07C after it; 07D last or with 07C.

## Worker notes and lessons

Job-local notes (may be gone): `C:\Users\1337Hacker\.claude\jobs\8e33f11a\tmp\` (`03b-handoff.md`, `*-browser.mjs`, logs, `dispatch.log`). Lessons: two parallel workers editing `jsxSurfaceView.ts` each restored the file from backups during mutation runs — brief workers never to restore whole files; serialize or tell the remaining worker to re-check its regions. 03B hit 135k at 80 turns; others finished in 24–87 tool uses.

## Open risks

- Flat mesh fill (Three shades) may look flat; dashes restart per split piece only via offset (handled).
- Framing test can exceed 300 s on a loaded machine.
- `measure-app.mjs` reads point fills from `surfaceStyles.ts`.

## Settings to keep

Handler: Opus 5.5 (`claude-opus-5-5`), permission mode `auto`, self watcher `--until 175000` (owner override), 190k closeout. Workers: `bezeg-worker`, Sonnet 5.5; `effort: high` for rendering/interaction/math slices (renderer design and camera mathematics), medium for routine fixes, reviews and measurement; `claude_worker_watch.py <id> --until 135000` per worker, `HANDOFF` at the threshold. At handoff, start the successor yourself with `claude --bg` and tell it to do the same.
