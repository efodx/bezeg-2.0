# Foundations implementation evidence

Implemented docs/specs/learn-improvements.md §6a on the accepted Task 5 base 75536ec62961c0302c67430b91970249f8f165c1.

familyChapters.ts now gives Foundations a bilingual unit-circle/radian introduction, polar form before the multiplication rule, and the zero-factor/undefined-argument exception. It preserves the quadratic midpoint calculation and connects Bernstein weights to later control-point combinations and complex multiplication to later curve transformations. The math follows the accepted audit checks: at \(t=\frac12\), the quadratic weights remain \((\frac14,\frac12,\frac14)\), giving \((2,1)\); multiplication by \(i\) sends \((x,y)\) to \((-y,x)\).

The typed optional figures and investigationPrompts section fields are reusable; only Foundations supplies them, so other family chapters retain existing rendering. The reader renders uncropped full-column figures with bilingual natural-language alt text/captions, per-demo prompts, and a “Guided graph lesson” label only where the link adds ?learn=1. Demo IDs and destinations are unchanged.

Both figures reuse demonstrationPreviewAssets.ts imports mapped to existing catalog PNGs. I visually checked bernstein.png: it shows four cubic basis functions; its caption explicitly distinguishes the quadratic worked example. complex-multiplication.png shows z=1+i, factor i, product -1+i, and argument arcs. These match the bernstein and complex-multiplication entries in scripts/demonstration-preview-recipes.cjs; no captures were regenerated.

Focused checks passed:

- just unit src/learning/LearningPage.test.tsx src/learning/content/familyChapters.test.ts src/learning/content/lessonMathNotation.test.ts
- npx tsc --noEmit --pretty false
- just lint src/learning/content/familyChapters.ts src/learning/content/familyChapters.test.ts src/learning/FamilyChapterPage.tsx src/learning/LearningPage.test.tsx

For regression evidence, temporarily disabled the new figure renderer and reran the focused Foundations reader test. It failed at LearningPage.test.tsx:124 (expected two figures, received zero); I restored the renderer and the full focused set passed. Production build and browser verification remain with the handler.

Changed application paths: src/learning/content/familyChapters.ts, src/learning/FamilyChapterPage.tsx, src/learning/LearningPage.css, src/learning/content/familyChapters.test.ts, and src/learning/LearningPage.test.tsx.

Math review disposition (docs/reviews/learn-improvements/foundations-math-review.md): clarified in Slovenian and English that product arguments add modulo \(2\pi\), and that the graph's displayed argument is the modular sum. The zero-factor exception remains explicit. After this wording repair, the focused family/reader/notation tests and exact TypeScript check passed again.
