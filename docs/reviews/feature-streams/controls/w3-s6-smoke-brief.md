# Step 6 smoke brief: graph-adjacent playback (task item 4)

Role: `bezeg-smoke`, read-only on source; writes only its evidence file and `.command-logs/w3-s6-smoke-<group>/`. Read `docs/specs/mobile-graph-playback.md` (layout decision, acceptance 1–6), `docs/smoke-tests.md` lines 23–54, `w3-s6a.md`, `w3-s6b.md` (route list, inline exceptions), and the "before" data in `docs/tasks/mobile-graph-playback/graph-adjacent-controls.screenshots.md` (scripts in `.command-logs/w3-s6-shots/` show how to measure). Preview: production build of the commit the handler names, at `http://localhost:4327/bezeg-2.0/`; do not start or stop it. Chromium emulation only; say so.

The slot is `[data-playback-slot]` directly after `#jgbox` in `section.workspace-graph`; on phones the group `.inspector-playback` sits inside it; on desktop it is in the inspector.

## Group A: route matrix

Every route in `w3-s6b.md` "routes switched" plus fixed point and both De Casteljau routes, at 390×844 and 360×640 (touch, Slovenian): (1) the playback group is inside the slot and there is exactly one `.inspector-playback` with `[data-action]` buttons in the document; (2) at scroll 0, or after scrolling so the board top is at the viewport top, the board (visible height and % of viewport) and every playback button are in the viewport together; (3) press Play (or Next step), then Pause where present: the board changes, the page does not scroll (`scrollY` unchanged), the button states toggle; (4) buttons ≥44×44; (5) no horizontal overflow. Compare with the before table (visible together: before/after). Screenshot each route at 390×844 after Play. Evidence `w3-s6-smoke-a.md`: route × check table, before/after column.

## Group B: conditions and baseline

On fixed point, bisection, De Casteljau and Voronoi: 320×640, 844×390 landscape, 390×844 at 200 % root font size (actions reachable, no clipping, no horizontal overflow; landscape: one scroll to the board shows board and row); English (labels, same placement); keyboard at 390×844 (Tab reaches the slot buttons, Enter/Space operate, visible focus); rotation 390×844 ↔ 844×390 while playing (still playing, focused button keeps focus, scene unchanged); 1280×800 (group in the inspector, nothing in the slot, layout as before); Presentation mode at 390×844 (unchanged, slot empty); a Guided lesson on fixed point or bisection at 390×844 (enter, the slot is dimmed while the lesson locks the workspace, exit restores the scene); route exit while playing (navigate away and back: no duplicate group, playback stopped); nonanimated routes `/bezier/curve` and `/analysis/euler-method` at 390×844 (no empty row, layout as before). Then run the **Baseline** rows of `docs/smoke-tests.md` once in Slovenian (the shared workspace changed). Evidence `w3-s6-smoke-b.md`.

Return ≤250 words per group: failures first with repro, then the table summary and gaps. Write the evidence file before returning. On BUDGET HANDOFF, write done/remaining and return.
