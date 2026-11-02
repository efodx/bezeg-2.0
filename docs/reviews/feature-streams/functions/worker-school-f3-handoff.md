# Worker handoff: school function graphs 05 F3 (S1, S2), partial

State: implementation complete, final verification run not yet read.

Files touched (uncommitted): new `src/learning/content/schoolFunctionGraphsGuidedLessons.ts` (+ `.test.ts`); edited `src/demonstrations.ts` (lesson:false dropped for both), `guidedLessons.ts`, `chapter/guidedLessonOwnership.ts` (functions-and-calculus / function-rules), `guidedExamplePreviewCopy.ts` (+ test counts 70 / 77), `lessonMathNotation.test.ts`, `runtime/lessonCatalog.test.ts`, `tests/guided-lessons.smoke.spec.cjs` (two hookless rows, 7 steps, minFrames 14). No model.ts or graph change was needed. `src/analysis/transformation.ts` was mutated temporarily and restored from backup (git shows it unmodified).

Checks: `just typecheck` passed before the last preview-copy fix. First unit run: 2 failures, both from a missing backslash in the function-inverse preview copy, since fixed. After the fix, I started the rerun (`/tmp/f3-unit2.log`, src/learning, graphs/functions, localization, demonstrations.test.ts, src/analysis) and a typecheck. Neither result was read. Not run: browser smoke, build.

Mutation evidence (observed failures): scene c 3 to 2 / ghost hidden / S2 x0 3 to 2 / tangent off (scene-state tests); prose `y=d=1` changed (reflection-line test); all `(7,-7)` in prose changed (quoted-point test); all `0{,}18034` changed (quoted-slope test); mutated `mapPoint` x = u*b+c (tracked-image assertion failed). Not individually observed: the S2 mirror-swap and product-equals-1 assertions, the x0 ranges, and the b=0 / base=1 rejection assertions.

Spec deviations: S1 step 4 says the reflection is in y=d (the x-axis only when d=0). Step 5 uses the cube base because x^2 is symmetric about x=c. S2 step 3 shows only the restricted x^2, because the graph offers no unrestricted choice; the horizontal-line test is prose. Posters are untouched (demonstrationPosterPending). The chapter section's demonstration list was not changed (F4).

Remaining: read `/tmp/f3-unit2.log` and rerun `just typecheck`; handler runs smoke and build.
