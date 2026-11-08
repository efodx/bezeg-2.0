# Contracts 3a browser smoke (PARTIAL, budget handoff)

Checkout: agent-a18d8a9709fec93af, HEAD 2c41600c (dirty: untracked .build.out, .npmci.log). Preview: `just preview 4327` production build, revision matches checkout, served at http://127.0.0.1:4327/bezeg-2.0. Browser: Playwright chromium, 1440x900, Slovenian default, fresh context per check.

## convex-hull (/bezeg-2.0/compgeo/convex-hull, 56 steps)
- 1 Next to end: PASS. Steps 1..56 advance +1 per click (55 clicks); end "Korak 56 od 56", Next aria-disabled; Next at end leaves step unchanged.
- 2 Reset then Play to end: FAIL on board comparison only. Reset to "Korak 1 od 56" (reset disabled). Play stopped itself after 22.3 s at "Korak 56 od 56", label "Predvajaj", stable for 3 s. But the SVG hash differs from the Next run (sha1 070900cc0427 vs 8dd78dde5f76). Diff of captured SVG outerHTML (next-end.html vs play-end.html, in the temp dir) shows 1 differing line out of 3 (the whole svg line); not yet localized. Not established whether it is a real drawing difference or a non-geometric attribute (e.g. filter/defs ids, transient state). Unresolved.
- 3 Edit input mid-play: PASS. Edited P1 x (2 -> 3) at step 3; step reset to "Korak 1 od 56", label "Predvajaj", still at step 1 after 2.5 s; board hash changed.
- 4 Play after end no-op: PASS. Play aria-disabled at end; after press and 2.5 s still "Korak 56 od 56", "Predvajaj".
- 5 Navigate away and back while playing: PASS. In-app pushState+popstate to interval-sweep; hull svg/controls unmounted; sweep Play advanced to "Korak 4 od 26"; back on hull at "Korak 1 od 56"; Next to "Korak 2 od 56"; Play/Pause label cycle OK. (Route change is in-app, not a full reload.)
- 6 Switch algorithm while playing: PASS. At "Korak 2 od 56" switched to gift-wrapping; "Korak 1 od 42", label "Predvajaj" 1.5 s later; Next to "Korak 2 od 42".

## interval-sweep (/bezeg-2.0/compgeo/interval-sweep, 26 steps)
- NOT RUN. The results of checks 1-5 for this route were not collected. Budget handoff.

## Lessons (`just smoke-lesson convex-hull interval-sweep`)
- NOT RUN.

## Console errors
- 0 console errors or page errors across the convex-hull run (all 6 checks).

## Cleanup
- Preview server on 4327 (PID 47312, child of just PID 44988) terminated; port 4327 released. Other chrome/node processes on the machine (about 21 names matched) were NOT killed; they may belong to other sessions. Playwright browsers were closed by each script.

## Scripts (outside the worktree)
- C:\Users\1337Hacker\AppData\Local\Temp\agent-a18d-smoke\run.cjs (`node run.cjs hull|sweep`), results-hull.json, debug.cjs, next-end.html, play-end.html.

## Not covered / next steps
- Run `node run.cjs sweep` (checks 1-5 on interval-sweep), `node run.cjs hull` is done.
- Localize check 2 diff: compare the SVG elements under `[data-hull-trace]`'s board, excluding defs/filter ids; decide whether the drawing differs after Play (possible real bug in the final-step drawing) or only non-visual markup.
- Lessons: `just smoke-lesson convex-hull interval-sweep --port 4391 --workers=1` (not yet run).
- Pointer drag on the board was not tested; the mid-play edit used the P1 x input (keyboard/typed edit path).
- Interval-sweep edit uses "Interval a: desno krajišče" input (not run).

## Continuation (2026-11-08, same preview 4327)

### Convex-hull check 2 localized
- Raw diff of the two captured SVG snapshots (split per tag): exactly one differing line, a `<polygon>` (fill `#a8b39c`, fill-opacity 0.35, the hull interior). Attribute values are identical; only attribute ORDER differs (`style` first after Next-to-end, last after Reset+Play).
- Classification: non-visual markup (attribute order). No stroke, points, segments, or fill change.
- Re-run with the mouse moved to (5,5) before every capture, ids stripped, `url(#...)` normalized, and attributes sorted per element (`capture2.cjs`, 124 elements each): canonical forms identical.
- Verdict: YES, the final drawing is the same after Next-to-end and after Reset+Play-to-end. The earlier FAIL was a false positive of the raw-HTML hash.

### Interval-sweep (`node run.cjs sweep`, 26 steps), all PASS, 0 console or page errors
- 1 Next to end: 25 clicks, +1 each, end "Korak 26 od 26", Next aria-disabled, Next at end is a no-op. Board sig 2bef8d43536e.
- 2 Reset then Play to end: reset to "Korak 1 od 26" (reset disabled); Play stopped itself after 10.2 s at "Korak 26 od 26", label "Predvajaj"; still the same 3 s later. Board sig 2bef8d43536e, identical to check 1.
- 3 Edit input mid-play ("Interval a: desno krajišče" = 6, from step 3): right after edit "Korak 1 od 27", label "Predvajaj", still at step 1 after 2.5 s. Board sig changed.
- 4 Play after end: Play aria-disabled at end; after press and 2.5 s still "Korak 26 od 26".
- 5 Navigate away and back while playing (in-app pushState + popstate): old route unmounted; the hull route advanced to "Korak 4 od 56" during play; back on sweep at "Korak 1 od 26"; Next to "Korak 2 od 26"; Play/Pause label cycle OK.

### Lessons
- Smoke rows (spec ids of the two demonstrations): `convex-hull` (tests/guided-lessons.smoke.spec.cjs, path compgeo/convex-hull) and `interval-sweep` (path compgeo/interval-sweep).
- `just smoke-lesson convex-hull interval-sweep`: PASS, 4 tests passed in 19.9 s (log in the checkout's `.command-logs/`, latest run 2026-11-08T15-49-55). It reused the build for revision 9fd0790b (dirty), with its own build, not the 4327 preview.

### Gaps and caveats
- Revision mismatch: the checkout HEAD is now 9fd0790b, one commit after 2c41600c (the revision recorded above for the 4327 preview). The sweep and hull checks ran against the 4327 preview, not a freshly built 9fd0790b. The lesson smoke used 9fd0790b. Re-run against a 9fd0790b preview if the handler needs the lesson and route results on the same build.
- Check 3 uses one typed input edit, not a pointer drag on the board. Check 2 and the canonical comparison use the default 1440x900 desktop viewport only.
- Scripts: `C:\Users\1337Hacker\AppData\Local\Temp\agent-a18d-smoke\` (run.cjs, capture2.cjs, next-canon.txt, play-canon.txt, results-sweep.json).
