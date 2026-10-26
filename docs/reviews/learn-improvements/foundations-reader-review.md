# Foundations reader review

Independent engineering, UI, and accessibility source review of the Foundations extension on base `75536ec62961c0302c67430b91970249f8f165c1`.

## Findings

No actionable source-level findings.

- The typed optional `figures` and `investigationPrompts` fields are consumed only when supplied; other family chapter data and its rendered sections follow the prior path. The shared rendering does not import or mount a board. Existing `typesetMath` cleanup remains in place, and its effect depends on language, so formulae and newly added caption/prompt math are typeset after a language change.
- Foundations figures reuse the catalog asset imports. Their bilingual alt text and captions describe the pictured cubic Bernstein basis and complex product; the caption explicitly distinguishes the quadratic worked example. Existing chapter figure CSS gives images full available width, automatic height, and `object-fit: contain`.
- The prompts name controls or visible results and provide an interpretation. Demo destinations retain their existing paths and append `?learn=1` only when `isGuidedLessonAvailable` is true; the guided label is gated by that same condition. All prompted Foundations demonstrations currently have guided lessons.
- The renderer test checks the two actual asset URLs, dimensions, lazy loading, captions, bilingual text, and guided links. The implementation note reports that disabling the renderer made the figure-count assertion fail, providing useful non-vacuity evidence. I inspected the test source but did not rerun it.

## Coverage limits

This was a source review only. Desktop, narrow-width, enlarged-text, loaded-image/formula, language/deep-link, and graph-action behavior remain for the handler's delegated browser verification. No browser result is claimed here.
