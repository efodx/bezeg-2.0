# Brief: frame measurement for task 01 slice 6 (baseline now, rerun later)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Edit only the owned paths.

## Goal

A repeatable measurement of two interactions on a production build, run now on the base commit as the "before" numbers. The same script reruns later on the work branch for "after" (`docs/tasks/ux-picks-app-wide/01-scene-store-and-fuzzer.md` slice 6; protocol in `docs/performance-plan.md`, "Measurement protocol"). This measurement gates task 05, so the numbers must be stable enough to compare: report median and p95, and the spread across runs.

1. **De Casteljau playing**: the De Casteljau demonstration (find its route under `src/` and in the catalog; route of `src/graphs/curves/bezier/DecasteljauGraph.tsx`), default example, playback started with its play control, 5 s sampled. Record per-frame intervals (rAF timestamps), long tasks (> 50 ms, `PerformanceObserver` `longtask`), and the number of React commits during playback if you can count them without changing app code (for example count `MutationObserver` batches on the inspector panel as a proxy, and say it is a proxy).
2. **Taylor slider drag**: the Taylor demonstration (`src/graphs/functions/TaylorGraph.tsx`), default example, drag the center slider thumb with the Playwright mouse across its track and back in about 60 steps over 2 s. Record frame intervals, long tasks, and input-to-visible-update delay per step if measurable (time from `mouse.move` to the next rAF after the slider's `aria-valuenow` changes; say how you measured it).

Each scenario: 5 runs at 1440×900, Chromium, no CPU throttle; and 3 runs with a 4× CPU throttle (CDP `Emulation.setCPUThrottlingRate`).

## Where

- Build and serve the base commit in a detached worktree, so the work branch's later changes do not leak in: `git worktree add --detach .claude/worktrees/measure-base 057d8d22`, then make its `node_modules` a junction to `C:\Users\1337Hacker\Desktop\bezeg-2.0\node_modules` (PowerShell: delete any created `node_modules` folder first, then `New-Item -ItemType Junction`). Build with the repo's build recipe (`just --list`; `docs/commands.md`), and serve the built output with `npx vite preview` on a free port of your choice bound to 127.0.0.1. Stop the preview process when done.
- **Remove the worktree at the end safely**: first remove the junction with PowerShell `(Get-Item <wt>\node_modules).Delete()` (never `Remove-Item -Recurse` on the junction, it wipes the shared `node_modules`), then `git worktree remove --force <wt>`.

## Owned paths

- `docs/reviews/ux-picks-app-wide/measure/measure-01.cjs` (new; Playwright script using the repo's installed `playwright`, args `--url <base url> --label <name> --runs N --throttle K`, writes JSON)
- `docs/reviews/ux-picks-app-wide/measure/baseline-057d8d22.json` and `docs/reviews/ux-picks-app-wide/measure/RESULTS.md` (table: scenario, throttle, runs, frame interval median/p95/max, long tasks count and total ms, commits proxy, input delay median/p95)

Nothing under `src/` or `tests/`. Create files with Write. Send independent reads in one message.

## Checks

- The script runs twice in a row with similar medians (state the spread).
- RESULTS.md names commit, build, browser version, viewport, throttle and refresh rate.

## Return (at most 300 words)

The results table, the exact command to rerun "after" on another commit, and anything that made numbers unstable. Handoff note if stopped early: `docs/reviews/ux-picks-app-wide/notes/01-measure.md`.
