# Wave 2 slice C3c: Voronoi and DegenerateSites

Read `w2-common-brief.md`, then `w2-c3-brief.md` (the Voronoi bullet), then `w2-c3-handoff.md` (helpers the first C3 worker added). Spec decisions 32–38 in `docs/specs/shared-graph-controls.md` (*Decided in task 3*) are settled.

**Owned:** `src/graphs/compgeo/VoronoiControls.tsx`, `VoronoiGraph.tsx`, `DegenerateSites*`, any Voronoi-only helper, their tests, the Voronoi lesson tests, and the `VoronoiControls.tsx` entry in `controlExemptions`. Use C3's `ExampleSelect.tsx`, `useStatusReadout.ts`, `stepCounter.ts` and `frameFit.ts` without changing their behaviour; slice C3b owns them and the other trace panels. If you need a change there, report it.

**Work:**
1. Hidden live paragraph to `LiveReadout` via `useStatusReadout` (muted during Play), same announcements.
2. Example and mode button rows to `ChoiceSelect` (`ExampleSelect` for examples). Triangle and site rows stay `aria-pressed` (decision 32).
3. "Reset view" removed; `fitView` returns the frame (decision 37) with a pure test (via `frameFit`) and one real-graph Fit case. "Reset example" stays (recorded exception).
4. The query form (`QueryFields`) becomes a single-point `PointListInput` with no add or remove. Query values are exact rationals in quarter steps: use the list's `grid` if it keeps them exact; if not, report the smallest prop needed and keep the old form for now. The query drag-limit notice goes (decision 7).
5. The construction Next/Back/Reset (`data-action=construct-*`) moves onto `TracePlayback` or the shared playback buttons with no per-graph controller code. If that changes lesson actions, keep the lesson action ids working.
6. Delete `vor_view_reset` and any other key you made unused, in both `sl.ts` and `en.ts`. Remove `VoronoiControls.tsx` from `controlExemptions`.
7. Update the Voronoi and DegenerateSites host tests and the Voronoi lesson test; delete duplicate mechanics cases (`controls-impact.md`); one thin wiring check per graph; an observed failure by mutation for each new assertion; the test-time delta.

**Evidence file:** `w2-c3c.md`. **Handoff note:** `w2-c3c-handoff.md`.
