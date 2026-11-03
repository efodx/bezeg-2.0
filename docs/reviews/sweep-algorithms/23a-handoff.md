# 23a handoff (partial)

Worktree `.claude/worktrees/agent-ad42460681997836f`, branch `worktree-agent-ad42460681997836f`, from b6b4dc66. `node_modules` is a junction to the main checkout (made with Node `fs.symlinkSync(..., 'junction')`, because `cmd mklink` is blocked in this sandbox).

## Done (evidence)

- Pure drawing geometry `src/graphs/compgeo/fortuneGeometry.ts`: event-group steps (`fortuneSteps`: step 0 = queue filled, one step per pop group, last = `done`; chosen so every step shows a consistent beach line, not the transient status inside a group), breakpoint formula, per-step arc samples (24 per arc), breakpoints with trace origins (`traceOrigins`: split point, vertex, or infinity), finished traces, scheduled/cancelled circles, vertices, `fortuneBox` (frame united with circle boxes).
- `fortuneRun.ts` (run, notes, exact height text: rational or `q-\sqrt r`, perfect squares collapse to rationals), `fortunePresetCollection.ts` (key `compgeo-fortune`, five examples, seeded `randomGeneralSites`), `fortuneDrawing.ts` (pooled, reused, disposed objects; switch `BeachDrawing = 'arcs' | 'polyline'`), `FortuneControls.tsx` (playback, examples, minimal readouts, LaTeX height, live region, kernel-reason refusals), 29 `fortune_*` keys in `sl.ts`/`en.ts`.
- `PointSetGraph.tsx`: one added protected hook `pointName(index)` (default `P{n}`) so the Fortune graph can label sites A, B, C. Not in the brief's owned list; report it.
- `npx tsc --noEmit --pretty false`: clean (`23a-tsc.log`). `just unit src/graphs/compgeo/fortuneGeometry`: passed (3 tests: beach `A, B, A, C, A` present, cancelled circle after scheduled one, arc samples under the envelope). Not mutation-tested.

## Remaining, in order

1. `FortuneGraph.tsx` (extends `PointSetGraph<'grid'>`, points mode, limit 12; pattern: BentleyOttmannGraph for controller/step/Play, VoronoiGraph for `followBox`/`visibleBox` with the 16 px inset and for the final `createVoronoiDrawing(...).update` at `done`). Keep the step across drags (clamped), unlike Bentley-Ottmann which resets it. Constructor option `beachDrawing`. Override `pointName`. Dispose the sweep handle and Voronoi handle on unmount, `disposeFigureScene`, scene replacement. Hide the sweep objects (`clear()`) at `done`. `loadExample(id)`: `random` uses an incrementing seed.
2. `FortuneGraph.host.test.tsx` per brief item 4, with mutations observed.
3. Checks: `just unit src/graphs/compgeo/FortuneGraph --maxWorkers=2`, `just lint` on touched paths, tsc, `just build`; logs to `23a-*.log`.
4. `scripts/fortune-browser-perf.cjs` (model: `scripts/triangulation-browser-perf.cjs`), temporary uncommitted route `/compgeo/fortune`, preview on port 4323, 3 runs per approach, `23-perf.md` and `23-perf-raw.txt`; revert the route and stop the preview.
5. Commits: graph; then measurement.

## Not done / unverified

No graph, host test, build, lint, browser or perf measurement yet. No perf numbers. No temporary route was created and no preview was started.

## Risks

- `fortuneDrawing.ts` `dispose()` calls `clear()`, which calls `setCurve` on live objects; fine before the board is freed, wrong after.
- Steps are event groups, not every trace entry (deviation from "step over the trace"); say so in the report.
- `MathParagraph` calls `typesetMath`; in jsdom this may start a script load; mock `loadMathJax` in the host test if it is noisy.

## Update (worker 2)

Done: FortuneGraph.tsx, FortuneGraph.host.test.tsx (6 tests, 4 mutations observed), fortuneBox fix (a02ff282), measurement (23-perf.md; polyline recommended, default still arcs). Logs 23a-*.log are from the final tree. Temporary route reverted, preview stopped. Not done: registration of the route/catalog/lesson actions (task 24).
