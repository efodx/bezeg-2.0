# AB-A-4: Advanced Bézier topics chapter

Curves handler 60, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md). Chapter text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). **Status: accepted; cards and posters follow in AB-A-5.**

## Changes

- Chapter `advanced-bezier` at `/learn/advanced-bezier`: an opening section, then `reduction`, `arc-length-param` and `patch-coons`, each owning its lesson. `CHAPTER_LINK_PENDING` is empty.
- **Order.** After `bezier-patches`, as D4 needs the patch chapter. `LearningPage.test.tsx` requires strands in chapter order, so the chapter cannot sit in *Krivulje*. It joins the second strand, retitled *Ploskve in napredne teme* / *Surfaces and advanced topics*.
- **Family.** `family` is `/bezeg-2.0/bezier`, but `patch-coons` is in `patches`. Family paths are only read for the family title, so nothing picks the wrong chapter. The check that links every Demonstration now counts each by its own family.
- Thumbnail: `patch-coons`, the one poster that exists.

## Breaking change

`?example=lesson.bezier-curves.geometric-properties.patch-coons` no longer resolves, and neither do the same links for `reduction` and `arc-length-param`. **Reason:** these lessons left their interim owner; an alias would keep a section that never showed them. **Impact:** only a hand-kept link to the example id, which the app never displayed from a chapter. `?learn=1` with the old chapter and section still opens the lesson, and bare routes and stored Presets are unchanged. Nothing in the repository uses the old ids.

## Checks

| Check | Result |
| --- | --- |
| Handler, final tree | `just typecheck`, lint, `just unit` on the chapter, family, patch, Learning page, notation and catalog tests and `src/learning/chapter` |
| Mutation (worker) | `reduction` owner pointed at another section: two chapter tests failed |
| `just smoke-built tests/unified-learning.smoke.spec.cjs` | 26 passed |
| `just smoke-lesson reduction arc-length-param patch-coons` | 6 passed, on the new owner |
| Numbers | Handler recomputed the arc-length figures (PH chords, \(L\), polyline errors, polygon); reduction figures match the lesson review; the chapter test recomputes the reduction and Coons numbers |
| Engineering review (`bezeg-reviewer` Sonnet) | No blocker; the two findings are the link above and AB-A-5's cards |

The handler corrected "nepolinomska kubična krivulja" to a curve that is not PH: a cubic Bézier curve is polynomial.

`just check` did not run on this commit; hosted CI covers the push.
