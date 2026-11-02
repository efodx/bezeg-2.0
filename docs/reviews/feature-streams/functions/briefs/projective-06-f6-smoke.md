# Brief handoff-v13: projective conics 06 F6 browser smoke

- **Role:** browser smoke worker under `.agents/skills/smoke-tester/SKILL.md` (Worker execution and Report sections). Read-only for the repository: no edits outside the log folder, no commits, no installs, no delegation. Checklist: `docs/smoke-tests.md` (Setup, Baseline, Evidence and limits); run only the checks below, not the full baseline.
- **Checkout:** `.claude/worktrees/stream-functions`, HEAD `2bde04a6` (= `origin/master`), dirty only with untracked docs. A fresh `just build` of this HEAD exists. Start the preview yourself in the background: `just preview 4315` (base `http://127.0.0.1:4315/bezeg-2.0/`); stop it by PID before returning.
- **Change scope:** Batch A of projective conics: three Demonstrations with chapter-owned guided lessons (`/bezeg-2.0/projective/cross-ratio`, `/pascal`, `/pole-polar`), the new Learn chapter `/bezeg-2.0/learn/projective-conics` with three lesson cards; the lessons moved out of `rational-curves#worked-conic`.
- **Budget:** 15 minutes elapsed including setup. Every Playwright script gets `setTimeout(() => process.exit(2), 120000).unref()` and closes the browser in `finally`. Fresh browser context per check group.

## Checks

1. Each of the three projective routes opens directly and after a reload: the board renders, its guided lesson is reachable (start it), the lesson's first step shows, and stepping forward changes the board or panel (record what changed).
2. `/bezeg-2.0/learn/projective-conics`: the chapter renders with its sections and three cards, each card image loads (natural width > 0), and a card opens its lesson route.
3. Language: on one projective route switch SL→EN live (app language control) and back; panel text and board labels/text change language without reload. Note any untranslated key.
4. Keyboard: focus a parameter input/slider on each route and step it with arrow keys; the value and board change.
5. Restore on lesson exit: change the scene during a lesson, exit the lesson, confirm the pre-lesson scene returns.
6. Presets and figure export on one projective route: save a uniquely named preset, reload, load it, then delete it; trigger figure export and confirm a download (file name and size).
7. Unchanged: `/bezeg-2.0/learn/rational-curves#worked-conic` renders its section; the `circle` and `farin` Demonstrations open and their lessons start.
8. Throughout: record console errors per route; at 390x844 check `document.documentElement.scrollWidth <= 390` on the three projective routes and the chapter page.

## Return

≤ 300 words: URL, revision, elapsed time, browser and viewports, a table with each check's status (Passed/Failed/Blocked/Skipped) and concrete evidence, console errors, cleanup (PIDs stopped). Scripts, screenshots and logs go to `C:/Users/NonFriedMotherBoard/.claude/jobs/7077c050/tmp/f6/`, never `docs/`. On a `HANDOFF` message, stop, write state to `docs/reviews/feature-streams/functions/worker-f6-smoke-handoff.md` and return partial.
