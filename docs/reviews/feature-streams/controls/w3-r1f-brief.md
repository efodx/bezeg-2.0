# Wave 3 slice R1f brief: shared readout parts and the compgeo readouts

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `r1f`. Decisions 63 and 65 (search `^63\.`), 18, 38, 39, 48; catalogue rows C21 and C27.

## Rows (from `w3-triage.md`)

C27-01, C27-02, C27-03, C27-04 (compgeo panels only), C27-05, C27-11, and the compgeo counters of C27-12.

## Owned paths

- New shared parts in `src/graphs/base/controls/` (owner this wave): `StepCounter`, a readout list, a readout heading, a help element and a scroll-table wrapper (your file layout; one CSS file beside them), with tests. Read `src/graphs/functions/FunctionReadout.tsx` first and build on what it already does instead of duplicating it; do not edit it (slice R1b owns it next).
- `src/graphs/compgeo/*Controls.tsx` and `*Panel.tsx` with readouts listed in the rows, `SweepSideLists.tsx`, their tests; compgeo CSS for the readouts. `sl.ts`/`en.ts` shared (Edit tool only).

Another worker (O1) runs at the same time on the curve operation panel (`src/graphs/base/CurveWorkspaceControls.tsx`, `src/graphs/base/controls/BezierCurveControls.tsx`, `RationalBezierCurveControls.tsx`, `PhBezierCurveControls.tsx`, curve graphs). Do not touch those.

## Work

1. Build the shared parts per decision 65, each with a test. `StepCounter` takes a 0-based index and a total and shows 1-based text; keys: one per noun.
2. Move the compgeo readouts onto them: lists with `data-readout` items, headings (`inspector-reveals-title` h3 variants in compgeo), counters (Monotone, Delaunay, any `Korak … od …` in compgeo). Keep `data-readout`, `data-*` hooks that lessons, clips or tests read (search `tests/` and `src/learning` for each hook before renaming; keep it if used).
3. Decision 63 in compgeo: the visible `role="status"` chips (EulerLine, NotablePoints, Simson, InversionPanel, InscribedAngle, EarClipping's orientation line) become plain readout text; each graph's announcement goes through its one `LiveReadout` (add one where the graph has none, muted while playing); Triangulation's hidden `data-triangulation="live"` paragraph moves into `LiveReadout`. Hull robustness keeps its title (decision 39). `SweepSideLists`' focusable `li tabIndex=0`: make the list readable without a tab stop per item unless a test or lesson needs it (record the choice).
4. Visible text and numbering do not change except where decision 63/65 says (counters are already 1-based per decision 38).

## Checks

Common checks plus `just unit src/graphs/compgeo` and the compgeo lesson tests (`src/learning` files that name the touched graphs). Name e2e tests under `tests/` that read changed hooks (do not run them). For each new assertion, an observed failure in `w3-r1f.md`.
