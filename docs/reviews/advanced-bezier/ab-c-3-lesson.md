# AB-C-3: guided lesson D4 (Coons patch)

Curves handler 18, 2026-11-02. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md) D4.

## Changes
- `src/learning/content/coonsGuidedLessons.ts`: seven steps (spec Steps 1–7) in SL and EN, two formula blocks, two worked examples. Step 1 shows \(S\): no lesson action turns shading off, so its prediction is the count of 12 distinct boundary control points.
- `src/learning/model.ts`: `coons` action kind (`set-shown`, `set-linked-corners`, `move-point`), validated in `CoonsPatchGraph.tsx`; `prepareLessonDefaultScene` refits the camera on Reset.
- Registration: `demonstrations.ts` (`lesson: false` removed), `guidedLessons.ts`, preview copy (counts 68/75), notation scan, catalog list, smoke row `patch-coons` (shown-surface select and `[data-corner-status]` per step).
- **Owner.** The brief asked for `bezier-patches/curve-to-patch`. That chapter is chapter-owned, so `?learn=1` resolves only lessons in its registry (`resolveGuidedExample`, `guidedExamples.ts:254-259`), and the lesson did not open (smoke caught it). Interim owner is `bezier-curves/geometric-properties`, like I3/I5; the F4 slice links the lesson into the patches chapter (`patch-coons` stays in `CHAPTER_LINK_PENDING`).

## Checks
- First worker partial at 135k; finisher worker ran the checks. `coonsGuidedLessons.test.tsx` 11/11; mutations: L_d net (5 failed), L_c net (4 failed), corner tolerance (2 failed); bilinear corner weight survived as an equivalent mutation (default corners coincide).
- Handler: `just unit src/learning src/graphs/patches src/DemonstrationsPage.test.tsx src/demonstrations.test.ts` passed; typecheck; lint on touched files; build; `SMOKE_PORT=4314 just smoke-lesson patch-coons interp-subdivision segment-intersections` 6/6 after the owner fix and `minFrames` 17→16.

## Reviews
- Math (Sonnet): no error; all quoted numbers re-derived. Lows deferred: prose number checks use `toContain` on short strings ('0', '3', '12', '16'), so some wrong numbers would pass.
- Engineering (Sonnet): no medium. Lows deferred: loose error regex for bad payloads (test :300); camera refit check compares only `el` (test :246); no-op `move-point` accepted silently.
- Not checked: live SL→EN switch in the browser.
