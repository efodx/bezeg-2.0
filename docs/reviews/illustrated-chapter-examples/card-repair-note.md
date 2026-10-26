# Card prompt and narrow overflow repair

Checkout: `codex/consolidated-learning`, initially at `ad37517`; implementation files were already dirty for the illustrated-chapter-examples objective.

## Findings and changes

An exhaustive registry assertion found seven cards with no learner prompt in either language: `bezier-curves.interpolation.alternative-recursion`, `bezier-curves.interpolation.decasteljau`, all four `bezier-curves.next-ideas.*` cards, and `ph-curves.arc-length-problem.ph-cubic-speed`. Their retained lesson cards read titles but derived prompts only from non-lesson aliases, so these identities had no card copy. Added bilingual, example-specific observation prompts at the retained-card registry seam; lesson scenes and fingerprints were not changed. The regression enumerates unique retained card IDs, requires exactly 56, and rejects an empty Slovenian or English prompt.

At 390×844 with English selected and the root font size enlarged to 200%, the Splines worked-join card's inline MathJax prompt exceeded the 328 px copy column and extended to x=505. The prompt had no local MathJax overflow constraint. Added the same bounded, horizontally scrollable inline-math treatment already used for chapter paragraphs, scoped to guided-example prompts. The equation remains accessible in its own scroll area; the page no longer scrolls sideways.

## Verification

- `npx vitest run src/learning/chapter/guidedExamples.test.ts --reporter=dot` — passed, 10 tests, including all 56 unique cards.
- `npx tsc --noEmit --pretty false` — passed.
- Focused Playwright against the Vite loopback preview, exact 1440→390 viewport sequence, English, 200% text — passed: document `scrollWidth` is 390 for a 390 px viewport; removing the scoped rule in-page reproduces `scrollWidth` 505, and restoring it returns to 390.
- The committed focused browser test `a Splines chapter prompt does not widen the page with enlarged text` reached its responsive assertion but its run failed in the shared after-test console guard because the Vite dev server returned 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js`. This is a dev-server base-path mismatch; production-preview recheck remains with the handler.
- Production build / final production-preview smoke were not run here; integration owns them.
