# 06 — Bézier patches

Status: planned. Source: [spec H1, H2, H4, H6, owner decisions D1, D2, D4, D6](../../specs/guided-example-highlights.md). Dependencies: 00 accepted with owner decisions resolved; 01 recipe format and runner available. Role: chapter content worker.

Scope: chapter `bezier-patches`. Its content lives in `patchChapter*.ts` and the patch guided-example registry (`patchGuidedExampleRegistry.ts` and its parts), not in `familyChapters.ts`.

1. Remove all 12 patches figures (the 11 that reuse card start images, `patchChapter.ts:26-31`, and the catalog `patch-tensor` figure in `curve-to-patch`). Rewrite prose that refers to them in both languages; the 4×3 net stays in prose (D4).
2. Author highlight recipes for all 11 patch examples, using the task 00 matrix and D6 (`tensor-joins` C0 join, `properties` hull and affine case, `curve-to-patch` start). Capture them with the task 01 runner, which must handle the SVG surface view (`scripts/surface-view-evidence.cjs`).
3. Write new bilingual captions and alternative text, following the lesson notation rules.
4. Add or update scene and numerical checks for each caption claim.

Completion: no section figures in the chapter; every card has a current highlight image, caption and alt text; patch chapter, guided-example, scene-content and unchanged notation tests pass; typecheck and build pass. Delegate smoke for the chapter in both languages, including launch/return and narrow layout. Hand evidence and gaps to task 05 in `docs/reviews/guided-example-highlights/batch-patches-note.md`.
