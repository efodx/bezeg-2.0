# Dedicated demonstrations view

## Scope

Separate the landing page from demonstration selection. The home Explore action and shared header link open `/bezeg/demonstrations`, where students can choose a starting demonstration or browse all mathematical families. Reuse route metadata and the existing warm visual style, with Slovenian and English labels.

## Acceptance criteria

- The home page contains the introduction, illustration, and Explore action; demonstration cards live on their own page.
- Explore and the header Demonstrations link open the dedicated view.
- The view offers the three existing starting demonstrations and all 26 graph routes grouped by family.
- Links are keyboard accessible, have visible focus, and remain usable on narrow screens.
- Existing graph URLs and presets remain unchanged. The new catalog is excluded from graph topic navigation.
- Direct loading and browser back navigation work through the existing client router and Pages fallback.

## Accepted illustrations

On 2026-10-08 the owner selected starting cards A and full-catalog A. Show three graph preview cards followed by six illustrated family panels with compact links to all demonstrations. Use decorative, versioned SVG assets generated from mathematical models; the catalog creates no boards, listeners, or runtime geometry. Keep the drawing style, spacing, focus indicators, and narrow layout from the selected prototype. Translate captions, explanatory copy, and counts through the existing localization system. Derive counts and families from route metadata. No prototype query, switcher, or losing layouts remain in production.

The complete comparison is preserved at `bc87654` on `codex/demonstration-preview-prototypes`. Starting drawings use the existing default control/generating points, with construction and offsets enabled for recognition. Family drawings illustrate a concept rather than all routes' default scenes. Opening links continues to use each demonstration's regular default or selected preset.

## Verification

Check navigation, catalog coverage, and both languages with focused interaction checks. Run TypeScript and the production build; inspect desktop and narrow layouts when browser access is available. No geometry changes are required.

Verified: 11 focused catalog, workspace, and localization tests passed; TypeScript passed; production build passed with existing lint/toolchain warnings. Production browser review confirmed Explore navigation, keyboard activation into the Bézier graph, and desktop/390px catalog layouts without horizontal overflow. Direct catalog entry and back navigation are covered by router interaction tests. Remote GitHub Pages deployment was not changed or reverified; the new route uses the existing fallback.

Illustrated layout A verification: 21 focused navigation/workspace/localization tests passed, including obsolete prototype-query behavior and translated counts; TypeScript and production build passed with existing warnings. Asset generation checks finite coordinates, polynomial endpoints, the De Casteljau result, and the Bernstein partition of unity. Production browser review confirmed nine loaded image assets under `/bezeg`, all 26 links, no live catalog board, both languages, desktop/390px layouts without horizontal overflow, a visible keyboard focus ring, Enter navigation to De Casteljau, back navigation, and refresh. Physical-device and projector review remain separate follow-up work.
