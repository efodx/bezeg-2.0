# AB-B-4: D2 section of the Advanced Bézier chapter

Curves handler 65, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md). Chapter text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Handler-only: one section and its wiring. **Status: accepted; the card and poster follow in AB-B-5.**

## Changes

- Section `bezier-clipping` in chapter `advanced-bezier`, owning its lesson, between `reduction` and `arc-length-param`: the spec's D1 to D4 order. `CHAPTER_LINK_PENDING` is empty. The purpose and opening now say four topics.
- The chapter card is listed as `pending` in `guidedExamplePreviews.test.ts` until AB-B-5.
- **No link to `convexity-hulls`.** That chapter comes after this one, and the chapter test refuses a prerequisite link to a later chapter. The hull property is part of *Bézierjeve krivulje*, already a prerequisite; the prose names the convex hull of the control points.

## Breaking change

`?example=lesson.bezier-curves.geometric-properties.bezier-clipping` no longer resolves. **Reason:** the lesson left its interim owner, as D1 and D3 did in AB-A-4. **Impact:** only a hand-kept link to that id, which was live for under two hours. No stored Preset or route changes.

## Checks

| Check | Result |
| --- | --- |
| `just unit` on the chapter, family, notation, Learning page tests, `src/learning/chapter`, `src/demonstrations` | Passed |
| `just typecheck`, lint on touched files, `just build` | Passed |
| New test | Runs `clipBezierPair` on the three pairs and checks every clip count quoted, 28 unresolved and the empty result; every count must appear in both languages |
| Mutations, each restored | Owner pointed at `reduction`: two tests failed. *113* to *114* in Slovenian only: number test failed. Expected *53* to *54*: failed against the kernel |
| `just smoke-built tests/unified-learning.smoke.spec.cjs` | Passed, with the chapter's section count raised to 5 |
| `just smoke-lesson bezier-clipping` | Two rows passed on the new owner |
| Review | Handler, small diff. The mathematics repeats the numbers reviewed in [AB-B-3](ab-b-3-lesson.md); the vertical gap \(16(t-\tfrac12)^2\) is \(y_B-y_A\) at equal \(t\), as both curves have \(x=4t\) |

The section's table-free wording avoids the result range of the tangent run: it quotes only the limit and the 28 pairs.
