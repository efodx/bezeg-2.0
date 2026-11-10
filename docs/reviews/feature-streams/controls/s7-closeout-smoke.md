# Step 7 closeout smoke (PARTIAL, budget handoff)

Target: production preview http://localhost:4327/bezeg-2.0/ (commit 35888a85 per handler; revision not independently verified by the worker). Chromium (Playwright), 1280x800, fresh isolated context per scenario, SL and EN. No cleanup needed (contexts discarded). Machine and tool calls were very slow; the worker stopped on the context budget signal.

Evidence: `.command-logs/s7-closeout-smoke/` in the clean worktree `agent-a18d8a9709fec93af`: `run.cjs` (harness, run as `node run.cjs sl|en [scenarios]`), `sl/result.log`, `en/result.log` (appended; each run ends with DONE; the later blocks repeat the earlier PASS results because two runs overlapped), screenshots in `sl/` and `en/`, `run1/`, `run2/` (earlier runs with superseded harness bugs, ignore), `probe*.log`.

## Results (identical in SL and EN unless stated)

| # | Check | Result |
| --- | --- | --- |
| 1 | NURBS: drag, Reset, save Preset, change scene, reload, reopen: points restored; drag afterwards works; language persists across reload | PASS SL+EN |
| 2 | Export file (presets.txt), delete Preset (Da/Yes), import, Preset back and identical; import modal shows "File is valid" and the collection to be replaced; Cancel keeps storage unchanged; confirm keeps Preset loadable | PASS SL+EN |
| 3a | Malformed stored value `{"data":"not-an-array"}` on open: default scene, notice "Stored presets cannot be read ... unchanged", save/delete disabled, storage not overwritten, default scene draggable | PASS SL+EN |
| 3b | Selecting a collection-valid but consumer-refused Preset (17 points) on live scene: notice names collection, Preset, field and limit; selection and scene unchanged; dragging works | PASS SL+EN |
| 3c | Malformed file import (non-array `points`; blank name): modal shows "File not supported: collection bspline-curve, Preset badpoints, field graphState: ..." / "missing or duplicate Preset name", no confirm button for the replacement, storage unchanged | PASS SL (scenario 8); EN scenario 8 log lines are present but were not individually read |
| 3d | A 17-point B-spline file is collection-valid, so file import accepts it (spec: consumer limit applies only at graph entry). Earlier harness check 3.6b/3.7 FAIL was my test expecting a refusal; not a product failure | note |
| 4 | Figure batch (slike.zip downloaded), live scene and selection intact, drag works afterwards; batch containing a refused Preset is refused before starting, notice names it, no download, scene unchanged | PASS SL (EN: batch 4.x PASS; refused-batch 8.batch lines not individually read) |
| 5 | Blossom: drag, Preset save/reload/reopen, drag after. Blossom has no Reset example button (nothing to press). NURBS, Insertion, Extraction: choose non-first example, drag, Reset: chosen example returns, scene equals the chosen example scene | PASS SL+EN |
| 6 | FivePoint: drag, pan, save, reload, reopen (points and paths identical), drag after, export, delete, import, reopen identical | PASS SL+EN |
| 6 | ThreeViews: save/reload/reopen and file round trip preserve points, path hash and slider values | PASS SL+EN |
| 6 | ThreeViews "drag after reopen" | UNRESOLVED: harness FAIL SL+EN. ThreeViews has no draggable points, only sliders; my keyboard edit hit slider max (first range, -2.5..2.5 stuck at 2.5, ArrowLeft had no effect) so the check is inconclusive. A patched rewrite (`patch4.cjs`, uses `fill` on the second range) was written but NOT run |
| 7 | Guided lesson on /bezier/curve: start, 6x Next (frames alternate Explanation/Observation), Back, inspector Reset keeps lesson running, Exit shows confirm dialog ("Leave the example?"), exit restores entry scene, drag works, re-entry works | PASS SL+EN |

Page errors: none in any scenario that checked them.

## Coverage gaps

- ThreeViews continued-edit after reopen not confirmed (see above).
- EN logs for scenario 8 (malformed file, refused batch) not read individually; scenario 8 EN results are in `en/result.log` lines after the second DONE.
- Narrow viewport, keyboard-only and the other baseline rows (family routes, PH, rational weights, language-retains-scene on Bezier) were not run in this pass; the automated smoke suite is expected to cover route loading.
- Blossom degree-1 Preset refusal was covered by the earlier s7-2 run, not repeated here.
- Revision of the preview was taken from the brief, not verified.

## Follow-up run (PARTIAL, budget handoff)

Preview http://localhost:4327/bezeg-2.0/. Harness in `.command-logs/s7-closeout-smoke/` of worktree `agent-a18d8a9709fec93af`: `followup.cjs` (run 1, logs `followup-sl.log`, `followup-en.log`), `followup2.cjs` (run 2, launched in background, logs `followup2-sl.log`, `followup2-en.log`, NOT read before handoff). `patch4.cjs` NOT run: its ThreeViews edits hit the same Save-panel problem below.

1. EN malformed file and refused batch (`en/result.log`, scenario 8): PASS. Bad `points` file refused with "Unsupported file: collection bspline-curve, Preset badpoints, field graphState: invalid value points"; blank name refused ("missing or duplicate preset name"); storage unchanged in both. Refused batch names Preset b17 ("this view accepts a B-spline with at most 16 control points, the preset has 17"), no download, scene unchanged.

2. ThreeViews slider after reopen (SL, EN): run 1 PASS for the first edit (range 0 fill 2 -> -1.5, scene changed). Then FAIL (harness): opening the Save panel hides the inspector sliders, so the next `fill` timed out. Reopen-and-edit NOT verified. Run 2 closes the Save panel first; result not read. INCOMPLETE. The earlier 9.5 FAIL has the same cause.

3. Blossom, degree-1 Preset (SL): PASS. Seeded 4-point degree-1 entry `deg1` in `bezeg-2.0:preset-bspline-curve`; NURBS route selects it (sel=deg1). Blossom: selection and scene unchanged, notice "Prednastavitve ni mogoče naložiti ... zbirka bspline-curve, prednastavitev deg1 ... cvetenje je na voljo za stopnji 2 in 3"; drag works afterwards. De Boor route: loads (sel=deg1, scene changed), drag works. No page errors.

4. Baseline rows (SL):
- 360x640, /bezier/curve and /bspline/nurbs: no horizontal overflow (scrollWidth 360). NURBS: Tab reaches a range after 34 Tabs; ArrowRight changes it (0.063 -> 0.064), inside width. PASS. Bezier has no sliders; zoom-in keyboard check is in run 2, not read. INCOMPLETE.
- Rational (/rational/base): no range inputs (8 numeric text inputs). Run 1 only point-dragged (not a weight change, not counted). Weight change in run 2, not read. INCOMPLETE.
- PH (/ph/cubic): run 1 FAIL: drag of point 1 by (30,20) did not change geometry (3 svgs, 4 ellipses). Run 2 drags each point, not read. UNRESOLVED.
- SL to EN on Bezier: PASS. Dragged points identical before and after (213,422 306,188 530,158 582,370).

Coverage gaps: ThreeViews reopen-and-edit (SL, EN), rational weight, PH drag, Bezier keyboard zoom, run 2 results. Recheck the logs in `followup2-*.log`, then fix the PH drag question.
