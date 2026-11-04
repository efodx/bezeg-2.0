# Smoke brief 20 (handoff-v12), geometry handler 49, 2026-11-03

- **Role:** browser smoke worker. Do not edit `src`, commit or delegate. You may write Playwright scripts and evidence under `docs/reviews/convexity-hulls/20-smoke/` (scripts in that folder too).
- **Goal:** smoke task [20](../../tasks/convexity-hulls/20-batch2-registration.md) (Checks paragraph) and measure the deferred task-19 timing.
- **Build/preview:** a production build of worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry` exists (revision 4bc016c7 + uncommitted task 20, dirty; `just build` passed 18:32Z). You own the preview: start `just preview 4391` in the background, confirm the URL answers before testing, stop it at the end. If unreachable after one retry, return blocked. Do not rebuild unless the provenance check refuses.
- **Follow:** `.agents/skills/smoke-tester/SKILL.md` and the relevant parts of `docs/smoke-tests.md` (route, catalog, language, keyboard rows only).
- **Coverage (SL and EN, with a live language switch on each route):**
  1. `/bezeg-2.0/compgeo/point-in-polygon` and `/bezeg-2.0/compgeo/hull-robustness`, direct load and after refresh; their catalog cards in the computational-geometry family (after `convex-hull`, this order; posters are pending, an empty frame is expected).
  2. Point-in-polygon: keyboard moves of the query point (select q, arrow keys; readout updates inside/outside/boundary); touch add of a vertex on the polygon (Playwright touch/tap, `hasTouch` context); the `ray` overlay toggle; readout text changes language on switch.
  3. Hull robustness: chain mode Next/Play/Reset, the pop-rule and duplicates choices; switch to Kettner mode and back; select a cell by click and by arrow keys; readout shows cell (41,48) by default with an "inexact"/"nenatančn…" label; no console errors.
  4. Timing on the production build: time a chain->Kettner mode switch and one cell selection (from the input event to the next settled frame, e.g. `performance.now()` around the click plus two `requestAnimationFrame`s), 5 runs each, report median and max. Task 19 asks to record it if a switch exceeds 100 ms.
  5. Preset save and restore on both routes (save tab), the restored state matches (query point; mode/rule/cell).
- **Return:** ≤250 words: per item pass/fail with evidence path (screenshots, script, log in `docs/reviews/convexity-hulls/20-smoke/`), timings, console errors, gaps and blocked items.
- **Budget:** about 30 turns; logs and screenshots to files; read ≤150 lines per call. On `HANDOFF`, write `docs/reviews/convexity-hulls/20-smoke/handoff.md` and return partial.
