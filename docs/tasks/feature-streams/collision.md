# Stream: Collision playground
Run state: active

Rules and slice template: [feature streams](README.md). Port 4320. Handoffs: `docs/reviews/feature-streams/collision/`. Tasks and slice status: [collision-playground tasks](../collision-playground/README.md). This file holds one status line per feature.

| # | Feature | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Collision playground, batches A and B (sweep chapter) | [collision-playground.md](../../specs/collision-playground.md), [ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md) | None. No gate: no Demonstration, lesson or registration change | Released 2026-11-07: CP1–CP7 accepted ([acceptance matrix](../../reviews/collision-playground/batch-b-acceptance.md)) |
| 2 | Collision playground, batch C (convexity chapter, polygons) | same | Feature 1 released | Released 2026-11-08: CP8–CP10 accepted ([acceptance matrix](../../reviews/collision-playground/batch-c-acceptance.md)) |

## Notes

- **Owner requirement (2026-11-07):** the slowdown must stay inside the animation, and the reader's page and machine stay usable. The spec's containment criteria encode it. A miss goes to the owner before chapter blocks are pushed.
- **Shared code:** CP6 changes `src/learning/chapter/orderedContent.ts`, `ChapterPage.tsx`, `FamilyChapterPage.tsx` and the Bézier chapter's playground blocks, in their own commit. Learn UI owns the Bézier playground. This stream changes only the block's type shape and leaves the drawing playground's behaviour unchanged.
- **Locale catalogs:** the keys go in one block after the drawing-playground keys, in the same position in both files.
- **First worker in the app** ([ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md)). Keep the worker host thin and the model pure, so unit tests need no Worker.
- **Shared runtime commit (2026-11-07):** "refactor: let family chapters render typed playground blocks" changes `orderedContent.ts`, `FamilyChapterPage.tsx`, `familyChapters.ts` and the Bézier chapter's playground blocks. Platform's lesson-runtime tasks should rebase over it.
- **Containment (2026-11-07, CP7 trial):** on mobile 4×, scroll and link p95 were about 136 ms against a 100 ms target, already with the playground paused; a bare Learn page gave 28 ms. Resolved by handler 2: the paused baseline had been playing; truly paused costs nothing, and adaptive draw pacing brought playing to 52–54 ms ([results](../../bezier-performance-results.md#collision-playground-containment-and-draw-pacing--2026-11-07)). Chapter blocks pushed.
- **CP6 part 2 checks (2026-11-07, handler 2):** full `just unit src/learning` passed on local commit 2fd33109 (1114 s). Part 2 stays unpushed until the containment decision.
