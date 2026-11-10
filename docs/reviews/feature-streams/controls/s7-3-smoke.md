# S7-3 browser smoke: Preset load rebuilds from defaults plus saved parts

## Failures and incomplete coverage (read first)

- **FAIL (one check): NURBS, data-only Preset, `dataonly-select`.** Stored a Preset with only `data` (10 points, degree 1, weights 1, no `graphState`, no `boardState`), selected it on a fresh load. The scene rendered 11 point ellipses, not 10, and differed from the default scene. Not explained: the same route's full saved Preset restored exactly 10 ellipses. Possible causes are a test-data artifact (the `data` block was copied from the saved entry) or a real extra element on load. Not investigated further. Handler should check the stored data shape against the consumer.
- **Revision mismatch.** The brief names commit 89a7358e, which exists (same subject as ba6b57bb). The worktree HEAD is ba6b57bb with uncommitted edits to `src/graphs/base/BaseGraph.tsx` and `src/graphs/projective/FivePointGraph.tsx`, plus untracked `src/graphs/base/presets/ScenePersistence.ts`. I did not verify that the preview build matches 89a7358e or the working tree.
- **Pan gesture (resolved in test, not a product finding).** The first run failed the pan check on bezier, NURBS and function routes because a plain drag on the empty board did not move the view. A Shift-drag does move it on those routes. The helper now tries plain drag, then Shift-drag, and logs which one worked. Patch route pans with plain drag.
- **Not covered.** NURBS example control: none found (only unlabeled selects and the Preset select). Reset was only tested with the "Ponastavi" button. No screenshots taken. Other tabs and touch not tested.

## Environment

- Preview: http://localhost:4327/bezeg-2.0/ returned HTTP 200. Not started or stopped by me.
- Chromium (Playwright headless), viewport 1280x800, Slovenian UI, fresh context per route.
- Final run: `.command-logs/s7-3-smoke/run3.log` (32 checks, 1 failed). Elapsed about 80 s per run.
- Scripts: `.command-logs/s7-3-smoke/run.cjs`, `probe-pan.cjs` (pan gesture probe, log `probe-pan.log`).

## Route x check table (final run)

| Route | change1 | save | change2 | pan | select restores points | reset to Preset | console |
|---|---|---|---|---|---|---|---|
| /bezier/curve | PASS (drag, 4 pts) | PASS | PASS (drag) | PASS (Shift-drag) | PASS (shape and values match) | PASS | PASS (0 errors) |
| /bspline/nurbs | PASS (drag, 10 pts) | PASS | PASS | PASS (Shift-drag) | PASS (10/10 pts, slider 0.063) | PASS | PASS |
| /functions/linear | PASS (drag, 3 pts) | PASS | PASS | PASS (Shift-drag) | PASS (3/3 pts) | PASS | PASS |
| /patches/tensor | PASS (drag, 18 pts) | PASS | PASS (drag, 17 pts visible) | PASS (plain drag) | PASS (17/17, sliders and fields match) | PASS | PASS |

NURBS data-only Preset (data only, no `graphState`/`boardState`):

| Check | Result |
|---|---|
| Select on fresh load | **FAIL**: 11 ellipses, expected 10; differs from default scene |
| Pan after select | PASS (view moved) |
| Reselect after pan (default, then Preset) | PASS: curve same as first load and view same as starting view |
| Console | PASS (0 errors) |

## Notes

- Save-time view: after select, the raw ellipse positions equalled the save-time positions on all four routes, i.e. the view after a pan was returned as well. This is informational only; the spec does not state whether the view is part of a Preset.
- Reset: "Ponastavi" returned the points to the selected Preset on all four routes, and not to the changed state.
- Console: 0 console or page errors in any context.
- Point-limit note: a 17-point Preset on NURBS is refused by the point limit (per the earlier commit); my first data-only attempt used 17 points and was discarded for that reason, not counted as a result.

## Cleanup

- Playwright runs exited with code 0 and closed their browsers. The preview server was left running (not mine to stop). No stray chromium processes from these runs were observed.

## Handoff status: PARTIAL

Budget hook reached HANDOFF during cleanup. All four routes and the NURBS data-only checks had run (see table above). Not done: ownership check for five leftover `chrome-headless-shell.exe` processes (PIDs 25940, 17928, 26888, 29124, 5600) seen after the last run; the command to read their parent and profile directory had not returned. They may belong to this smoke run or to another session; not killed. The preview server on port 4327 was left running.
