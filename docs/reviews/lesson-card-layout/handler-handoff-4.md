# Lesson card layout — handler handoff 4 (2026-11-20)

Read [handoff 1](handler-handoff-1.md) for the owner's objective and scope. This note is the state after handler 4: triage sections 3 and 6 are done and published. What is left is one slice (label collisions of section 7) and the items under "Open".

Branch `worktree-lesson-card-layout` in `.claude/worktrees/lesson-card-layout`. Handler: Fable 5.2, effort high, agent `bezeg-handler`. Workers: `bezeg-worker` Sonnet `medium`, each in its own worktree (`isolation: worktree`); the brief's first steps are `git reset --hard <integration head>` and the `node_modules` junction (`cmd //c "mklink /J node_modules C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\node_modules"`). Before removing a worker worktree, unlink its junction with PowerShell (`(Get-Item node_modules).Delete()`).

## Done in this session: triage sections 3 and 6

Spec, with the blocker triage table and the decisions: [inspector: dependent controls and layout at 310 px](../../specs/inspector-dependent-controls-and-layout.md).

- Triage on master at ae52664f: of the seven items of section 3, five were already repaired or not reproducible (three-views, the Farin lesson, Voronoi and its Save tab, the PH offsets section, orientation's add mode). Two remained: complex roots (test point z) and complex reciprocal (inversion centre and radius). Of section 6, "clipped at the panel bottom" is the panel scrolling and "Krivulja10 looks selected" was the pointer's hover; the rest was present.
- Routes (worker B, 4 commits, plus one handler wording commit): a line under the z row of complex roots and under c and r of complex reciprocal while the object is hidden, linked with `describedBy`; the complex-roots reveal button reads "Pokaži točko z" / "Skrij točko z" (it broke inside "preizkusno"); the linear function shows the vertical-line reason once under k and n; Simson's two sliders are direct children of their group, so they keep the 12 px gap.
- Shared controls (worker A, 9 commits, plus one handler commit): `ChoiceSelect` no longer repeats a selected text that fits; point list names have a minimum width, so lists start their fields at one x; the buttons of one grid row share a height; the value list has one shared name column; the point collection's add-mode row stacks; the curve picker is three equal columns with the clear button beside a single curve; the step-only count readout has the typeable field's width; the image export buttons share the export/import columns.
- Kept by decision: the native select still cuts a text longer than its box (radical axis) and shows it in full underneath; a step-only count keeps its shaded readout.

## Evidence

- Before and after at 310 px: `.shots/insp/before/`, `.shots/insp/after/`, pairs and a page in `.shots/insp/report/` (untracked). Capture scripts: `.shots/insp/tabs.cjs` (every tab of a route list), `scenes.cjs` (named states), `measure.cjs`. Phone captures at 390×844: `.shots/insp/phone/`.
- Checks at caf79bfc: `just check-changed origin/master` passed, build included. `just controls-fixture` passed at 2b960c6b. Lesson smoke for complex-roots, complex-reciprocal, simson-line and linear-function passed in the worker. The full `just smoke-built` run on the integrated build (caf79bfc): 588 passed, 0 failed.
- Each new assertion was seen failing on the old source (worker reports; the select test with the old formula restored).

## Other sessions

Handler 3 is still running in `.claude/worktrees/lesson-card-phone-nav` (preview on port 4441) on an owner request: on one-column screens nothing pins to the top, and only the Back/Next row sits at the bottom. It owns `src/learning/runtime/GuidedLesson.tsx`, `GuidedLesson.css`, `GuidedLessonLayout.css`, the phone and pinned-controls assertions of `tests/guided-lessons.smoke.spec.cjs`, `tests/lesson-graph-access.smoke.spec.cjs` and `tests/lesson-experience-checks.cjs`, and the card paragraphs of `DESIGN.md`, `docs/specs/lesson-panel-visual-refinement.md` and ADR 0061. Stay off these until it has published; expect `origin/master` to move.

## Next slice: label collisions (triage section 7)

In the owner's scope (handoff 1 names section 7). Not started.

- Start with a blocker triage on current master: the docked card changed the board size of every lesson frame, so each collision in `.shots/visual-graph.md` (rows 351, 354, 359, 522, 531, 577, 580, 597, 657, 658, 696 and the triage's "PH quintic p₂ on a tick") has to be opened again and marked present, repaired or changed. The crawler (`scripts/lesson-crawl/crawl.cjs`) and `replay.cjs` open a lesson frame; `.crawl-pub/` holds the crawl of the published first slice.
- The items by graph: De Casteljau and subdivision superscript labels stacking at the end points (Bézier, rational); cross-ratio A′, A, B, B′ at the origin; five-point F₁ on A and F₂, D, S; trace–determinant "(τ, δ)" and the triangle label on the parabola; drag-the-track "Cikloida", "Tir", P1, P2; monotone triangulation chain labels on their points; segment intersections s₁ on s₂; cosine rule's side label a on a tick.
- These are board drawings: preserve mathematical meaning, give labels explicit ownership and disposal, and check each changed graph outside its lesson too. Graph-character lives off master (`codex/graph-character-pilots`) and owned De Casteljau's board drawing there; check whether it has returned before touching that graph.
- Kept by design unless the owner decides otherwise: drag-the-track's fixed frame, the shared frames of rosettes and lattice paths.

## Open

1. The label-collision slice above.
2. Waiting for the owner, not to be started: the wording that tells the reader the tools are hidden while the docked card is read (handoff 3, "For the owner").
3. A full stop or comma after an inline formula can wrap alone onto the next line (handoff 3, item 3).
4. The crawler reads only 1440×900 and the first phone frame (handoff 3, item 4).
5. Seen in this slice, not changed: the first group of the Voronoi Edit tab (site buttons P1–P7) has no visible heading; the Farin chapter text still says "vključi stikalo" although the route now opens with the points shown.

## For the owner

- The scheduled run of 2026-11-20 11:41 UTC failed (run 44729645497). The graph-control-first-use note records the cause as the parameterization lessons and its repair as `53441b5f`; this stream did not re-check it, and it is outside this stream's area. The next scheduled run shows whether it holds.
- Decided without you, each small and reversible: the complex-roots button label ("Pokaži točko z" instead of "Pokaži preizkusno točko"); a hidden-state line instead of revealing the object on edit; the step-only count readout widened to the typeable field's width on every route.
- Handoff 3's items for you still stand (the hidden-tools wording, the frames kept by design, the possible follow-ups).

## Published

This note goes out with the slice: `just publish --background --recipe runtime` from base ae52664f (a plain `just publish` refuses this checkout because of its untracked scratch files). The result is recorded in the commit that follows this one; until then, check `just publish --status` and `just ci`.
