# Jank-probe baseline on master (task 01c, slice 3)

Probe: `node scripts/probe/probe.cjs` against the production preview `http://127.0.0.1:4471/bezeg-2.0/`, headless Chromium, 2026-11-22.
Raw numbers: `probe-baseline-1440x900.json`, `probe-baseline-1024x768.json`, `probe-baseline-1440x900-throttle4.json`, `probe-repeat-1440x900.json`. `node scripts/probe/summarize.cjs label=file.json` prints one line per route.

Cells: frame gap p95 / max in ms, long tasks over 50 ms, layout shift (cls). Thresholds: p95 <= 20, max <= 50, no long task over 50 ms, cls <= 0.02 (throttled: 40 / 100, long tasks reported only). Headless frames sit on the 16.7 ms tick, so p95 is rarely informative unthrottled; long tasks and the step checks carry the signal.

## 1440x900, no throttle

| Route | Slider drag | Board pan | Point drag | Play, then slider |
|---|---|---|---|---|
| analysis/taylor | 16.8 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | no playback |
| functions/transformations | 16.8 / 16.8 / 0 / 0 | board did not pan | 16.8 / 16.8 / 0 / 0 | no playback |
| bezier/decasteljau | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0.0025 |
| analysis/phase-portrait | 16.8 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | not found (see noise) | 16.8 / 16.8 / 0 / 0 |
| analysis/taylor lesson | 16.7 / 16.8 / 0 / 0 | 16.8 / 16.8 / 0 / 0 | 16.8 / 16.8 / 0 / 0 | no playback |

## 1024x768, no throttle

Same shape: every drag cell 16.7-16.8 ms p95/max, 0 long tasks, cls 0 (De Casteljau play 0.0049). Board pan did not move the board on transformations, De Casteljau, phase portrait (plain or shift drag from the bottom-left corner); point drag not found on phase portrait.

## Taylor lesson, Next x12 then Back x3

| Viewport | Max glides per step | Jumps | Steps with a long task over 50 ms | Max frame gap | Max settle | Back return |
|---|---|---|---|---|---|---|
| 1440x900 | 1 | next10, back9 | 5 | 66.6 ms (next7) | 102 ms | 0 % |
| 1024x768 | 1 | next10, back9 | 5 | 50 ms | 88 ms | 0 % |

## 4x CPU throttle, 1440x900

| Route | Slider drag | Board pan | Point drag | Play, then slider |
|---|---|---|---|---|
| analysis/taylor | 33.3 / 50 / 1 / 0 | 16.7 / 16.8 / 0 / 0 | 33.3 / 33.4 / 0 / 0 | no playback |
| analysis/phase-portrait | 50.1 / 83.3 / 9 / 0 | 16.8 / 33.4 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | 16.8 / 33.4 / 0 / 0 (touch p95 49.9) |

## Threshold failures on master (findings, not fixed)

- Taylor lesson, both viewports: a long task over 50 ms in Next 7, 8, 12 and Back 11, 9 (1 each); one view jump (a single-sample move over 15 % of the width) at Next 10 and Back 9; one frame gap of 66.6 ms at Next 7 (1440 only).
- Throttled phase portrait: slider drag p95 50.1 ms (limit 40) with 9 long tasks; touch during play p95 49.9 ms.
- Not failures but unmeasured: board pan did not move the board on transformations (both viewports), De Casteljau and phase portrait (1024 only); the drag then measures nothing.

## Noise (same route twice, 1440x900, no throttle)

Phase portrait: all 16.7-16.8 / 16.8 ms in both runs; the point drag was missing in run 1 and found in run 2 (point lookup depends on JSXGraph object state at that moment: treat "not found" as unreliable). Taylor lesson: Next/Back long-task steps 5 then 4 (of 15), max frame gap 66.6 then 50 ms, max settle 102 then 82 ms, jumps next10 and back9 in both runs. Compare later runs against these ranges: long-task counts differ by one, frame max by one 16.7 ms tick, settle by about 20 ms.

## `n/a` metrics

Board cover (needs `.ux-btext`, `.ux-pucks`, `.ux-pucks-toggle`, `.ux-dock-tray`) and value width drift (needs pucks) report `n/a`; they switch on once tasks 03-07 add the elements. Glides per step apply to lesson steps and were measured. Taylor, transformations and Taylor lesson have no playback, so Play then slider is skipped there.
