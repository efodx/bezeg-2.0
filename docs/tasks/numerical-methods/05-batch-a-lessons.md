# 05 Batch A lessons, chapter, media and acceptance (F3–F6)

Gate: `G-REG`. Depends on 04.

- **F3a:** lessons N1 and N2. Scene actions, plus [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31) in per-family files under `src/learning/content/`. Multi-action scenes are tested in one synchronous sequence.
- **F3b:** lesson N3.
- **F4:** the bilingual chapter *Numerične metode na grafu / Numerical methods on the graph* with chapter-owned guided examples. `lessonMathNotation.test.ts` passes unchanged.
- **F5:** the catalog preview clip and the example card images (highlight recipes once `G-HL` is met).
- **F6:** the Batch A gate in the spec: `just check`, smoke of the family's routes in both languages, the bisection lesson and routes unchanged, and hosted CI after the push.

Review: kernels, constructions, readouts and scene actions only; the prose is not reviewed (F3). Engineering and the notation test (F4). Visual comparison (F5).
