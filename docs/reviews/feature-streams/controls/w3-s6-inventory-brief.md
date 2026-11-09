# Step 6 item 1 (code part) brief (handoff-v13)

## Role

`bezeg-worker`, read-only on source. Your only writes are `docs/tasks/mobile-graph-playback/graph-adjacent-controls.inventory.md` and logs under `.command-logs/w3-s6-*.log`. Do not commit, push or delegate. Another worker is writing `docs/reviews/feature-streams/controls/w3-triage.md` at the same time; do not touch it.

## Goal and source

Complete the code part of work item 1 in [graph-adjacent controls](../../../tasks/mobile-graph-playback/graph-adjacent-controls.md) (read lines 1–20). The inventory file is a partial Wave 1 survey; Wave 2 sweeps (2026-11-09) and contracts task 3 have since changed playback rows, so **reverify every row at HEAD**, not only the `?` cells.

## Acceptance

1. Every row in *Routes* has all cells filled with `file:line` evidence at HEAD: kind (iterative, continuous, mixed), the complete action set, live parameter and speed controls (and whether editing them pauses or resets playback), and host (`PlaybackButtons`, the shared trace-playback helper, or own-built, with line).
2. The open routes are resolved: subdivision-2, `/bezier/subdivision`, `/functions/arc-length`, monotone-triangulation, hull-robustness, patch sweeps, Epicycle placement. Find routes missing from the table: search `demonstrations.ts` and `graphFactories.ts`, and grep for `PlaybackButtons`, `requestAnimationFrame`, `setInterval`, `isPlaying`, `play`/`pause` handlers under `src/graphs` and `src/learning` (learning playgrounds such as collision and Euler count). Add each as a row.
3. A short *Lesson and chapter hosts* section: which of these graphs appear in Guided lessons or chapter activities and whether the lesson panel drives playback (search the lesson content for the graph ids; a count plus examples is enough).
4. Replace the *Open* section with what remains for the browser part (the handler runs that next): the list of representative routes to screenshot at 390×844 and 360×640 (pick at least two iterative, two continuous, one compgeo trace, one learning playground).
5. Update the header line: date 2026-11-09, "code part complete", and drop "partial" only if 1–2 are complete.

## Checks

`grep -l`/`-c` before `grep -n`; read about 150 lines per call at most. No test runs needed.

## Return

At most 250 words: route count before and after, routes added, rows whose host changed since Wave 1, the representative screenshot list, and anything uncertain. If `HANDOFF` arrives, finish the row you are on, mark the rest "not reverified", and stop.
