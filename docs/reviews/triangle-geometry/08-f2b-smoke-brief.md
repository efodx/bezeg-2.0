# 08 F2b smoke brief (triangle geometry, inversion route)

handoff-v12 · worker `bezeg-smoke` (Sonnet 5.5 `medium`) · budget 15 minutes including setup · report ≤ 50 lines to the handler; screenshots and scripts under the directory the handler names.

## Target

- Checkout `.claude/worktrees/stream-maps`, uncommitted 08 F2b registration on top of `origin/master`, production build made by the handler from this tree.
- Production preview already running at `http://127.0.0.1:4316/bezeg-2.0`, owned by the handler. Do not stop or restart it, and start no other server.
- Skill: `.agents/skills/smoke-tester/SKILL.md` (section "Worker execution"); checklist: `docs/smoke-tests.md`.
- Change scope: new lessonless Demonstration `inversion` (`InversionGraph`, focuses point / source / power / angle, family `plane-geometry`). Spec `docs/specs/triangle-geometry-lessons.md` §T5. Sibling routes `/simson-line` and `/euler-line` must still open.

## Checks

1. **Route.** Open `/bezeg-2.0/inversion` directly, then refresh. Title "Inverzija". The board shows the centre C, the inversion circle, X and X′. No console errors.
2. **Focuses and examples.** Choose each focus and each example in the examples select once. Expected numbers from the panel: example `point` shows X′; `through-centre` gives the line x = 2; `not-through-centre` the circle with centre (3/2, 0) and r² = 1/4; `power` gives power 16, PA·PB ≈ 16 and tangent length 4; `angle` gives 60° before and −60° (unsigned 60°) after. No NaN or "undefined" anywhere in the panel.
3. **Centre point.** In the point focus, put X on C (with the X fields): the panel says the centre has no image, and no X′ is drawn.
4. **Far image.** Set r = 8 and X = (1, 0): X′ is off the view; an edge-marker arrow sits at the view boundary and the panel says "zunaj pogleda". Zoom out with the mouse wheel until X′ is inside: the marker disappears. Zoom back in with the wheel and wait half a second: the marker sits on the new boundary.
5. **Controls.** Radius field: arrows change r by 1, Shift+arrows by 10 (clamped to 1..8). Power focus: the θ slider moves the secant with the arrow keys. Drag C and X on the board once each.
6. **Language.** Switch SL→EN live: title "Inversion", panel and board labels in English. Back to SL.
7. **Presets.** Save a Preset after changing the focus and r, reload the page, restore it: focus and r come back.
8. **Narrow width.** At 390 px wide the page loads and the board is visible (the panel may cover it until hidden; record, not a defect).
9. **Siblings.** `/bezeg-2.0/simson-line` and `/bezeg-2.0/euler-line` open with no console errors.

## Report

Pass/fail per check with the observed values, console errors, and anything not covered. No fixes.
