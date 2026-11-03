# Brief handoff-v12: projective conics 07i (Batch B F6) browser smoke

- **Role:** browser smoke worker under `.agents/skills/smoke-tester/SKILL.md` (Worker execution and Report sections). Read-only for the repository: no edits outside the log folder, no commits, no installs, no delegation. Checklist: `docs/smoke-tests.md` (Setup, Baseline, Evidence and limits); run only the checks below, not the full baseline.
- **Checkout:** `.claude/worktrees/stream-functions`, HEAD `9e3d354f` (= `origin/master`), dirty only with untracked docs. A fresh production build of this HEAD exists (`just check` ran the build). Start the preview yourself in the background: `just preview 4315` (base `http://127.0.0.1:4315/bezeg-2.0/`); stop it by PID before returning.
- **Change scope:** Batch B of projective conics: two Demonstrations with chapter-owned guided lessons, `/bezeg-2.0/projective/five-point` (K4, conic through five points as a rational quadratic Bézier) and `/bezeg-2.0/projective/three-views` (K5, one conic in three views); the Learn chapter `/bezeg-2.0/learn/projective-conics` now has seven sections (an opening plus K1–K5 and related) and five lesson cards. The lessons moved out of the interim `rational-curves#worked-conic`. Existing routes, Presets and the rational Demonstrations must behave as before.
- **Budget:** 15 minutes elapsed including setup. Every Playwright script gets `setTimeout(() => process.exit(2), 120000).unref()` and closes the browser in `finally`. Fresh browser context per check group.

## Checks

1. Each of the two new routes opens directly and after a reload: the board renders, its guided lesson is reachable (start it), the first step shows, and stepping forward changes the board or panel (record what changed). On five-point, step to the hyperbola and the line-pair/pencil steps and record the status text.
2. `/bezeg-2.0/learn/projective-conics`: record the number of sections and cards (expected five cards: cross-ratio, Pascal, pole-polar, five-point, three-views); each card image loads (natural width > 0); the five-point and three-views cards open their lesson routes.
3. Language: on each new route switch SL→EN live (app language control) and back, once with a lesson open; panel text, status line and board labels change language without reload. Note any untranslated key or raw key name.
4. Keyboard: on five-point, select a point and step it with arrow keys (the conic and status update); on three-views, step its parameter input/slider; record value and board change.
5. Restore on lesson exit on both routes: change the scene during a lesson, exit, confirm the pre-lesson scene returns.
6. Presets and figure export on five-point: save a uniquely named preset, reload, load it, then delete it; trigger figure export and confirm a download (file name and size).
7. Unchanged: `/bezeg-2.0/learn/rational-curves#worked-conic` renders its section; the `circle` and `farin` rational Demonstrations open and their lessons start; one Batch A route (`/bezeg-2.0/projective/pole-polar`) still opens with its lesson.
8. Aspect: on three-views at 1280x800 and at 390x844, measure the rendered source circle (or the board's unit square: the pixel distance of one x unit vs one y unit from axis ticks or `board.unitX/unitY` if reachable) and report the x:y ratio; the chapter-card captures show a ~1.4x horizontal stretch and we need to know whether the app shows it too.
9. Throughout: record console errors per route; at 390x844 check `document.documentElement.scrollWidth <= 390` on the two new routes and the chapter page.

## Return

≤ 300 words: URL, revision, elapsed time, browser and viewports, a table with each check's status (Passed/Failed/Blocked/Skipped) and concrete evidence, console errors, cleanup (PIDs stopped). Scripts, screenshots and logs go to `C:/Users/1337Hacker/.claude/jobs/c1d17e88/tmp/f6/`, never `docs/`. On a `HANDOFF` message, stop, write state to `C:/Users/1337Hacker/.claude/jobs/c1d17e88/tmp/f6/handoff.md` and return partial.
