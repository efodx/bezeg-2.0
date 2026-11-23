# 04 final smoke fixes

- lesson-graph-access:52 stale test. Hide now folds the lesson card (stays mounted): `nextButton` hidden instead of panel count 0; readouts card opened and a visible row (`Function f(x)`) checked (degree is the puck, its readout row is not shown). Passes.
- standalone-learning:176 product bug. Completion content had no `data-card-row`, so measureCards cut the lesson card to a ~85 px sliver and "More content" covered Continue. `GuidedLesson.tsx` completion message `data-card-row`, actions row `data-card-row data-card-pinned`; unit assertion in GuidedLesson.test.tsx. Passes after rebuild.
- guided-lessons:2815 phase-portrait en 390x844: passes alone twice (`-g "Lesson phase-portrait"`); not reproduced, so not added to PHONE_WALK_BROKEN. Probably load flake or fixed by the completion rows fix. Not rerun in the full run.
- Logs: smoke/04-final-*.log. eslint exit 0; `just unit src/learning/runtime/GuidedLesson.test.tsx` passed (not seen failing before: assertion added after the fix).
