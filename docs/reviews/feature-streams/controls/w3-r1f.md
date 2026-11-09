# Wave 3 R1f evidence (partial, stopped on HANDOFF)

## Shared parts (src/graphs/base/controls/)
`StepCounter.tsx` (`StepCounter`, `stepCounterText`, nouns step/event, optional `hooks` for per-graph data-* hooks that lessons and host tests read), `ReadoutParts.tsx` (`ReadoutList` dl for labelled rows, ul for sentence rows; `ReadoutHeading`; `ReadoutHelp` without role=note; `ReadoutScrollTable` focusable + named only while it scrolls), `ReadoutParts.css`, `ReadoutParts.test.tsx`. `compgeo/stepCounter.ts` deleted (test import moved).

## Observed failures (deliberate mutations, run `.command-logs/w3-r1f-mut.log`)
- StepCounter `step+1` -> `step`: StepCounter tests (2) and Delaunay wiring test failed.
- ScrollTable always tabIndex: "neither tab stop nor region while it fits" failed.
- role="status" back on Notable chip, Ear reversed line, `data-triangulation="live"` paragraph added: the three compgeo wiring tests failed.
- Not mutation-checked: ReadoutList, ReadoutHeading, ReadoutHelp and the scroll-true case (new code, no pre-change form).

## Decisions
- SweepSideLists `li tabIndex=0` kept: `IntervalSweepGraph.host.test.tsx:488` asserts it and focus drives the board halo (keyboard path to the highlight).
- Sentence readouts (whole translated sentences) render as `ul`, labelled rows as `dl`, so visible text is unchanged.
- Chips: Euler, Notable, Simson, Inversion, Inscribed panels each mount one `LiveReadout` (settled while dragging); Ear reversed line joins its live text; Triangulation live paragraph is a `LiveReadout` (`data-triangulation-live`; host test `part('live')` updated).
- Hull robustness title kept (decision 39).

## Checks
- `just lint` on new files and compgeo: passed. `just typecheck`: only errors in O1's `CurveOperationPanel.test.tsx` (`jest`).
- `just unit src/graphs/compgeo` + `compgeo*.test.ts` lessons: 1 failure (Notable host test asserting role=status, now fixed to toBeNull) on the last full run; not rerun after the fix.
- Not done: Voronoi four-point/vertex lists, Ear result list (`data-result`), neighbours list left as is; no e2e under `tests/` read changed hooks (grep of `data-triangulation="live"` found only the updated host test). Test-time delta not measured.
