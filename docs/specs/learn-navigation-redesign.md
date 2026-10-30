# Learn navigation redesign

Source: owner request, 2026-10-30: "redesign bezeg-2.0/learn. It's a bit hard to navigate now." Owner chose landing plus chapter wayfinding as scope, and an ordered path grouped into strands as the landing structure. This revises the landing page from [learn improvements](learn-improvements.md) §2 and adds to its shared reader (§3).

## Problems observed

- The landing page stacked nine equal topic blocks (about 4,400px on desktop, 6,400px at 390px) with a large preview, caption, related-topic link and identical filled button each. Order and grouping were not visible.
- The jump-link row used catalog family names ("Bezierjeve Krivulje", "Funkcije in analiza") that did not match the chapter titles below.
- The landing page gave no view of what a chapter contains.
- Chapter pages: the long readers (5,000–17,000px) offered next/previous chapter only at the end; the return link read "Vsa učna vsebina←"; the programmatically focused title showed a browser focus box; the Bézier return omitted the topic anchor; the sidebar contents split titles containing inline math.

## Decisions

- Landing: a compact numbered path in three strands — Curves (1–6), Surfaces (7), Functions and analysis (8–9) — in the existing Learn order. `learningStrands` must list every chapter once; a unit test enforces it. Foundations' marker carries the ochre start accent beside the existing "Start with Foundations" action, and the introduction now states that the order is suggested.
- Each topic row has the chapter title as its heading link, a small graph thumbnail (existing catalog captures and alt text), purpose, a quiet "Read the chapter" action and a native "Contents" disclosure with section and guided-example counts. The disclosure lists every section, linked to its chapter anchor, with that section's guided-example count. Guided examples stay inside their owning sections; the landing page still has no direct lesson links.
- Chapters: a breadcrumb returns to the chapter's row on Learn (now also for Bézier) and shows "Chapter n of 9"; the desktop contents sidebar ends with the previous/next chapter; the narrow contents disclosure stays sticky at the top and shows "section n of m". The chapter title no longer draws a focus outline when it receives reading focus.

## Breaking changes and impact

- Removed from the landing page: the topic jump-link row, preview captions and "Related topic" sentences. The thumbnails keep their bilingual alt text, and chapter prerequisites still carry the topic relationships. Chapter titles on the landing page moved from `h2` to `h3` beneath strand `h2` headings.
- `.learning-open` on topic rows became `.learning-read`; the smoke spec was updated. Routes, anchors (`/learn#<chapter>`, `<chapter>-heading`), presets and stored data are unchanged.

## Verification (2026-10-30)

Typecheck, lint, all 58 learning unit test files (995 tests), production build, and `tests/unified-learning.smoke.spec.cjs` (11 passed) on the production build. Rendered review at 1440, 1024 and 390px with no document horizontal overflow; Slovenian, English after a live switch, open outline, and chapter breadcrumb, sidebar neighbors and sticky narrow contents mid-scroll. Not covered: 200% text zoom, physical touch devices and projector.
