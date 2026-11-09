# Wave 3 slice R1b brief: readouts outside compgeo

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `r1b`. Decisions 63 and 65 (search `^63\.`), 18, 38. R1f built the shared parts and moved compgeo onto them: read `w3-r1f.md` and the parts in `src/graphs/base/controls/StepCounter.tsx`, `ReadoutParts.tsx` (+ css) before starting. Use them; do not edit them (report a needed prop with the smallest proposal).

## Rows (from `w3-triage.md`)

C27-06 (projective), C27-07 (complex and linear `demo-status`), C27-08 (functions `FunctionReadout`, `role=note`, Epicycle scroll table, Fourier notes, Bezier clipping table), C27-09 (patch help notes), C27-10 (collision readouts and Inspect progress), C27-12 (function counters `*_board_progress`).

## Owned paths

`src/graphs/projective/**` controls, `src/graphs/complex/**`, `src/graphs/linear/LinearMapGraph.tsx`, `src/graphs/functions/FunctionReadout.tsx` and the function graphs that render readouts, notes or counters, `src/graphs/compgeo/BezierClippingControls.tsx` (scroll table only), `src/graphs/patches/*Panels.tsx` (help notes only), `src/learning/playground/collisions/**` (readouts and progress only), their tests and CSS; `sl.ts`/`en.ts` (Edit tool only, keep LF).

## Work

1. Decision 63: projective visible `data-projective-status` blocks and complex/linear `demo-status` groups become plain readout text (no `role="status"`, no `aria-live`); each graph announces through its one `LiveReadout`, settled for drags and muted while playing; the hidden `data-projective-nudge` paragraphs move into that `LiveReadout`.
2. `FunctionReadout`: build it on `ReadoutList` (or make it a thin wrapper), keep its `data-readout` hooks and visible text; `role="note"` help becomes `ReadoutHelp` across functions, patches and Fourier.
3. Scroll tables (Epicycle, Bezier clipping) use `ReadoutScrollTable`.
4. Counters: function `*_board_progress`, collision Inspect progress and any other hand-written "k of n" use `StepCounter` (1-based, decision 65); keep their hooks.
5. Before renaming or removing any `data-*` hook, grep `tests/`, `src/**/*.test.*` and `src/learning` for readers; keep it if read.

## R1f review carry-over (you own `ReadoutParts.tsx`, its CSS and test for these items only)

From `w3-review-r1f-eng.md` and `w3-review-r1f-ui.md`:

6. `ReadoutScrollTable` measures `scrollWidth > clientWidth` once on mount and observes only the wrapper; re-measure when its content changes (observe the child, or measure on each render), with a test that grows content inside a fixed-width wrapper. It has no user before this slice.
7. `ReadoutList`'s `dl` branch depends on row styles in `functions/FunctionReadout.css`; move them into `ReadoutParts.css` when `FunctionReadout` moves onto it.
8. Strengthen the weak assertions listed in `w3-review-r1f-eng.md` item 5 (each must fail without the change).

## Checks

Common checks plus `just unit` for each touched directory and the lesson tests that read these readouts (`grep -rl` the hooks under `src/learning`). For each new assertion, an observed failure (revert, run, restore) in `w3-r1b.md` as you go, not at the end.
