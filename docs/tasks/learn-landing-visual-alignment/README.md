# Learn landing visual alignment work queue

Status: planned, 2026-10-31. Source, decisions and shared acceptance: [specification](../../specs/learn-landing-visual-alignment.md). No task is started.

All four tasks edit `src/learning/LearningPage.tsx` and `src/learning/LearningPage.css`, so they run in order. Tasks 1–3 could be given to one worker as a single slice; task 4 closes the work with responsive checks and the DESIGN.md record.

| # | Task | Dependency |
| --- | --- | --- |
| 1 | [Shell tokens, backdrop and typography](01-shell-alignment.md) | None. |
| 2 | [Two-column opening with count line](02-opening.md) | After 1 (eyebrow and heading styles). |
| 3 | [Strand cards and calmer chapter rows](03-strand-cards-and-rows.md) | After 1. Can follow 2 or run before it. |
| 4 | [Phone layout, verification and DESIGN.md](04-phone-and-record.md) | After 2 and 3. |

## Working rules

- Keep the [Learn navigation redesign](../../specs/learn-navigation-redesign.md) structure: strands, order, heading links, thumbnail, purpose, Contents disclosure, no step numbers.
- Keep the `.learning-family` (with `id={chapter.id}`) and `.learning-read` hooks used by `tests/unified-learning.smoke.spec.cjs`.
- Do not touch the chapter-shared rules at the end of `LearningPage.css` or `ChapterPage.css`.
- The page uses inline `LocalizedText` copy rather than catalog keys; keep that pattern for new strings so `sl`/`en` stay side by side.
