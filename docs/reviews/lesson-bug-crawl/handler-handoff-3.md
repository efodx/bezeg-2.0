# Lesson bug crawl — handler handoff 3 (2026-11-20)

Setup and tooling: [handler-handoff-1.md](handler-handoff-1.md). The crawl and reviews are finished (37 chapters,
77 of 80 Haiku reviewers). The verified, grouped list is [triage.md](triage.md), and the owner has seen it.

## Owner decisions (this session)

- Owner go-ahead given. **Split:** a separate Fable 5.2 session at high effort, `lesson-card-layout handler 1`
  (`claude --bg`, own worktree `lesson-card-layout`, handoffs in `docs/reviews/lesson-card-layout/`), owns **all UX
  work**, using the impeccable skill: triage sections 1 (card covers graph), 3 (hidden control dependencies),
  5 (card text overflow), 6 (inspector layout at 310 px) and 7 (graph framing).
- **This stream fixes bugs only.** Do not touch the Fable session's files: GuidedLesson.tsx/.css,
  GuidedLessonLayout.css, DemonstrationWorkspace*.css lesson-open rules, BaseGraph.adjustGuidedLessonView,
  tests/guided-lessons smoke specs, scripts/lesson-crawl/crawl.cjs. Message it by name (ListAgents) when work overlaps.

## Done by handler 3 (commit after this note's predecessor; see git log)

- Bézier hull crash fixed: `AbstractJXGPointControlledCurve.removePoint` hides the hull and drops the point before
  `removeObject` (whose board update rebuilt the hull over the removed point). Test `hullRemove.test.ts` failed before
  the fix with the JSXGraph polygon error; it now also asserts the hull is rebuilt as a triangle. Replay of
  decrease ×1, ×2 and increase-then-decrease shows no page error.
- Probability simulation log axis: frequency/Markov ticks read 10, 100, 1000 (no exponents, nothing left of 1); the
  lower difference panel's shared y numbers are hidden (`SimulationGraph.tsx` ~353/~366, test in
  `SimulationGraph.test.tsx`). The origin "1" is unlabelled (JSXGraph skips the zero label).
- Content: the intersections `latex` row no longer ends with English "the same line" (meaning moved to bilingual notation);
  rational subdivision text says »Subdiviziraj« like the button; Farin text says the switch is in the Prikaz/Display
  tab; `farin_points` and `standard_form` are sentence case in sl.ts (and in tests/guided-lessons.smoke.spec.cjs).
- CI lint repaired in scripts/lesson-crawl (crawl.cjs unused helpers, probe2.cjs `window.JXG`). Master's `checks`
  job had been red since f4556204.

## Next (bugs only)

1. Confirm the push deployed: `gh run list --workflow browser-smoke.yml --limit 2`.
2. **Scheduled smoke failure, lessons-2:** weighted/uniform/spline-parameterization lessons fail "samples at Korak 1
   od 5 · Okvir 1 od 6: expected 10, received 0". Diagnose and fix if it is in the app (or the smoke spec if the spec
   is stale), as this stream's bug item.
3. Optional, ask the owner first: other Title Case Slovenian titles in sl.ts (`bezier_curves`, `bernstein_polynomials`,
   `affine_transformations`, `repeated_subdivision`, `degree_elevation`, `weighted_parametrization_234`, …) are
   demonstration titles quoted in lesson prose; changing them touches lesson text.
4. Smoke the fixed routes with a Haiku `bezeg-smoke` (docs/smoke-tests.md): /bezier/curve after the control-points
   lesson (decrease count), /probability/simulation law-of-large-numbers step 2, the rational subdivision and Farin
   lessons, the analytic-lines intersections step 2.
5. Stray file: `.crawl-out/stray-old.tsx` was found untracked as `src/graphs/complex/old.tsx` (a triangle solver copy,
   probably left by a stopped worker) and moved out because it broke tsc; delete it if nobody claims it.

Reviewer leads dismissed after live checks are listed in triage.md; also dismissed here: phase-portrait trajectories
(the learner enters them), g1-symmetric b 2/b 3 (present below the fold), Voronoi/Fortune unavailable buttons (they
state reasons), Hermite point fields (work).
