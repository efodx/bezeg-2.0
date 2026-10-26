# Final engineering and UI review

Reviewed the dirty implementation at `ad37517` against A2, A6, A7, and A8 of `docs/specs/illustrated-chapter-examples.md`. Scope: chapter renderers, ordered content, guided-example cards, retained lesson caching, and focus restoration. Read-only source review; no browser or final-image acceptance.

## Finding

- **P2 — guided-example prompts inherited the old bold list-label rule. Closed by scoped rereview.** `src/learning/ChapterGuidedLessons.css:6` now targets only direct child paragraphs (`.chapter-guided-lessons > p`), so the prompt paragraphs nested inside cards no longer match that `font-weight: 650` rule. `ChapterPage.css` supplies the prompt's regular font sizing and line height. The handler/smoke pass will verify computed weight at desktop and narrow widths.

## Reviewed areas

Ordered chapter rendering preserves DOM order for paragraphs, formulas, figures, and referenced cards; registry IDs, not positions, key example cards. Missing card previews remove the image and caption while retaining title, prompt, and launch link. Card images declare dimensions and the shared figure style reserves an 18:11 frame; the layout stacks below 520px. Launch actions are native router links with a 44px minimum height and visible focus styling. Return bookmarks retain the stable card link ID, and the chapter restores that focus target. The new `WeakMap<LessonDefinition, Map<homeId, LessonDefinition>>` is keyed by the lesson catalog's memoized definition identity and each retained home; it reuses merged frames without a strong global reference or cross-home collision. No additional cache invalidation defect found for the static content model.

## Remaining acceptance checks

After final capture and rebuild, verify actual image legibility and crop at projection-sized desktop, narrow width, and enlarged text; exercise keyboard launch, browser Back, refresh/direct launch, and focus/scroll return for both Bézier and family chapters. Check that a deliberately unavailable preview leaves readable text and an operable action. A8 remains incomplete until those checks and final media inventory are recorded.
