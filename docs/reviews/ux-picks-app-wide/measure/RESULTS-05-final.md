# Frame measurement after task 05 (pucks), tree `board-workspace` @ 8ac2ac68 plus uncommitted changes

Raw: `final-05-t1.json` / `.log` (5 runs, 1x), `final-05-t4.json` / `.log` (3 runs, 4x). Script: `measure-05.cjs`.
Setup: Vite dev server 127.0.0.1:4483 (dev build, not `vite preview`; the gate numbers are from a production build, so dev adds overhead to every row), Chromium headless, 1440x900, 2.5 s settle, machine otherwise idle during the run (the fuzz runs had finished).

## Script changes (why the rows are not strictly like for like)

`measure-01.cjs` finds the parameter in an inspector slider (`input[type=range]`), which no longer exists for pucked parameters. `measure-05.cjs` keeps the scenarios and statistics but:
- reads the parameter from the puck (`.puck-strip [role=slider]`, `aria-valuenow`);
- commits proxy: mutation batches on the puck strip's parent (the baseline observed the inspector form's container). A smaller observed subtree, so the baseline's 32 to 34 and 80 are not directly comparable to 18 and 48;
- Taylor drag moves the puck pointer 300 px out and back over 60 moves in 2 s (the baseline dragged the slider thumb across the track), and the puck shows its drag ruler while dragging;
- input delay: the `pointermove` time stamp to the rAF after the next `aria-valuetext` mutation in the strip (the baseline used the range input's `input` event time stamp). A pointer move is stamped when the browser receives it, so this metric includes up to a frame of input queueing that the baseline `input` stamp did not. Treat the 1x delay row as an upper bound.

## Results vs the slice-0 gate

Gate (RESULTS.md, "After task 01" and the baseline): De Casteljau play costs no more than on `master`; Taylor drag not worse than baseline.

| Scenario | Throttle | Metric | Gate (baseline / after task 01) | Now | Verdict |
|---|---|---|---|---|---|
| De Casteljau play | 1x | frame median / p95 / max (ms) | 16.7 / 16.7-16.8 / 16.8 | 16.7 / 16.7-16.8 / 16.8 | pass |
| De Casteljau play | 1x | long tasks | 0 | 0 | pass |
| De Casteljau play | 1x | commits proxy | 32-34 | 18-19 (smaller observed subtree) | pass (not like for like) |
| De Casteljau play | 4x | p95 / max (ms) | 16.7-16.8 / 33-50 | 16.7-16.8 / 50-66.6 | marginal: max up one to two frames in 3 runs |
| De Casteljau play | 4x | long tasks | 0 | 1, 2, 1 (53 to 119 ms total) | marginal fail (baseline 0) |
| Taylor drag | 1x | frame median / p95 / max (ms) | 16.7 / 16.7-16.8 / 16.8 | 16.7 / 16.7-16.8 / 16.8 | pass |
| Taylor drag | 1x | long tasks | 0 | 0 | pass |
| Taylor drag | 1x | input delay median / p95 (ms) | 4.3-4.5 / 6.0-6.9 | 14.5-16.9 / 24-24.6 | not comparable (metric changed, see above); no dropped frames |
| Taylor drag | 1x | commits proxy | 80 | 48 (smaller observed subtree) | n/a |
| Taylor drag | 4x | frame p95 / max (ms) | 33.3-33.4 / 50-67 | 50.1-66.7 / 83.3-83.4 | fail |
| Taylor drag | 4x | long tasks (count, total ms) | 1-4 per run, 56-266 | 45, 48, 48 per run; 2638-3083 | fail |
| Taylor drag | 4x | input delay median / p95 (ms) | 23.6-28.2 / 35.6-44.2 | 59.8-66.1 / 75.4-84.9 (metric changed) | fail by any reading (2.5x) |

## Reading

- Playback (De Casteljau) holds the display rate at 1x with no long tasks; at 4x there are one or two long tasks per run that the baseline did not have. Three runs and a dev build cannot separate that from noise; rerun on a production build.
- Taylor drag at 4x is a clear regression: nearly every pointer move is a long task (45 to 48 of 60), where the baseline had 1 to 4 in total. At 1x it is invisible (no dropped frame, no long task), so a user on a fast machine sees nothing, but a slow device will. Candidate causes, not isolated here: the drag ruler (an SVG of ticks recreated in a portal on every move, `RangePuck.tsx` DragRuler, rendered from `onPointerMove`'s `setRuler`), and the puck writing the store on every move so the board redraws per pointer event, where a slider `input` event is already coalesced to one per frame. Not tested; one run with the ruler disabled would separate them.
- Dev build vs production: the baseline and task 01 numbers are production builds. A `just build` plus `vite preview` rerun of the 4x Taylor rows is the check that decides whether this is a dev-mode artefact. I did not run it.
