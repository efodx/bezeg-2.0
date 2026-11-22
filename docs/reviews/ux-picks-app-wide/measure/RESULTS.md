# Baseline frame measurement, base commit 057d8d22

Raw data: `baseline-057d8d22.json` (array of three script outputs: throttle 1 run A, throttle 1 run B repeat, throttle 4). Script: `measure-01.cjs`.

## Setup

- Commit `057d8d22` (detached worktree, `just build`, revision 057d8d223c0c, clean), served with `vite preview` on 127.0.0.1:4477, base path `/bezeg-2.0/`.
- Chromium 156.0.8078.4 (Playwright, headless), viewport 1440x900, fresh browser context per run, 2.5 s settle after load.
- Refresh rate: rAF cadence 60 Hz (16.7 ms), measured by the script (`refreshHz`).
- Throttle: none (`--throttle 1`, 5 runs, executed twice = 10 runs) and CDP `Emulation.setCPUThrottlingRate` 4 (3 runs).

## Scenarios

- `decasteljau-play`: route `bezier/decasteljau`, default example (t = 0.5), click "Predvajaj", sample 5 s. Playback itself only moves t from 0.5 to 1 and then stops, taking 1.72 to 1.74 s unthrottled (1.56 to 1.65 s at 4x, as measured by 100 ms polling), so about two thirds of the 5 s window is idle after playback ends.
- `taylor-drag`: route `analysis/taylor`, default example, first range input (center, -2..2, starts at 0). Mouse down on the thumb, 60 `mouse.move` steps over about 2 s, out to the maximum (step 30) and back (step 60), mouse up after sampling.
- Frame intervals: rAF timestamps. Long tasks: `PerformanceObserver` `longtask` (> 50 ms).
- Commits proxy: number of `MutationObserver` callback batches on the inspector form's container (`form`'s grandparent), not the board SVG. It is a proxy for React commits, not a count of them; batches may merge or split commits.
- Input delay: the range input's `input` event `timeStamp` to `performance.now()` inside the first rAF callback after a mutation of `aria-valuetext` on the inspector (the React commit updates it). Inputs coalesced into one commit are not matched (`unmatchedInputs`, 0 in all runs). 40 of 60 steps matched per run, as the browser delivers at most one `input` per frame and moves are 33 ms apart; the remainder fall between values with no change (step 0.1 over 30 steps of the track, only changed values emit `input`). It excludes paint/compositing after the rAF.

## Results

Values are ranges of the per-run statistic across runs (per-run median / p95 over that run's frame intervals, ms).

| Scenario | Throttle | Runs | Frame interval median | p95 | max | Long tasks (count, total ms) | Commits proxy | Input delay median | p95 |
|---|---|---|---|---|---|---|---|---|---|
| decasteljau-play | 1x | 10 | 16.7 | 16.7 to 16.8 | 16.8 | 0, 0 | 32 to 34 | n/a | n/a |
| taylor-drag | 1x | 10 | 16.7 | 16.7 to 16.8 | 16.8 | 0, 0 | 80 | 4.5 to 5.2 | 6.4 to 9.0 |
| decasteljau-play | 4x | 3 | 16.7 | 16.7 to 16.8 | 33.4 to 49.9 | 0, 0 | 32 to 34 | n/a | n/a |
| taylor-drag | 4x | 3 | 16.7 | 33.3 to 33.4 | 50.1 to 66.6 | 1 each, 57 to 69 | 80 | 24.7 to 27.1 | 35.1 to 37.2 |

Stability: the two 5-run unthrottled batches agree. Frame median is identical, the commits proxy is 34 (one run 32) for De Casteljau and 80 for Taylor in every run, and the Taylor input delay median spread is 4.5 to 5.2 ms across all 10 runs (batch A 4.6 to 5.0, batch B 4.5 to 5.2), about 0.7 ms, within 15%.

## What this baseline can and cannot show

- At 1x the app holds the display rate in both scenarios, so the unthrottled frame intervals cannot reveal a regression smaller than a dropped frame. The sensitive numbers are the 4x rows (Taylor p95, max, long tasks) and the Taylor input delay.
- Headless Chromium paces rAF to 60 Hz regardless of load, so intervals are quantised to multiples of 16.7 ms.
- The De Casteljau window includes about 3.3 s of idle after playback ends; its frame statistics are therefore dominated by idle frames. Compare the max and the commits proxy there.
- Node-side 100 ms polling of the slider value during De Casteljau adds a small evaluate load.
- Background processes of other checkouts on the machine can perturb the 4x rows.

## Rerun on another commit

Build that commit (`just build`), serve it with `vite preview --host 127.0.0.1 --port 4477 --strictPort` (from its checkout or with its root as argument), then:

```
node docs/reviews/ux-picks-app-wide/measure/measure-01.cjs --url http://127.0.0.1:4477 --label after --runs 5 --throttle 1 --out after-t1.json
node docs/reviews/ux-picks-app-wide/measure/measure-01.cjs --url http://127.0.0.1:4477 --label after --runs 3 --throttle 4 --out after-t4.json
```
