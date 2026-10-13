# Implement Demonstrations visual refinement

**Status:** implementation complete; production build and browser smoke verification remain incomplete because the local Sass dependency and browser networking are unavailable.
**Source spec:** [Demonstrations page visual refinement and repeatable previews](../../specs/demonstrations-visual-refinement.md)

Implement the approved Demonstrations page direction and make generated default-scene previews the only catalog preview source. Preserve the page hierarchy, carousel behavior, family order, route defaults, lesson availability, and navigation. Lesson-linked animation remains out of scope.

## Acceptance criteria

- The page follows the approved mockup with restrained elderflower decoration and graph texture, clearer page/card/preview surfaces, and readable route previews.
- The feature card has a clear primary Demonstration action and quieter optional lesson action. Catalog cards show localized action labels, retain their destinations and accessible focus behavior, and show family names before secondary counts.
- Every active Demonstration has exactly one generated preview from its clean, exact default route, an exhaustive typed asset mapping, and manifest provenance. Capture retains scene containment and per-route coordinate-context checks without relying on a fixed catalog count.
- Page copy and actions work in Slovenian and English. At 390, 724, and 1440 CSS pixels, actions fit, preview details remain legible, and the page has no horizontal overflow. Reduced-motion preference keeps previews static.
- Relevant automated checks, a production build, and browser smoke checks for the changed page and catalog workflows pass; any incomplete coverage is recorded.

## Implementation slices

1. Refine the page presentation, action hierarchy, labels, and topic headings.
2. Make route-default capture and generated catalog asset coverage exhaustive and repeatable.
3. Review the integrated diff, verify the generated assets against representative default routes, and run the scoped page and preview checks.

## Verification

- Passed: `npx tsc --noEmit --pretty false`.
- Passed: `npx vitest run src/demonstrations.test.ts` (9 tests).
- Passed: syntax checks for the capture script and both catalog smoke files.
- Passed: generated-preview validation (34 active demonstrations, 34 map entries, 34 manifest captures, no containment failures); route capture completed from clean storage using the configured system Chrome.
- Passed: `git diff --check` against the initial HEAD.
- Incomplete: `npm run build` stops before bundling because Vite cannot find the installed `sass-embedded` preprocessor dependency.
- Incomplete: browser smoke could not reach the local development server from the available browser or PowerShell networking context; the smoke runner reported the page and catalog workflows as blocked.
- Review: the responsive preview scale check measures the rendered image content area after padding and borders; the final review found no remaining standards or spec findings.
