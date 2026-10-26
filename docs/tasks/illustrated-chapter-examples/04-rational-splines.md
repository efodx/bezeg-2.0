# 04 — Rewrite rational and spline chapter sequences

Status: complete 2026-10-26. See the [acceptance record](../../reviews/illustrated-chapter-examples/acceptance.md). Source: [spec A1–A8](../../specs/illustrated-chapter-examples.md). Dependencies: 00–02 accepted. Role: chapter content/scene implementation worker; handler assigns shared-file ownership.

Scope: `rational-curves` and `splines`. Start at their audited sections in `content/familyChapters.ts`, rational/spline guided definitions, prepared scenes and example mappings. Coordinate shared registry changes with its owner.

1. Consolidate overlapping short prompts and longer sequences according to the audit while preserving distinct goals: weights/projective interpretation and rational constructions; spline joining, continuity and geometric continuity. Do not merge solely because entries use the same graph route.
2. Rewrite/split both languages into explicit explanation/example/reflection sequences. Keep conditions for rational denominators and continuity claims precise. Preserve the worked join of two parabolas and its first/second derivative comparisons separately from a general spline construction unless the resulting sequence actually teaches both with matching prepared frames.
3. Finalize preparation, frames and aliases before capturing every retained example's actual starting graph. Replace generic/mismatched card previews, provide bilingual observation captions/alt text, and distinguish displayed geometry from proof of continuity.
4. Update the audit with final goal, placement, link and preview mappings. Shared section figures may remain for distinct teaching purposes; remove redundant repetition only with a recorded rationale.

Completion: all source entries/goals for both chapters accounted for, all retained cards placed and illustrated. Run relevant rational/spline mathematical and scene-content tests, chapter/registry tests, unchanged notation test, exact TypeScript check and production build. Check actual graph coordinates/weights/joins affected by changes, including the worked-parabola scene; prove new regressions fail before the change or under mutation. Delegate smoke for both languages and chapters, card image/caption readability, launch/return/focus, representative aliases, keyboard and narrow touch flow. Hand evidence and gaps to task 07.
