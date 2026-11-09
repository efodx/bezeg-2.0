# Wave 3 blocker triage brief (handoff-v13)

## Role

`bezeg-worker`, read-only on all source and docs. Your only write is `docs/reviews/feature-streams/controls/w3-triage.md` (and command logs under `.command-logs/w3-triage-*.log`). Do not commit, push, or delegate. Preserve every change you did not make.

## Goal and source

Blocker triage ([stream README, Item batches](../../../tasks/feature-streams/README.md#item-batches)) for [task 4, remaining controls](../../../tasks/shared-graph-controls/04-remaining-controls.md) (spec Order step 5: C9–C13, C15, C20, C24–C27, C29, C30). Wave 2 sweeps already moved many sites, so the catalogue's "Today" column is out of date: survey the code **as it is at HEAD**.

Read by section: spec `docs/specs/shared-graph-controls.md` rows C9–C13, C15, C20, C24–C27, C29, C30 in *Capability catalogue* (lines 33–54), *Likely exceptions* (lines 56–87), and decisions 4, 9, 10, 38, 39, 48, 55 (search `^4\.`, `^38\.` etc. under *Owner decisions* / *Delegated decisions*). Also the contracts playback policy `docs/tasks/mathematical-runtime-contracts/03-shared-trace-playback.md` (by section) and the open-item list in `docs/reviews/feature-streams/controls/state.md` section *Open items for step 5*.

Shared controls live in `src/inputs/` and `src/graphs/base/controls/` (find `PlaybackButtons`, `TracePlayback` or the trace-playback helper, `LiveReadout`, `UnavailableButton`, `ChoiceSelect`, `CountSetter`, `Slider`, `OnOffSwitch`). Graphs live under `src/graphs/**`, the learning playgrounds under `src/learning/**`.

## Output: one table per task item, every site a row

Write `w3-triage.md` with:

1. A **sites table** with columns: `ID` (e.g. `C12-01`), capability (C9…C30), `file:line`, current state (one phrase), blocker (the missing shared capability or decision, or "none"), unblocking capability (the one shared change that would unblock it, named consistently so rows group), proposed slice (task 4 item 1–6). Cover at least:
   - C12/C24: every playback row not on `PlaybackButtons` or not on the shared trace-playback policy (De Casteljau buttons and `aria-live` t readout, arc-length Play under reduced motion, Parametric roll, Euler Next step / Show all, Epicycle Play, Voronoi construction, collision playground Play/Step once/New arrangement, and any other), plus graphs whose `nextStep`/`play`/`pause`/`exportBusy`/`atEnd` wiring is hand-copied; note each graph's pause-on-edit behaviour.
   - C15: operation panels (`CurveWorkspaceControls`, `BezierCurveControls`, Extrapolation, Elevation, Subdivision and rational versions).
   - C27: readout blocks (`data-readout`, `dl`/`ul` lists, readout headings, help `role=note`, scroll tables, step counters and whether 0- or 1-based), including projective `role="status"` paragraphs and nudge region and Triangulation's `data-triangulation="live"`.
   - C11: raw reveal buttons and any remaining raw checkboxes.
   - C13: raw ranges and copied angle-slider-with-degrees-field patterns.
   - C9/C20: local Reset buttons, Fit / Show all / Reset view buttons, copied camera panels.
   - C10/C25/C26: any example, mode or degree chooser still not on `ChoiceSelect`/`CountSetter` per decisions 4, 9, 10.
   - C29/C30: only a count and the grep you used (duplicate keys such as "Next step", unruled layout classes); full listing is not needed now.
   - The other open items in state.md (complex/linear/Bernstein panels, Pascal steppers and `pointset-row` coarse-pointer rule, `ChoiceSelect` unavailable reason, `PointCollection` item noun, the test debts): one row each with the blocker.
2. A **capabilities table**: each distinct unblocking capability, the rows it unblocks (count and IDs), its owner files (shared files it must change, e.g. `src/graphs/base/controls/PlaybackButtons.tsx`), and whether a spec decision is missing (state the question and the options in one line each).
3. A **file-overlap note**: for the first proposed pair (item 4 playback, item 5 readouts/operations), list files both would touch. The state note assumes only `sl.ts`/`en.ts` overlap; confirm or refute.

Every row needs evidence from the code (`file:line`), not from the catalogue. A site with no blocker says "none".

## Checks

Use `grep -l`/`-c` before `grep -n`; read at most about 150 lines per call. No test runs are needed; if you run any command, use `just` recipes and log to `.command-logs/w3-triage-*.log`.

## Budget and return

If `HANDOFF` arrives, finish the table section you are on, mark uncovered capabilities "not surveyed", and stop. Handoff note path: `docs/reviews/feature-streams/controls/w3-triage-handoff.md` (only if you stop early).

Return at most 300 words: row counts per capability, the capability list in suggested build order, missing decisions, the overlap verdict, and anything that contradicts the state note.
