# Task 07 slice 3a: lesson morph, worker note

Done as in 07-morph-design.md. Not run: smoke, build, full suite, browser look.

- `src/workspace/view/motion.ts` (GLIDE_MS, easeOutCubic); `lessonMorph.ts` (+ test); `viewDirector.ts` retarget (`byFrame`, `fit()`), test added.
- `BaseGraph.tsx`: `lessonMorph` created in `bindParameters` with `rangeKeys` = declared `range` params bound to the arbiter; disposed in `releaseParameterArbiter`; `morphStep` on the lesson capability adapter; `LessonGraphCapabilities.morphStep?` in `learning/model.ts`; `GuidedLesson.tsx` wraps Back/Next.
- (a) Povrni: it compares `captureState()` JSON with the state read after the transition, which would be the old numbers mid-morph. Fixed: `captureLessonState` and `exportPreset` read through `LessonMorph.atTargets` (writes the targets under the lease, reads, puts the shown values back). Not covered by an automated BaseGraph test.
- (b) Export mid-morph previously read the interpolated live state; now the targets (same mechanism).

Deviations: none from the settled decisions. Back/Next within one step also go through `morphStep`; they change no range key, so no lease. No jump-to-step UI exists in GuidedLesson, so only back/next wrapped. Open: the "at most one glide per step" probe at 1280x720/1440x900 and the Back within 2 % check are not run; no BaseGraph integration test for `morphStep`/`atTargets`.
