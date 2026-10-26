# 02 — Larger guided-example card image

Status: planned. Source: [spec H5, H6](../../specs/guided-example-highlights.md). Dependencies: none. Role: reader UI worker.

Start from `src/learning/ChapterExploration.tsx`, `ChapterGuidedLessons.tsx` and their CSS (`ChapterPage.css`, `ChapterGuidedLessons.css`). Keep the cream/green identity and existing card content order.

1. Capture before screenshots and card dimensions at a fixed desktop viewport and text size for the quintic PH card (`ph-curves`, *Offsets and singularities*) and one Bézier card, plus narrow width.
2. Give the image roughly half the card width beside the copy on desktop/projection widths; stack on narrow widths. Reserve the aspect ratio, avoid cropping or stretching, and keep the caption readable. Agree image pixel size with task 01 so captures are sharp.
3. Check enlarged text, both languages, keyboard focus, reading order and the missing-image fallback. No changes to actions, routes or return behavior.
4. Capture after screenshots and dimensions under identical conditions.

Completion: focused component tests updated, typecheck, lint, build and focused browser validation at desktop, projection-size and narrow widths. Store evidence in `docs/reviews/guided-example-highlights/layout/` with a short note listing dimensions before and after.
