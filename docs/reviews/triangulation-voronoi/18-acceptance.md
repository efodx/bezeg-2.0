# T3 task 18 acceptance: Voronoi drawing module and Fortune reuse review

Accepted 2026-11-02 by geometry handler 35. Task: [18](../../tasks/triangulation-voronoi/18-voronoi-drawing.md). Reuse review: [18-fortune-reuse.md](18-fortune-reuse.md). Commits: `c49d9c19` (worker result, originally `e2e93593`) and `92f92cc7` (review fixes, originally `c51695fa`).

## Review (Sonnet `bezeg-reviewer`, engineering and mathematical)

Accept with test-strength fixes.

Cleared by the reviewer:
- Ownership: pooled objects, no listeners, idempotent `dispose`, and back to the baseline object count.
- Clipping: `clipToBox` is an exact Liang–Barsky. It handles parallel axes, sign swaps, corner touches and rays starting outside the box. `edgeInBox` gives each edge kind its right parameter range.
- Markers: the "continues" markers mean the cell continues beyond the box. The degree \(\ge 4\) marker is told apart by shape.
- Exactness: arithmetic is exact rational until `toX`/`toY`. Nothing is imported from Delaunay, triangulation or graph code.
- The perf test is skipped without `BEZEG_PERF`.

The review asked for:
1. assertions on the glyph and position of each "continues" marker;
2. `clipToBox` edge cases;
3. pool growth and option toggles;
4. per-component redraw data;
5. a guard for zero-length segments;
6. a doc note on disposal order;
7. the full-site-list indexing invariant for a Fortune sub-diagram.

A worker closed all seven. Each new assertion was observed failing under a deliberate mutation (glyph swap, `>=` to `>`, guard removed, no pool reuse, no clear when off, stale edge data), and every restore was checked with `cmp`.

## Fortune decision (item 7)

Settled in the [T3 decisions](../../tasks/triangulation-voronoi/README.md#decisions-t3-2026-11-02-geometry-handler-34). Fortune draws its own partial sweep state. The shared `VoronoiDiagram` stays final-only.

## Checks

- Worker, in worktree `agent-a2c0ff0c70ae0ebe9`: `just unit src/graphs/compgeo/voronoiDrawing`, tsc and eslint, all clean.
- Handler, on the stream branch at `92f92cc7`: `just unit src/graphs/compgeo` (42 files, 592 tests passed, 3 skipped, the opt-in perf tests among them), `npx tsc --noEmit --pretty false` and eslint on the module, all clean. No build or smoke: the module is not imported by any route yet (task 19).
