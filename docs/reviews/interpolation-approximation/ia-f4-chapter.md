# IA-F4: the `interpolation` chapter

Source: [task plan](../../tasks/interpolation-approximation/README.md), [spec](../../specs/interpolation-approximation-lessons.md), F4 template in [feature streams](../../tasks/feature-streams/README.md). Date 2026-11-02, curves handler 27. Modelled on BS-A-4 (`a6f53776`).

## What changed

- New Learn chapter `interpolation` (SL "Interpolacija in aproksimacija", EN "Interpolation and approximation") in the curves strand, directly after `b-splines`; I5 builds on the uniform B-spline limit. Sections: `through-or-near` (interpolate vs approximate, the chapter thread), then `lagrange` (owns I1 `interp-lagrange`), `runge` (I2), `hermite` (I3), `least-squares` (I4), `subdivision` (I5). Prerequisite links: `bezier-curves`, `splines`, `analysis`. Files `interpolationChapter.ts`, `interpolationChapterId.ts`, `interpolationChapterRegistry.ts`, `interpolationChapter.test.ts`.
- `guidedLessonOwnership.ts`: the five lessons leave the interim owner `bezier-curves/geometric-properties`. `/bezeg-2.0/interpolation` leaves `FAMILY_CHAPTER_PENDING`. Chapters 20 → 21, audited references 92 → 97, Learn thumbnails 20 → 21 (the card uses the `interp-lagrange` poster with new SL/EN alt text).
- The section prose uses the spec's checked examples on the shared points \((0,0),(1,2),(3,3),(4,0)\): I1 weights and the points \((2;\,2{,}8125)\) and \((2;\,1{,}875)\) with the hull height \(2{,}5\) at \(x=2\); the Runge grid maxima for \(n=10,15,20\) (equispaced and Chebyshev); the Catmull-Rom tangents and segment midpoint (equal to the Lagrange and four-point point); the I4 lines \(y=0{,}9x+0{,}9\) (SS \(0{,}7\)), quadratic SS \(0{,}45\) and outlier line \(y=2{,}1x+0{,}1\) (SS \(8{,}7\)); Chaikin points \((1{,}5;\,2{,}25)\), \((2{,}5;\,2{,}75)\); \(2^kn\) vertices for a closed polygon. I5 states \(C^1\) for \(w=\tfrac1{16}\) only (Dyn, Gregory, Levin 1987), no range and no \(C^2\).
- **Breaking:** the interim example ids `lesson.bezier-curves.geometric-properties.interp-*` no longer resolve (asserted); the new ids are `lesson.interpolation.<section>.<demonstration>`. Demonstration routes and stored Presets are unchanged. The interim ids are replaced by the chapter they were waiting for.

## Checks

- Worker (Sonnet `bezeg-worker`): ten tests in `interpolationChapter.test.ts`; every quoted number is recomputed from the `src/analysis` kernels and searched for in both languages. Mutations seen failing: wrong section owner, wrong quoted numbers (59,82 and 0,45), chapter placed before `b-splines`, wrong prerequisite link, wrong registry mapping. The Hermite midpoint mutation was not applied (malformed pattern); the value is the same \((2;\,2{,}8125)\) asserted for I1 and I5.
- Handler: every quoted number rederived by hand. Fixes: the section formula renders after the paragraphs, so "formula above"/"zgoraj" became "below"/"spodaj" (four places); the Chebyshev sentence now states the minimax property of \(\prod_j(x-x_j)\) and that it does not guarantee the smallest error for every function; the QR sentence says the app factorizes \(A\) rather than "solving the system with QR"; "z ponavljanjem" → "s ponavljanjem". Poster checked by eye against its alt text.
- On `a41a1312` plus the final diff: `npx tsc --noEmit --pretty false`, `just lint src/learning tests`, `just unit src/learning src/demonstrations` (406 s), `just build`, `just smoke-built tests/unified-learning.smoke.spec.cjs -g interpolation` 1/1 (deep link, refresh, contents, translated reading), `just smoke-lesson interp-lagrange interp-runge interp-hermite interp-least-squares interp-subdivision` 10/10 (sl, en).

## Gaps

- No section figures (G-HL).
