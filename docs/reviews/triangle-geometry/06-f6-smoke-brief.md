# 06 F6 smoke brief (triangle geometry Batch B)

handoff-v12 · worker `bezeg-smoke` (Sonnet 5.5 `medium`) · budget 15 minutes including setup · report ≤ 60 lines to the handler; screenshots and scripts under `$CLAUDE_JOB_DIR/tmp/smoke-06/` (the handler supplies the path).

## Target

- Checkout `.claude/worktrees/stream-maps`, HEAD `30ba2b2e` (clean apart from this brief), production build made by `just check` at that revision.
- Production preview already running at `http://127.0.0.1:4316/bezeg-2.0`, owned by the handler. Do not stop or restart it, and start no other server.
- Skill: `.agents/skills/smoke-tester/SKILL.md` (section "Worker execution"); checklist: `docs/smoke-tests.md`.
- Change scope: Batch B added Demonstration `euler-line` (`EulerLineGraph`), lesson T3 `euler-line-nine-point` (7 steps), and section `euler-line` in the Learn chapter `triangle-geometry`. T1 `triangle-notable-points` (`/triangle-centres`) and T2 `inscribed-angle-thales` (`/inscribed-angle`) must be unchanged.

## Checks

1. **Route.** Open `/bezeg-2.0/euler-line` directly, then refresh. The board shows triangle (0,0), (7,0), (2,5) with H, G, O, the Euler line and the nine-point circle. The panel reads `H = (2, 2)`, `G = (3, 5/3)`, `O = (7/2, 3/2)`, `N = (11/4, 7/4)`, `R²/4 = 29/8` and the chip `Eulerjeva premica: O, G in H so kolinearne`. Toggle "Devet točk …" and "Očrtana krožnica" on and off: the board changes each time.
2. **Drag.** Drag a vertex to another grid point. The readouts change, and the chip still says collinear. Record before and after.
3. **Lesson T3, SL.** Enter the guided lesson from the route (or from the Learn chapter). Step through all 7 steps with Next, go Back once, and use every Show/reveal control met on the way. The board changes where the step says so (special-triangle and near-equilateral steps). Exit: the entry scene, including an edit made before entry, is restored.
4. **Lesson T3, live language switch.** Inside the lesson, switch SL→EN and back. The lesson text, panel and board labels translate, and the step and scene persist. Leave the app in SL.
5. **Keyboard.** On `/euler-line`, use Tab and Space/Enter to operate an overlay switch and the language selector, with visible focus.
6. **390×844.** On `/euler-line` and inside lesson T3: no horizontal page overflow, and the board and essential controls are reachable.
7. **Learn chapter.** Open the Learn chapter `triangle-geometry`. It shows three sections (T1, T2, T3 in that order), and the T3 link opens the lesson or route.
8. **T1/T2 unchanged.** Open `/triangle-centres` and `/inscribed-angle`. Each shows its default triangle and readouts (G = (3, 5/3); the inscribed angles equal and half the central angle). Enter and exit each lesson once.
9. **Console.** Record console errors and page errors for every page above.

Set no Presets except a uniquely named `smoke-06-<time>` one if you need it, and delete it afterwards. Give every Playwright script `setTimeout(() => process.exit(2), 120000).unref()` and close the browser in `finally`. Before returning, confirm by PID that every browser and script you started has exited. Do not edit repository files, commit or push.

## Report

Tested URL, preview type, revision, elapsed time, viewport and browser; one table row per check (passed / failed / blocked / skipped) with concrete evidence; failures with steps, expected vs actual and a screenshot path; cleanup; coverage limits.
