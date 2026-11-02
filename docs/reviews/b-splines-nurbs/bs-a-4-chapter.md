# BS-A-4: the `b-splines` chapter

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec](../../specs/b-splines-nurbs-lessons.md), F4 template in [feature streams](../../tasks/feature-streams/README.md). Date 2026-11-02, handler 21.

## What changed

- New Learn chapter `b-splines` (SL "B-zlepki in NURBS", EN "B-splines and NURBS") in the curves strand, directly after `splines`. Sections: `bspline-idea` (from joined Bézier pieces to one curve with a knot vector; knot, multiplicity, degree, clamped vector, number of control points `m-k`), `bspline-basis` (owns L1), `bspline-deboor` (owns L2). Prerequisite links: `bezier-curves`, `splines`. Files `bsplineChapter.ts`, `bsplineChapterId.ts` (leaf id), `bsplineChapterRegistry.ts` (lazy getters), `bsplineChapter.test.ts`; wiring copied from the Fourier F4 commit `2847fd83`.
- `guidedLessonOwnership.ts`: both lessons leave the interim owner `splines/piecewise`. `/bezeg-2.0/bspline` leaves `FAMILY_CHAPTER_PENDING`. Chapter counts 18 → 19, audited references 84 → 86.
- The Learn card has an alt text for `bspline-basis` but shows no thumbnail until the B-spline posters exist (BS-A-5); the thumbnail count stays 18.
- The chapter names only L1 and L2 and ends its purpose with "Further sections will follow"; a test rejects naming knot insertion, extraction, NURBS circle or blossoming as present.
- **Breaking:** the interim example ids `lesson.splines.piecewise.bspline-basis` and `lesson.splines.piecewise.bspline-deboor` no longer resolve (asserted); the new ids are `lesson.b-splines.<section>.<demonstration>`. Demonstration routes, stored Presets and `learnChapter`/`learnSection` launches from the new owner work. The interim ids were on master for less than a day.

## Checks

- Worker (Sonnet `bezeg-worker`): five tests in `bsplineChapter.test.ts`, including a recursion of the basis functions and de Boor that checks every quoted number. Each new assertion was seen failing under a mutation: wrong section owner, chapter moved out of order, a sentence promising knot insertion, wrong example path prefix.
- Handler: mathematics checked by hand against the spec (`m-k=4` points for `(0,0,0,1,2,2,2)`, basis values at `t=1/2`, support `[u_3,u_6)=[1,2)`, de Boor `(0.5,1),(1.5,2)→(1,1.5)`, two pieces). Fixed the support bracket of the last function, aligned "lokalni nadzor" with the L2 lesson, and corrected a stale test comment.
- On `c341e314` plus the diff: `just unit src/learning` passed (490 s), `npx tsc --noEmit`, `just lint src/learning tests`, `just build`; `just smoke-built tests/unified-learning.smoke.spec.cjs -g "b-splines|splines"` 2/2 (deep link, refresh, contents, translated reading); `just smoke-lesson bspline-basis bspline-deboor` 4/4.
- Handler browser check (Playwright, production preview, 1366×900): SL load and live switch to EN change the title, section titles and example links (`?example=lesson.b-splines.…`); no MathJax error and no unrendered `\(` in either language; the Learn card is present without an image; no page errors. After a live switch the page holds fewer `mjx-container` nodes than after a direct load (98 → 51); the Fourier chapter does the same (140 → 72), so this is existing behaviour, and the visible math rendered.

## Gaps

- Not checked: narrow viewport and text enlargement of the chapter page (the page uses the shared chapter layout).
- No section figures (G-HL).
