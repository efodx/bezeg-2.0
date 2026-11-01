# 12 — Bentley–Ottmann lesson C2 (S1, F3)

Status: written 2026-11-01 (geometry handler 19). Source: spec [C2](../../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece) (goal, default and degenerate examples, steps, acceptance 1, 3, 5, 6), [testing decisions](../../specs/sweep-algorithms-lessons.md#testing-decisions), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, trace readouts and counts, not prose. Depends on 09 (`BentleyOttmannGraph`), 10 (route `segment-intersections`) and 11 (`set-points` modes, `set-trace-step` pattern).

## Decisions (handler 19, 2026-11-01)

- **Actions.** `BentleyOttmannGraph` accepts `set-points` with `'segments'` (task 11), adopts `set-trace-step` and registers `algorithm-trace` like `IntervalSweepGraph`.
- **Summary counts.** On the default example the sweep makes 9 neighbour tests against \(\binom42=6\) pair tests: more, not fewer. Step 6 says so and explains that the saving appears when \(n\) is large and \(k\) small, with the \(O((n+k)\log n)\) bound and the meaning of \(k\). The quoted count is the graph's own tests counter at the end of the trace; if that counter differs from 9, the handler rechecks the trace before the text changes.
- **Chapter owner.** The interim owner, as in task 11.

## Acceptance

1. **Lesson** C2 (`segment-intersections`) in `src/learning/content/compgeoGuidedLessons.ts`; remove `lesson: false` from `segment-intersections` in `src/demonstrations.ts` and its id from `lessonCatalog.test.ts`; update the preview-copy counts and the smoke `LESSONS` list. The spec's seven steps with its default example \(s_0=(0,0)(6,4)\), \(s_1=(0,4)(6,0)\), \(s_2=(1,-1)(2,5)\), \(s_3=(4,5)(5,-1)\): 13 events, the statuses after each as listed in the spec, five crossings with exact rationals \((3,2)\), \((\tfrac{21}{16},\tfrac78)\), \((\tfrac{87}{20},\tfrac{29}{10})\), \((\tfrac{33}{20},\tfrac{29}{10})\), \((\tfrac{75}{16},\tfrac78)\). Step 5 shows one swap at a crossing; step 7 adds the degenerate example \(a=(0,0)(4,4)\), \(b=(0,4)(4,0)\), \(c=(0,2)(4,2)\), \(d=(2,0)(2,4)\) through \((2,2)\), reported once with all four segments, and free exploration. Playback is stopped by default and never autoplays.
2. **Views.** Every scene has a `view` that frames its segments (the default example reaches \(y=-1\) and \(y=5\)).
3. **Text:** one-shot, Slovenian and English, terms from the spec's table (*presečišče*, *sosednji daljici*, *stanje*, *vrsta dogodkov*). Every quoted value equals the scene's readout at that step; formulas wrapped per `lessonMathNotation.test.ts`.
4. **Tests:** frames run in one synchronous sequence; readouts at the quoted steps (status order, crossings found, tests counter) for the default and degenerate examples; `set-trace-step` clamps and `'end'` equals Next until done; Back and a scene change pause playback and leave no pending scheduler callback. An observed failure under a mutation for each new assertion.

Checks: as task 11. Handler: engineering review, mathematical recheck of the quoted rationals against the kernel, then `just smoke-lesson segment-intersections` and both languages with a live switch.
