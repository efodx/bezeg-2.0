# Brief handoff-v12: school function graphs 06 F6 browser smoke (polynomial zeros, rational functions)

- **Role:** browser smoke, read-only on the repository (no edits outside the log folder, no commits). Follow `.agents/skills/smoke-tester/SKILL.md` (worker sections) and `docs/smoke-tests.md` (Evidence and limits).
- **Goal:** the F6 gate of `docs/tasks/school-function-graphs/06-batch-b.md`: both new Functions routes and their guided lessons work in Slovenian and English, including the browser frame cases F2b left open. Lane: delegated smoke (new routes, lessons, rendering across poles).
- **Target:** checkout `.claude/worktrees/stream-functions`, HEAD `82a35eec` (clean, equal to `origin/master`), production build produced by `just check` in this checkout. Start the preview yourself: `just preview --port 4315 --strictPort` as a background process (if the recipe rejects the arguments, read `justfile` for the right form); base URL `http://localhost:4315/bezeg-2.0/`. You own that process; stop it by PID before returning. Use Playwright through Node scripts (`playwright` is installed; see `tests/lesson-smoke-helpers.cjs` for selectors and the existing `scripts/function-browser-perf.cjs` for how the routes are driven). Write scripts and screenshots to `C:/Users/1337Hacker/.claude/jobs/026cb3cf/tmp/f6/smoke/`.
- **Routes:** `/bezeg-2.0/functions/polynomial-zeros` (S3) and `/bezeg-2.0/functions/rational-functions` (S4). Presets: S3 `default`, `triple`, `degree-five`; S4 `oblique` (default), `hole`, `horizontal`, `double-pole`.

## Checks (one result row each)

1. **Load, SL and EN:** each route renders heading, graph and inspector with no console errors, in both languages.
2. **Live language switch:** on each route, edit the scene (move one zero; on S4 also a pole), switch SL→EN→SL. Labels change; the edited zeros/poles, the plotted curve and the selected example persist. Asymptote labels and readouts change language.
3. **S4 denominator drag over poles:** on `double-pole`, drag a denominator zero across the numerator zero and across another pole (pointer, several steps). The curve never draws a segment joining two sides of a pole (inspect screenshots at the crossing: no near-vertical line through a dashed asymptote); a hole shows as an open circle when a pole lands on a numerator zero; no console errors.
4. **Sliders:** S4 `k` slider and remainder-probe slider (pointer and keyboard arrows) update the curve/readout; S3 `k` (if present) likewise. Probe stays within its range.
5. **Keyboard and numeric zero editing:** on S3 change one zero with the numeric field and with keyboard; merge two zeros: a merge message appears in text; try exceeding the degree cap: the refusal reason is visible.
6. **Touch:** with `hasTouch` and a 390 px viewport, tap-drag one zero on each route (`page.touchscreen` or dispatched touch/pointer events of type touch); the graph responds; no horizontal page overflow.
7. **Lessons:** on each route enter the guided lesson, walk every step forward to completion in SL, go back one step, switch language mid-lesson once, then exit; exit restores the entry scene.
8. **S4 oblique-asymptote label:** on `oblique` at 1280×800 and 1920×1080, record whether the oblique asymptote's text label is fully inside the board or clipped at an edge (screenshot). Also look at the chapter card image for `rational-function` (find it with `git ls-files | grep -i rational-function | grep -i png`) and report whether the label is clipped there.

## Return

≤ 350 words: a table of the eight checks (passed/failed/blocked/skipped, concrete evidence, screenshot paths), reproduction steps for each failure, console errors observed, elapsed time, and confirmation that the preview and browsers you started have exited (PIDs). Bulky output to the log folder. Budget: about 30 turns; grep before reading, ≤ 150 lines per read. On `HANDOFF`, stop, write what you have to `docs/reviews/feature-streams/functions/worker-school-06-f6-smoke-handoff.md` and return partial.
