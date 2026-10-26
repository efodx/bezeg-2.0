# Final smoke assertion repair

The final production smoke run had five stale assertions after consolidation: the short parameter card ID in two standalone cases, the Foundations long lesson under `why-weights`, the control-point completion card ID, and the unified Learn selector for an activity card. The tests now address retained homes `bezier-curves.parameter.decasteljau-parameter`, `foundations.reading-bernstein.bernstein`, and `bezier-curves.control-points.bezier`. Focus restoration selects links with `[id="..."]`, so retained IDs containing dots are handled as literal IDs.

The short parameter activity still asserts its two frames, section position, Back/Forward focus restoration, and narrow-screen keyboard flow. Foundations now checks the owning `reading-bernstein` section and its five-step lesson in authored order, including its five first-step frames after retained prompts are merged. The Bézier completion case follows all six authored steps in order, including the retained prompt frame, then verifies the final exploration scene's control points `(-4,-3)`, `(-3,2)`, `(2,2)`, `(3,-2)`. Editing the first point to `(-5,-3)` preserves the other three points before Continue returns to the chapter.

Verification at build revision `93066f43c9edf0cd145473fd62317f7397934b09`:

- Final focused browser run on port 4399: 5 passed. Log: `.command-logs/2026-10-26T15-59-22-560Z-109672-e8767c6a.log`.
- `just lint tests/standalone-learning.smoke.spec.cjs tests/unified-learning.smoke.spec.cjs` passed after the final edits. Log: `.command-logs/2026-10-26T16-00-10-147Z-42328-cf9f0957.log`.
- `node --check` passed for both smoke specs after the final edits.
- The supplied earlier 25-test run remains evidence that the other 20 cases passed; no full-suite rerun was performed.
