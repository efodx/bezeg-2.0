# Brief handoff-v12: numerical methods 06 F6 (Batch B) browser smoke

- **Role:** browser smoke worker under `.agents/skills/smoke-tester/SKILL.md` (Worker execution and Report sections). Read-only for the repository: no edits outside the log folder, no commits, no installs, no delegation. Checklist: `docs/smoke-tests.md` (Setup, Baseline, Evidence and limits); run only the checks below. Downloads and any saved files go to the log folder, never the repository root.
- **Checkout:** `.claude/worktrees/stream-functions`, HEAD `ca25ddc6` (= `origin/master`), dirty only with untracked files. A fresh production build of this HEAD exists (`just check`). Start the preview yourself in the background: `just preview 4315` (base `http://127.0.0.1:4315/bezeg-2.0/`); stop it by PID before returning.
- **Change scope:** lesson N4 "Trapezoid and Simpson rules" on `/bezeg-2.0/analysis/quadrature` (seven steps), a new section `quadrature` with its card in `/bezeg-2.0/learn/numerical-methods`. Existing integral Demonstrations and Presets must behave as before.
- **Budget:** 15 minutes elapsed including setup. Every Playwright script gets `setTimeout(() => process.exit(2), 120000).unref()` and closes the browser in `finally`. Fresh browser context per check group.

## Checks

1. `/bezeg-2.0/analysis/quadrature` opens directly and after a reload; start the lesson; step through all seven steps and record per step the rule, n and the error/ratio readouts shown on the panel. Expected (sin on [0, π]): trapezoid n=2 error 0.4292, n=4 error 0.1039 with ratio about 4.13; Simpson n=4 error 0.00456 with ratio 20.7; Simpson n=8 error 0.0002692 with ratio 16.9; x² on [0, 3] under Simpson error 0 (or below 1e-12).
2. Under Simpson, type an odd n (e.g. 5) into the number field next to the n slider: a message explains n must be even; n is not rounded silently (record the value shown afterwards).
3. `/bezeg-2.0/learn/numerical-methods`: record sections and cards (expected two cards: root-finding, quadrature); both images load (natural width > 0, scroll into view first; they are lazy); the quadrature card opens its lesson route.
4. Language: on the quadrature route switch SL→EN live and back with the lesson open; panel text, readouts (decimal comma in SL, point in EN) and step text change without reload. Note untranslated keys.
5. Keyboard: step the n slider with arrow keys under trapezoid and under Simpson (Simpson moves by 2); readouts update.
6. Restore on lesson exit: change the scene during the lesson, exit, confirm the pre-lesson scene returns.
7. Presets and export on quadrature: save a uniquely named preset, reload, load it, delete it; trigger SVG figure export and confirm a download.
8. Unchanged: `/bezeg-2.0/analysis/definite-integral` (find the exact path in the app's Analysis catalog if this one 404s) opens, its lesson starts, and an existing integral preset from its preset list (or one saved there) loads; `/bezeg-2.0/analysis/root-finding` lesson still starts.
9. Throughout: console errors per route; at 390x844 `document.documentElement.scrollWidth <= 390` on quadrature and the chapter page.

## Return

≤ 300 words: URL, revision, elapsed time, browser and viewports, a table with each check's status (Passed/Failed/Blocked/Skipped) and concrete evidence, console errors, cleanup. Scripts, screenshots and logs go to `C:/Users/1337Hacker/.claude/jobs/c1d17e88/tmp/num-f6/`, never `docs/` or the repository root. On a `HANDOFF` message, stop, write state to `C:/Users/1337Hacker/.claude/jobs/c1d17e88/tmp/num-f6/handoff.md` and return partial.
