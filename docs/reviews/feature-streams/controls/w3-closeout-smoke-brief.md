# Task 4 closeout smoke brief: full browser checklist in both languages

Role: `bezeg-smoke`, read-only on source; writes only `w3-closeout-smoke.md` (this folder) and files under `.command-logs/w3-closeout/`. Do not commit, push or delegate.

Read `docs/smoke-tests.md` lines 23–54 (setup, baseline, evidence) and `.agents/skills/smoke-tester/SKILL.md`. Preview: production build of `72d7d578` (task 4 complete: Wave 3 P1, D1, P2a, P2b, V1, O1, R1f, R1b, repairs, C29, C30), served by the handler at `http://localhost:4327/bezeg-2.0/`. Do not start or stop it. The automated route suite runs in hosted CI; do not run it.

Run every **Baseline** row twice: once with the app in Slovenian, once in English (switch with the app's language selector, not a URL). Per row record passed/failed/blocked/skipped with observed evidence. Use a uniquely named preset `smoke-w3-<timestamp>` and delete it afterwards. Narrow row at 390×844 with touch emulation; keyboard row at 1280×800.

Add these change-specific rows (both languages): (a) a shared playback group (`/analysis/bisection`): Play, Pause, Next step, Reset by keyboard, the unavailable reason when pressing Next at the end; (b) a curve operation (`/bezier/subdivision`): Apply until unavailable, the reason shows; (c) a readout (`/compgeo/delaunay`): step counter "Korak 1 od n"/"Step 1 of n" and one `[data-readout-live]`.

Write `w3-closeout-smoke.md` before returning: table check × language, failures first with repro, preview revision, elapsed time, viewports, tool limits, cleanup done. Return ≤250 words. On BUDGET HANDOFF, write done/remaining into that file and return.
