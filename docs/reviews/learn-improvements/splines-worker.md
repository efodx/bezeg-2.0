# Splines content worker note

Implemented the `docs/specs/learn-improvements.md` §6c content slice in `src/learning/content/familyChapters.ts` and added one focused regression test in `src/learning/content/familyChapters.test.ts`. Existing section IDs, five demo destinations, chapter route, presets, and scenes are unchanged. The pre-implementation regression failed at `piecewise/spline-cn` because its prompt was absent; after implementation, it checks all linked IDs/prompts, reused C1/G1 preview assets, bilingual figure descriptions, the worked definitions, common global parameter, equal unit scales, `a=1`, and `h_L`/`h_R` scaling.

The worked pair is explicit: on global \(u\in[0,2]\), use \(t=u\) on the left and \(s=u-1\) on the right. Both local-to-global scale factors are one, so first derivatives agree at \((1,2)\) and second derivatives match exactly when \(a=1\). For a local interval of positive length \(h\), first derivatives scale by \(1/h\) and second derivatives by \(1/h^2\); equal local derivatives across unequal spans do not imply parametric continuity. The G1 prose requires nonzero tangent vectors and a positive scale. Captions distinguish the captured multi-piece app graphs from the worked pair of parabolas and state that pictures illustrate but do not prove continuity equations. Prompts name supported movement, visibility, counters, and G1 parameter controls without promising a numerical demo setup.

Checks passed:

- `npx vitest run src/learning/content/familyChapters.test.ts src/learning/content/lessonMathNotation.test.ts` — 2 files, 7 tests.
- `npx vitest run src/learning/LearningPage.test.tsx` — 1 file, 19 tests.
- `npx tsc --noEmit --pretty false` — exit 0.
- `just lint src/learning/content/familyChapters.ts src/learning/content/familyChapters.test.ts` — passed.

Production build and browser/visual capture review remain with the handler, per assignment. The shared untracked `docs/tasks/learn-improvements/README.md` was preserved untouched.
