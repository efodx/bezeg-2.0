# 08 F6 smoke brief (triangle geometry, inversion route and lesson T5)

handoff-v12 · worker `bezeg-smoke` (Sonnet 5.5 `medium`) · budget 20 minutes including setup · report ≤ 60 lines to the handler; screenshots and scripts under the directory the handler names.

## Target

- Checkout `.claude/worktrees/stream-maps` at `f162e62a` (08 F3+F4 and F5 committed on top of `origin/master`), production build made by the handler from this tree.
- Production preview already running at `http://127.0.0.1:4316/bezeg-2.0`, owned by the handler. Do not stop or restart it, do not run `just build` or `just smoke`, and start no other server.
- Skill: `.agents/skills/smoke-tester/SKILL.md` (section "Worker execution"); checklist: `docs/smoke-tests.md`.
- Change scope: lesson T5 "Potenca točke in inverzija" / "Power of a point and inversion" (7 steps) on `/inversion`, the `inversion` section of the Learn chapter `triangle-geometry`, and `aria-label`s on the example and focus selects. Spec `docs/specs/triangle-geometry-lessons.md` §T5. Already passed: `just smoke-lesson inversion` (frame walk SL, EN at 390×844) and the X = C extra.

## Checks

1. **Route.** Open `/bezeg-2.0/inversion` directly, then refresh: board and panel, no console errors. The example and focus selects are named "Primer" and "Prikaz" for assistive technology (accessible name without the option text).
2. **Lesson SL.** Start the lesson (Learn button). Walk all 7 steps with Next, checking per step that the board matches the text: 1 secant through P = (0,0), circle about (5,0), r = 3; 2 the secant turned to θ = 20° with tangents, PA·PB = 16, tangent length 4; 3 X = (3,1), X′ = (6/5, 2/5); 4 circle about (1,0) maps to the line x = 2; 5 circle about (3,0), r = 1 maps to the circle about (3/2,0), r = 1/2; 6 angle 60° before and −60° after; 7 last step. Then Back through every step to step 1: each scene returns as before. Exit restores the entry scene.
3. **Lesson EN with live switch.** At step 3 switch SL→EN in the header: same step and frame, English title and text, scene unchanged. Finish the lesson in English.
4. **Hands-on.** At step 3 use "Hide example instructions" (Skrij): the tools panel becomes editable; set X = (0,0) and see the centre message; reopen the lesson and continue.
5. **Chapter.** `/bezeg-2.0/learn/triangle-geometry`: five sections in order, the last on power of a point and inversion, with a working link to the lesson/route. Slovenian purpose reads "... krožnico devetih točk, Simsonovo premico ...".
6. **Keyboard.** Complete two lesson steps with keyboard only (Tab to Next, Enter), focus visible.
7. **Narrow width.** At 390×844 the lesson opens, no horizontal page scroll.
8. **Siblings.** Lessons T3 (`/euler-line`) and T4 (`/simson-line`) still open their first step with no console errors.

## Report

Pass/fail per check with the observed values, console errors, and anything not covered. No fixes.
