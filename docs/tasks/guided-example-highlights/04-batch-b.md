# 04 — PH curves, parametrization, functions and calculus, analysis

Status: planned. Source: [spec H1, H2, H4, H6](../../specs/guided-example-highlights.md). Dependencies: 00 accepted with owner decisions resolved; 01 recipe format and runner available. Role: chapter content worker; the handler assigns shared-file ownership with task 03.

Scope: chapters `ph-curves`, `parametrization`, `functions-and-calculus`, `analysis`.

1. Remove the standalone figures in these chapters (PH cubic, PH quintic, and the parametrization, continuity, derivative/arc length, definite integral, bisection/mean value, Darboux/accumulation and sequence/convergence figures) per the task 00 dispositions. Rewrite prose that refers to them in both languages; move still-needed distinctions from old captions into prose (for example, that catalog PH curves differ from the integrated curve from the origin).
2. Author highlight recipes for every retained example in these chapters, then capture them with the task 01 runner. The quintic PH card highlight shows the offset turned on, matching the owner's reference.
3. Write new bilingual captions and alternative text describing each highlight and how to reach it. Respect the lesson notation rules and keep claims tied to the checked geometry.
4. Add or update scene/numerical checks for each caption claim (offset distance and cusp absence, speed and arc length, convergence values).

Completion: no section figures in these chapters; every card has a current highlight image, caption and alt text; chapter, ordered-content, guided-example, scene-content and unchanged notation tests pass; typecheck and build pass. Delegate smoke for these chapters in both languages including launch/return and narrow layout. Hand evidence and gaps to task 05 in `docs/reviews/guided-example-highlights/batch-b-note.md`.
