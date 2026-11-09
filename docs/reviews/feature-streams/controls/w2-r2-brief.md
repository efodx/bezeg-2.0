# Wave 2 repair R2: Monotone lesson counters and ChoiceSelect option names

Read `w2-common-brief.md` (rules, checks, return), then the C3b section of `w2-c3.md`.

**Owned:** the Monotone partition and Monotone triangulation lesson content under `src/learning/content` (find by `grep -rl "korak 0\|Korak 0\|od 14"` and the graph ids) and their lesson tests, the two Monotone lesson-action tests C3b offset, `src/inputs/ChoiceSelect.tsx` and a test for it, `src/graphs/compgeo/BezierClippingControls.tsx` and its test. Other workers edit Voronoi and PolygonArea files and `PointListInput`.

**Handler decisions:**
1. Monotone panels now count steps from 1 ("Korak 1 od 15", spec decision 38). Lessons quoting the 0-based position ("korak 0 od 14") are reworded to the panel's numbering, in both languages if English lesson text exists. Keep the meaning of each lesson step; follow AGENTS.md lesson prose rules (`lessonMathNotation.test.ts` must pass). Remove the one-step offset and its comment from the two lesson-action tests so they compare with the panel text directly.
2. HullRobustness keeps its visible `role="status"` cell title (no hidden `LiveReadout`). Nothing to do; it is recorded.
3. `ChoiceSelect` gains an optional per-option accessible name (`ariaLabel` on an option), rendered as `aria-label` on the `<option>`; existing callers unchanged. BezierClipping's tolerance options use it to restore the spoken form ("10 na minus 6" and its English counterpart) from the pre-sweep code (`git show HEAD:src/graphs/compgeo/BezierClippingControls.tsx`). A `ChoiceSelect` test with an observed failure before the prop, and the BezierClipping test checks one option's name.

Run `just unit` on the touched lesson and graph tests, `src/inputs`, and `src/learning/content/lessonMathNotation.test.ts`; `just lint` on owned files; `just typecheck`. Append evidence to `w2-c3.md` (section R2); return ≤250 words.
