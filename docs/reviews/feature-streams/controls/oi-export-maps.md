# Open item: export pauses LogisticMap and LinearMap playback (sixth handler, 2026-11-11)

Handler slice, no worker.

- `LogisticMapGraph.tsx` and `LinearMapGraph.tsx` (both F2a; no other worktree had uncommitted or unpublished edits to them) overrode `pausePlayback` without calling super and had no `beforeFigureCapture`, so a figure export captured a running orbit. Each now has `protected override beforeFigureCapture(): void { this.pausePlayback(); }`.
- A sweep of every `override pausePlayback` under `src/graphs` found no other graph without a capture hook.
- `src/graphs/ExportPausesPlayback.test.tsx` has two new cases. Without the fix both failed on `expected true to be false` (still running after `beforeFigureCapture`); with it they pass, and so do `src/graphs/linear` and `src/graphs/dynamics`. Typecheck passed.
- No smoke: one hook call, the same pattern as batch 4, whose PNG export pause was smoked on both De Casteljau routes (`b4-smoke/evidence.md`).
