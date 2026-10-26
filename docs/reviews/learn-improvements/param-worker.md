# Parametrization content worker evidence

Scope: `src/learning/content/familyChapters.ts` and `src/learning/content/familyChapters.test.ts`. No geometry, scene, route, preset, lesson-runtime, or guided-lesson changes.

The `weighted-knot` and `worked-timing` links now target `spline-parameterization`. The prose defines positive `d_i` as endpoint chord distance (not arc length), records normalized shares for `d_1=1`, `d_2=4` at exponents 0, 1/2, and 1, and states these are allocation heuristics. Same-trace comparisons assume an increasing, endpoint-covering parameter map. The text distinguishes spline knot weighting, which can alter reconstructed geometry, from the single-curve rational warp, whose neutral parameter is 1/2.

Catalog captures inspected directly:

- `spline-parameterization.png`: spline, alpha 0.7, 12 samples; orange controls, olive samples, green curve.
- `weighted-parameterization.png`: single-curve warp, alpha 0.25, sample markers along the fixed curve.
- `uniform-parameterization.png`: 10-marker comparison poster captured in weighted mode; it displays numerical source-curve arc length. The caption says sparse samples/chords do not establish equal arc lengths.

New focused regression assertion initially failed on the old weighted-knot graph destination, then passed after correction. Final checks passed:

- `just unit src/learning/content/familyChapters.test.ts src/learning/content/lessonMathNotation.test.ts` — `.command-logs/2026-10-26T02-11-12-406Z-92596-4fe25ba4.log` (final rerun after repair also passed).
- `npx tsc --noEmit --pretty false` — exit 0.
- `just lint src/learning/content/familyChapters.ts src/learning/content/familyChapters.test.ts` — `.command-logs/2026-10-26T02-11-32-023Z-95020-09a09cd9.log`.
- `git diff --check` — passed.

Production build and browser interaction checks were outside this worker slice and remain for handler review.
