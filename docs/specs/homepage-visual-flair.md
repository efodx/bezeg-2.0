# Homepage visual identity refinement

Status: approved for implementation on 2026-10-15.

## Scope and direction

Bring the Demonstrations catalog's atmosphere to the homepage: warm cream, a faint fading graph grid, quiet elderflower line art, a more spacious and prominent introduction, an ochre section accent, and a green leading rail on the featured carousel card. The owner selected the generated homepage concept in the conversation and requested implementation. The image is directional; existing production logo, preview assets, localized content, footer, and carousel behavior are authoritative.

Keep this a homepage presentation change. Preserve routes, selection and autoplay behavior, reduced-motion support, lesson links, footer copy, mathematical images, stored data, and the catalog's appearance. Reuse the existing botanical SVG through a small shared decorative component if needed, preserving its catalog presentation. Do not add dependencies, new copy, or generated image assets to the shipped UI.

## Acceptance criteria

- The homepage uses the catalog's cream and green identity, faint grid fading toward the footer, and noninteractive, assistive-technology-hidden botanical decoration.
- The headline has a deliberate readable measure and stronger scale, with generous spacing and a clear catalog action. Decoration does not compete with text or obscure controls.
- The starter heading has a restrained ochre accent and the featured card has a dark green leading rail. Existing graph previews remain dominant and uncropped.
- At 390, 724, and 1440 CSS pixels, both languages fit without document overflow; actions, carousel tiles, and keyboard focus remain reachable. Enlarged text remains usable.
- All existing homepage content, destinations, selection/manual controls, reduced motion, and catalog behavior remain intact. No mathematical or persistence behavior changes.

## Verification

Run focused homepage/carousel and catalog component tests, TypeScript checking, and the production build. Use the smoke-tester skill's focused-validation lane for this route-local presentation change: review the homepage at the three widths, both languages, keyboard operation, carousel selection, graph/lesson destinations, and a catalog visual regression check if botanical markup is extracted. Record actual results and limits here.

## Implementation evidence

Implemented in `WelcomePage.tsx` and `WelcomePage.css`; the existing botanical paths are reused locally with homepage-owned styling, leaving catalog markup and CSS untouched. A real 5px border keeps the featured rail visible over child backgrounds. The headline uses a 17ch measure and responsive scale; no copy, routes, preview assets, or carousel logic changed.

On 2026-10-15, the two focused component suites passed (12 tests), TypeScript passed, and the production build passed with existing dependency warnings. The initial sandbox build could not resolve installed Sass; running the same build outside the sandbox succeeded without dependency changes.

Handler focused browser validation used the current checkout's production build at `http://127.0.0.1:4185/bezeg-2.0/` in the in-app browser. Slovenian and English were reviewed at 390, 724, and 1440 CSS pixels with no document-level horizontal overflow. Preview images loaded; narrow layouts stacked the card, kept actions reachable, and retained the scrollable selector rail. Space selected Bernstein and showed its pressed state, updated preview/actions, and visible 3px focus outline. Autoplay advances were observed before manual selection. The catalog shortcut, brand return, Bézier graph action, and Bernstein lesson action opened their expected views. Language was restored and the preview stopped after verification.

## Amendment 2026-11-13: catalog action position (main views polish)

The "Vse demonstracije →" action used to sit in a second column to the right of the headline on desktop, where it floated between the copy and the botanical (about x 720–920 of the 1100px column at 1366px) with nothing to anchor it. It now sits under the introduction in the left column at every width, the arrangement already used below 820px, and carries `--bezeg-shell-shadow-action` like Learn's start action. The botanical keeps its corner; at 1600px and above, where it is hidden, the intro no longer reserves 250px for it. The headline uses `text-wrap: balance`. Rejected alternative: anchor the action at the right edge under the botanical, which overlaps the stem between 820 and 1000px. Learn keeps its right-side start action because the strand card edge anchors it. Handler decision under the owner's standing "decide and report" preference. The same pass made the page's minimum height match the 72px desktop header (the 64px value produced an 8px phantom scroll at 1920×1080).

Limits: physical touch devices, classroom projection, enlarged-text settings, a comprehensive accessibility audit, full workspace smoke, and hosted CI/deployment were not part of this local focused check. Reduced-motion behavior remains covered by the existing component suite. Main-handler diff review found no additional actionable issue.
