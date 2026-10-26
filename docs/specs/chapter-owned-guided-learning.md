# Chapter-owned guided learning

Owner request, 2026-10-26: guided lessons belong to chapters; chapter exploration and guided instruction must not appear as separate competing concepts. This supersedes the parallel chapter/lesson entry model in `unified-learning.md`.

## Acceptance

- Learn presents chapters as the learning units. Guided graph activities are discoverable inside their relevant chapter sections, including every available Bézier lesson, rather than a second independent list on Learn.
- Every available guided lesson has an authored chapter/section owner. Chapter launches and existing direct `?learn=1` links identify that chapter and offer an exact-section return. Existing demonstration and activity routes continue to work; no preset/storage changes.
- In the graph workspace, a guided activity has one instructional surface containing its chapter identity and lesson frames. Do not simultaneously show a separate chapter activity/investigation prompt and an unrelated lesson overlay.
- A prepared chapter activity cannot silently start another lesson over its scene. Launching guided instruction must release/restore the previous activity session before starting the new one, or direct the learner to the chapter's guided activity link instead. Preserve existing prepared activity scenes, reset, return, history, ordinary exploration and state restoration.
- All guided content, scenes, animation controls, progress, hide/show and safe exit behavior remain usable. Return to the chapter closes the lesson and restores its graph checkpoint through the existing lifecycle.
- Preserve the existing cream/green style, clear keyboard focus, desktop, narrow and enlarged-text usability, Slovenian and English. No mathematical or rendering changes.

## Verification

Add an observed-red regression through the workspace seam for the reported overlapping activity/lesson behavior and tests for chapter ownership/entry/return. Run focused navigation, chapter, lesson, content and notation checks, typecheck, lint and production build. Independently review ownership/lifecycle and chapter accessibility; delegate production browser smoke for the reported deep link, a family activity, direct legacy lesson entry, chapter navigation, language switching, hide/show, exit, graph editing and Back/Forward, including narrow and enlarged text. Record concrete coverage and gaps.

## Compatibility

Routes and lesson definitions stay valid. Learn's separate lesson listings are replaced by chapter-contained links. Guided instruction is a chapter activity, while the Demonstrations catalog remains an independent free-exploration entry.
