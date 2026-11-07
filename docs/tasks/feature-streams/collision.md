# Stream: Collision playground
Run state: not started

Rules and slice template: [feature streams](README.md). Port 4320. Handoffs: `docs/reviews/feature-streams/collision/`. Tasks and slice status: [collision-playground tasks](../collision-playground/README.md). This file holds one status line per feature.

| # | Feature | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Collision playground, batches A and B (sweep chapter) | [collision-playground.md](../../specs/collision-playground.md), [ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md) | None. No gate: no Demonstration, lesson or registration change | Planned 2026-11-07 (owner approved); CP1 next |
| 2 | Collision playground, batch C (convexity chapter, polygons) | same | Feature 1 released | Task files CP8–CP10 written when feature 1 is released |

## Notes

- **Owner requirement (2026-11-07):** the slowdown must stay inside the animation, and the reader's page and machine stay usable. The spec's containment criteria encode it. A miss goes to the owner before chapter blocks are pushed.
- **Shared code:** CP6 changes `src/learning/chapter/orderedContent.ts`, `ChapterPage.tsx`, `FamilyChapterPage.tsx` and the Bézier chapter's playground blocks, in their own commit. Learn UI owns the Bézier playground. This stream changes only the block's type shape and leaves the drawing playground's behaviour unchanged.
- **Locale catalogs:** the keys go in one block after the drawing-playground keys, in the same position in both files.
- **First worker in the app** ([ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md)). Keep the worker host thin and the model pure, so unit tests need no Worker.
