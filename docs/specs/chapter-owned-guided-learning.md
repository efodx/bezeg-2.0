# Chapter-owned guided learning

Status: implemented and locally accepted 2026-10-26. [Acceptance evidence and coverage limits](../reviews/learning-consolidation/acceptance.md) records master integration and deployment separately.

Owner request, 2026-10-26: guided lessons belong to chapters; chapter exploration and guided instruction must not appear as separate competing concepts. This supersedes the parallel chapter/lesson entry model in `unified-learning.md`.

## Acceptance

### Consolidated learning flow — confirmed 2026-10-26

The owner confirmed all three recommendations after comparing the Splines `worked-join` investigation and its separate guided lesson. This is the agreed product model, now implemented; the linked acceptance record describes observed verification.

- The flow is Learn → chapter section → guided example on the graph → the same chapter section, where reading continues. The example is part of that learning path.
- Use **Guided example / Vodeni primer** as the learner-facing name, replacing Guided lesson / Vodena učna pot and competing investigation terminology for chapter-launched graph activities.
- Every graph activity launched from Learn uses the same guided-example experience. A short example may contain one exploration prompt; a longer example may contain several explanation and observation frames. These are variations of one concept, not separate learning modes.
- Each example supplies chapter context, a prepared graph matching the explanation, instructions and exploration prompts in one coherent experience. Do not retain a separate investigation banner alongside an independent guided sequence.
- Finishing leaves the graph available for continued experimentation and offers **Continue in chapter / Nadaljuj v poglavju**. It does not automatically navigate away. Returning midway remains available and returns to the owning section with reading position and focus restored.
- Guidance opened from the Demonstrations catalog opens the same chapter-owned example, with chapter context and a return destination. Independent free exploration remains available through Demonstrations.
- Audit the content match product wide. In particular, the Splines `worked-join` example must illustrate the chapter's worked join of two parabolas; sharing a graph route with a general symmetric spline sequence is insufficient.
- Existing entry links must resolve into the consolidated experience or have an explicitly documented compatibility change. Preserve mathematical meaning, safe example cleanup and graph-state ownership; do not introduce accounts, assessment or persistent learning progress.

Implementation acceptance must include a chapter/example/return round trip for both a short and a multi-frame example, midway return, completion followed by graph editing, catalog guidance entry, and the reported spline content match, in addition to the checks below.

### Existing ownership and lifecycle requirements

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
