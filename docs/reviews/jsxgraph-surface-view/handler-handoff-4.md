# JSXGraph surface view — handler handoff 4

Date: 2026-10-30. Objective: carry out [docs/tasks/jsxgraph-surface-view/](../../tasks/jsxgraph-surface-view/README.md) (spec [jsxgraph-surface-view.md](../../specs/jsxgraph-surface-view.md)) under AGENTS.md. Previous note: [handler-handoff-3.md](handler-handoff-3.md).

## State

- Worktree `.claude/worktrees/jsxgraph-surface-view`, branch `worktree-jsxgraph-surface-view`. All commits below are pushed to `origin/master`, the working tree is clean, and no workers or preview servers are running.
- **03 closed** (`e8ed73a` deletes the unused `applyDomOrder`; `67d8538` adds the [03D record](measure-2026-10-30-03d.md) and marks tasks 03–06 done). Same-state A/B: teapot orbit 19.6 → 28.8 draws/s (probe ceiling), tensor-16 49.5 → 53. All board2d orbit next-rAF p95 ≤ 3.1 ms; tensor/triangular visible 1 frame median, 2–3 p95. Depth check clean.
- **07A** `3ea1645`: `JsxSurfaceView` is the only view. Deleted: `threeSurfaceView.ts` and its tests, `three`/`@types/three`, `VITE_SURFACE_VIEW`, `AttachOptions.onContextLost/Restored`, and one context-loss test. `surface_unavailable` (sl/en) no longer mentions WebGL ("reload the page"). Bundle: all `assets/*.js` 6,275,304 → 5,558,573 B (−716,731; gzip −179,095), mostly the `three.module` chunk (694,911 B); whole-build totals, not traced per route. measure-app.mjs is historical (its `three` strategy needs a 67d8538 build).
- **07B** done:
  - `93144f4`: the JSX view publishes `data-surface-framing` again (`jsxFraming.ts`; full-detail frames only, cached; 6 tests; browser points match ellipse centres within 0.001 px).
  - `b625888`: the smoke and capture helpers check the SVG view instead of a WebGL canvas (`scripts/surface-view-evidence.cjs`). **3ea1645 had turned Browser smoke red** (deploy skipped); b625888 is green and deployed.
  - `692eb27`: the six patch posters and orbit clips (FFmpeg 7.0.2 from `C:\Program Files\Jellyfin\Server\`, selective recapture with `PRESERVE_SOURCE_PROVENANCE` + `VERIFIED_PRESENTATION`) and the eleven patch guided-example PNGs are recaptured. Surface clips now expect the cream background (white was the Three clear colour). The legacy-webgl validator branch is removed. `just check`, script unit tests (119), the demonstrations smoke and the patch lesson smoke passed locally. **CI for 692eb27 not yet checked**; check it first: `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=4"` (no `gh` on this machine).
- Visual note: the derivatives and triangular-split guided examples have crowded labels (S_u/S_v/n near S(u,v)). This is the task 05 label layout, unchanged; record it in 07D as a known limit or fix it.

## Remaining, in order

1. Check CI for `692eb27`. If it is red, fix it before anything else.
2. **07C**: full `$smoke-tester` checklist ([docs/smoke-tests.md](../../smoke-tests.md)) for the patch routes and lessons, plus the bilingual patch walks, through `bezeg-smoke` (Sonnet, broad first pass). The shared workspace changed (renderer), so cover all six patch routes at desktop and narrow width, keyboard/touch orbit, drag, export (PNG/SVG), Presets save/restore, and the language switch.
3. **07D docs**:
   - ADR 0019: status, plus an amendment that drawables are adapter-owned SVG `<polygon>`/`<polyline>` slots in JSXGraph's layer group, not 2D curve elements (reason: the `d` style cost), and that the camera redraw is next-frame, not synchronous (A/B in the 03D record).
   - Update capabilities, current-architecture.md (still mentions ThreeSurfaceView), the patches spec rendering contract, hosting notes, and docs/commands.md (surface capture paragraph; the FFmpeg version actually used).
   - User-visible changes: renderer look, drag cube clamp, labels not occluded by points, raster SVG export, stroke-width toggle no longer animates, cream background in surface clips. No route or Preset break.
   - Mark 07 and the README done, and write a measurement summary for the integrated build (the 03D record covers the gate measurements at code identical to 07A for rendering).
4. Evaluation record (`do-log`, `.agents/skills/subagent-flow-evaluation/SKILL.md`) for 03D + 07. Workers this handler ran (all `bezeg-worker`, Sonnet 5.5):
   - 07A (medium): 11 tool uses, 29k, accepted; handler added a comment and localization fix.
   - 07B1 framing (high): 33 uses, 75k, accepted.
   - 07B2 smoke port (high): 72 uses, 106k, accepted.
   - 07B3 recapture (medium): stopped once on a misattributed "FFmpeg" failure (it was the white-background override); resumed with the fix, 53k total, accepted. Its final report was not delivered; the handler verified from logs.
   - Handler-only: the 03D measurements.

## Lessons

- `just check` does not run browser smoke. Before pushing any renderer or DOM-evidence change, run `just smoke-built` (all specs except guided-lessons) and the patch `just smoke-lesson` rows locally.
- When a worker blames the toolchain, check its numbers against the app first: `[255,253,245]` is the app background.
- Build an old revision for an A/B with `git worktree add --detach <job tmp>/wt <sha>` plus a node_modules junction (`mklink /J`); remove the junction with `rmdir` before `git worktree remove`.

## Settings to keep

Handler: Opus 5.5, permission mode `auto`, self watcher `--until 175000` (owner override), 190k closeout. Workers: `bezeg-worker`/`bezeg-smoke` on Sonnet 5.5; `claude_worker_watch.py <id> --until 135000`. At handoff, commit and push `handler-handoff-<n>.md`, start the successor with `claude --bg` and tell it to do the same. Do not launch when an owner decision is needed or the objective is complete.
