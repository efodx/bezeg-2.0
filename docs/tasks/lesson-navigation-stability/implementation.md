# Stable guided lesson navigation — production implementation

Source: [selected layout and acceptance](../../specs/lesson-navigation-stability.md). Owner authorized production implementation of A after the working trial on 2026-11-07.

Status: implementation and local acceptance complete, 2026-11-07. Release uses the standard master CI/Pages gate. Scope M: shared instructional layout and its consumers; mathematics, preset format and routes unchanged. The A/B/C prototype remains on `codex/prototype-lesson-navigation` at `42caae71`; this production branch starts from current master rather than merging exploratory code.

## Delivery

- Make the compact utility row and top progress/Nazaj/Naprej toolbar the single runtime layout. Keep consistent Skrij, distinct Končaj, contextual identity and accessible names. Preserve session/scene, keyboard, focus, drag placement and reading-position behavior.
- Bound the scrolling body by available graph/viewport space; retain compact short frames and reachable controls in narrow, short and enlarged-text layouts. Keep navigation steady across frame kinds, formula layout, observation expansion and final-frame labels.
- Update bilingual instructions and all replay/test consumers of the removed observe action. Keep frame actions, playback, completion, chapter return and exit usable.
- Keep only the selected production layout: no prototype files, comparison bar, variant flags, or losing-layout CSS.

## Verification and ownership

One worker owns runtime/CSS, workspace title context, localization and focused component tests. The handler owns prose/replay consumers, documentation, integration, checks, commits and push. Independent engineering and UI/accessibility/browser reviews follow at a stable checkpoint. Use `just` checks; test new assertions against pre-change behavior or a deliberate mutation.

Acceptance is the source spec's checklist. Run focused runtime/workspace/content/replay checks, TypeScript, scoped lint, a production build and shared-runtime browser smoke. Verify real graph editing and same-frame reopen, long/short and final-frame stability, dragging, narrow/short/200% text, SL/EN, completion/exit/chapter return and representative other lesson families. Record exact coverage and failures here before closeout.

## Review and repair evidence

- The engineering review found no runtime or lifecycle defect. Its stale architecture summary was updated. Mathematics was unchanged: the clipping prose only names the consolidated Hide control, and no formulas, numerical claims or scene actions changed. Mathematical specialist review was therefore unnecessary; the notation regression remains part of unit verification.
- The independent UI review measured identical Back/Next rectangles through twelve blossom frames and expanded observation disclosures at 1550×1117. A manual panel drag, Enter navigation, Escape/reopen and an actual free-point edit succeeded; the edit persisted after reopening.
- Real wheel input confirmed the outer panel owns scrolling in 844×390 landscape while controls stay sticky. At 320×844 with 200% root text, the review found the initial navigation bottom clipped. The handler added safe outer overflow and omitted decorative arrows with tighter padding below 17rem panel width. Fresh Slovenian and English checks then found fully visible, pointer-hit navigation and completion targets (66px tall), no horizontal page overflow, and successful completion in both languages.
- The first full browser run exposed an obsolete shared assertion requiring a panel h2 even when the page h1 already supplies the same title. The replacement checks the exact meaningful panel heading when present, otherwise the exact page h1 plus panel label, and always the panel's accessible name. The distinct Bézier lesson title remains explicitly checked. The obsolete run was stopped before restarting the full suite.
- Focused runtime/workspace checks passed (52 tests); deliberate Hide, title-context and toolbar-order mutations each failed their corresponding assertion before restoration. The replay helper's Node checks passed (4 tests). The full unit run passed 11,992 tests, with 4 skipped tests across 3 skipped files; the final local scroll repair then passed the 52 runtime/workspace tests again. Final TypeScript, full plus scoped lint, and the production build passed.
- The full production browser run passed 471 cases and exposed 22 failures. Besides the obsolete identity assertion, repairs corrected observation detection on the section itself, a too-short completion guard, integer scroll rounding and assumptions that every frame must overflow. Browser evidence also exposed two product defects: a 4px sticky-control offset in short windows and an enlarged-control outer scroll being reset on frame navigation. Both were corrected without relaxing the coordinate assertions. The final focused run passed 24 of 26 cases; its two Presentation failures came from the test scrolling the card underneath the sticky workspace heading. After centering the card deliberately, all 14 viewport/language matrix cases passed. Together these final runs cover all 26 affected cases, including every prior failure. CI runs the complete suite again for release.

New frames reset the reading content. Short-window outer reading scroll resets with its controls anchored; an outer offset used only to reveal enlarged controls is retained so Next stays under the pointer. Same-frame hide/reopen preserves both scroll positions. The matrix tests frame stability before deliberately repositioning the page for persistent-action checks, and confirms actual scroll ownership, pointer hits, keyboard Exit/cancel, reading restoration, SL/EN, desktop/projection, 390px/320px, short landscape, 200% root text and wider font metrics.

Independent UI evidence is limited to installed desktop Chromium and the reported viewports, text enlargement and interactions. It does not establish physical-device, comprehensive accessibility, or performance coverage. The final automated checks close the independent review's exit/cancel, scrolled-reading restoration and Presentation gaps.
