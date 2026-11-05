# 29 — Lesson A6 tests and gates (Batch 3, F3)

Status: planned 2026-11-05 (geometry handler 52). Template: tests of [21](21-lesson-point-in-polygon.md) and [22](22-lesson-hull-robustness.md). Kind: F3. Depends on 28.

Tests:

- Frames run in one synchronous sequence. Back and a scene change restore the scene.
- Every quoted number equals the readout at its step in both languages: \(2\) of \(4\); \(8\) of \(256\); the two pairs of the inside-pieces example; \(1\) of \(256\) on the near-miss pair.
- The near-miss claim is pinned by a model test that depth 5 discards the pair (extend task 24's test if it stops at depth 4).
- The text says overlap is necessary, not sufficient, says the recursion stops at a fixed depth, and does not call the test exact (acceptance 4).
- `lessonMathNotation.test.ts` passes unchanged, and the chapter's ownership, order and link lists pass; merge `CHAPTER_LINK_PENDING` as a union and recount.
- Observed mutation failures, for example the near-miss pair moved one grid step, or the last step replaced by the one before it.

Checks: `just unit src/learning src/graphs/compgeo --maxWorkers=2`, tsc, build, `just smoke-lesson bezier-hulls`.

After 29 come the F5 poster (a selective capture with `POSTER_PENDING` emptied first) and the Batch 3 F6 acceptance: criterion-to-test matrix, bilingual smoke, focus return from the lesson, `just check`, and the docs (`GLOSSARY.md`, `docs/capabilities.md`, `docs/current-architecture.md`).
