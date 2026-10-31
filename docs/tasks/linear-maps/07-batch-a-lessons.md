# 07 Batch A lessons, chapter, media, acceptance (F3–F6, `G-REG`)

Spec: L1 and L2 steps and acceptance; [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31); batch-wide gate.

- **F3:** L1 and L2 as chapter-owned guided activities in a per-family content file (`linearMapsChapter*.ts`), scene actions from task 03 in one synchronous tick, prose stating the theorems (linearity of evaluation, area scaling) with the drag as an illustration. Notation rules and `lessonMathNotation.test.ts` apply.
- **F4:** the bilingual chapter *Linearne preslikave ravnine / Linear maps of the plane* in Learn with only L1 and L2 advertised.
- **F5:** catalog preview clip and example card images (highlight recipes once `G-HL` is open). Start capture only when the stream's other workers are idle; regenerate the manifest with its script.
- **F6:** Batch A gate, `just check`, smoke of the route and both lessons in both languages (default scene, drag, numeric entry, singular case, restore, refresh, narrow viewport, keyboard), hosted CI after push. Rerun `just linear-map-bench` on the classroom device, or record why it was not available; [ADR 0031](../../adr/0031-linear-map-grid-image-as-one-polyline.md) is revisited if `board.update` p95 exceeds 16.7 ms there.

Review: kernels, constructions, readouts and scene actions (mathematical); engineering for F4; Haiku visual comparison for F5.
