# 07 F6 smoke brief (triangle geometry Batch C)

handoff-v12 · worker `bezeg-smoke` (Sonnet 5.5 `medium`) · budget 15 minutes including setup · report ≤ 60 lines to the handler; screenshots and scripts under `$CLAUDE_JOB_DIR/tmp/smoke-07/` (the handler supplies the path).

## Target

- Checkout `.claude/worktrees/stream-maps`, HEAD `a142bf70` (clean apart from this brief), production build made by `just check` at that revision.
- Production preview already running at `http://127.0.0.1:4316/bezeg-2.0`, owned by the handler. Do not stop or restart it, and start no other server.
- Skill: `.agents/skills/smoke-tester/SKILL.md` (section "Worker execution"); checklist: `docs/smoke-tests.md`.
- Change scope: Batch C added Demonstration `simson-line` (`SimsonLineGraph`, glider and exact modes, a discrete offset slider), lesson T4 `simson-line` (7 steps), and section `simson-line` in the Learn chapter `triangle-geometry`. T1 `triangle-notable-points` (`/triangle-centres`), T2 `inscribed-angle-thales` (`/inscribed-angle`) and T3 `euler-line-nine-point` (`/euler-line`) must be unchanged.
- Owner decision (spec T4 acceptance 2): in glider mode at ε = 0 the status reads plain "kolinearna" / "collinear" and the area readout "= 0", with no hedge. At any other offset it reads "ni kolinearna" / "not collinear".

## Checks

1. **Route.** Open `/bezeg-2.0/simson-line` directly, then refresh. The board shows triangle (0,0), (7,0), (2,5), its circumcircle about O = (7/2, 3/2), P on the circle at t = 60°, the feet D, E, F, and the Simson line. The board chip reads `Nožišča D, E, F: kolinearna`, and the area readout reads `Ploščina nožiščnega trikotnika / S = 0`. Toggle each overlay switch (side lines, circumcircle, perpendiculars, Simson line, pedal triangle) off and on: the board changes each time, or, for the pedal triangle at ε = 0, explain why not.
2. **Offset slider, every stop.** The slider "Odmik ε točke P od krožnice …" has nine stops: −0,2, −0,05, −0,01, −0,001, 0, 0,001, 0,01, 0,05, 0,2. Step through all of them with the keyboard (arrow keys) and record the status and area readout at each. Expected: plain `kolinearna` and `S = 0` only at 0; `ni kolinearna` with a nonzero `S ≈ …` at every other stop, including ±0,001, where the board still looks collinear.
3. **Glider t.** Move P with the t slider (arrows 1°, PageUp/PageDown 10°) and drag P on the board once. At ε = 0 the status stays `kolinearna`.
4. **Exact mode and examples.** Select mode "Mrežna točka P′ (natančno)" and each example in turn:
   - `P′ = (2, −2)` on the circle: status `kolinearna (natančno)`, power 0, `P′ je natančno na očrtani krožnici`;
   - `P′ = (6, 4)` off the circle: `ni kolinearna`, nonzero power and exact area;
   - vertex `P′ = B = (7, 0)`: two feet coincide; the status names the coincident-feet case and the line passes through the distinct feet. No error, no missing board.
   Edit P′ with its x/y fields once.
5. **Lesson T4, SL.** Enter the guided lesson from the route (or from the Learn chapter). Step through all 7 steps with Next, go Back once, and use every Show/reveal control met on the way. The board changes where the step says so (offset and example steps). Exit: the entry scene, including an edit made before entry, is restored.
6. **Lesson T4, live language switch.** Inside the lesson, switch SL→EN and back. The lesson text, panel, status (`collinear` / `not collinear`) and board labels translate, and the step and scene persist. Leave the app in SL.
7. **Keyboard.** On `/simson-line`, use Tab and Space/Enter or arrows to operate an overlay switch, the offset slider, the mode control and the language selector, with visible focus.
8. **390×844.** On `/simson-line` and inside lesson T4: no horizontal page overflow, and the board and essential controls (offset slider, mode) are reachable.
9. **Learn chapter.** Open the Learn chapter `triangle-geometry`. It shows four sections (T1, T2, T3, T4 in that order), and the T4 link opens the lesson or route.
10. **T1–T3 unchanged.** Open `/triangle-centres`, `/inscribed-angle` and `/euler-line`. Each shows its default triangle and readouts (G = (3, 5/3); the inscribed angles equal and half the central angle; H = (2, 2) with the chip `Eulerjeva premica: O, G in H so kolinearne`). Enter and exit each lesson once.
11. **Console.** Record console errors and page errors for every page above.

Set no Presets except a uniquely named `smoke-07-<time>` one if you need it, and delete it afterwards. Give every Playwright script `setTimeout(() => process.exit(2), 120000).unref()` and close the browser in `finally`. Before returning, confirm by PID that every browser and script you started has exited. Do not edit repository files, commit or push.

## Report

Tested URL, preview type, revision, elapsed time, viewport and browser; one table row per check (passed / failed / blocked / skipped) with concrete evidence (the nine slider stops as a small table); failures with steps, expected vs actual and a screenshot path; cleanup; coverage limits.
