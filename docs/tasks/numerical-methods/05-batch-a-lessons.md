# 05 Batch A lessons, chapter, media and acceptance (F3–F6)

Gate: `G-REG`. Depends on 04.

- **F3a:** lessons N1 and N2. Scene actions, plus [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31) in per-family files under `src/learning/content/`. Multi-action scenes are tested in one synchronous sequence.
  - *Accepted 2026-11-02.* One `root-finding` lesson holds N1 (steps 1–6) and N2 (steps 7–13), because a Demonstration has one lesson; N3 appends its steps. Spec N1 steps 2 and 3 are one step. The N2 bisection bracket is not drawn: the text computes \(f(-2)\), \(f(-1)\), \(f(-1{,}5)\) by hand. Files: `src/learning/content/numericalMethodsGuidedLessons.ts` and its test (real graph, scenes in one synchronous sequence).
- **F3b:** lesson N3.
  - *Accepted 2026-11-02.* N3 is steps 14–20 of the `root-finding` lesson (now 20 steps, title "Tangentna (Newtonova) in sekantna metoda"), including the flat secant (\(x_0=-1\), \(x_1=1\)) and an exact root (\(x^3-x\) from \(0{,}4\), \(0{,}6\)).
- **F4:** the bilingual chapter *Numerične metode na grafu / Numerical methods on the graph* with chapter-owned guided examples. `lessonMathNotation.test.ts` passes unchanged.
- **F5:** the catalog preview clip and the example card images (highlight recipes once `G-HL` is met).
- **F6:** the Batch A gate in the spec: `just check`, smoke of the family's routes in both languages, the bisection lesson and routes unchanged, and hosted CI after the push.

Review: kernels, constructions, readouts and scene actions only; the prose is not reviewed (F3). Engineering and the notation test (F4). Visual comparison (F5).
