# Chapter reader polish

## Scope

A visual refinement of the Study chapter readers (`/bezeg-2.0/learn/<chapter>`, both `ChapterPage` and `FamilyChapterPage`), requested by the owner on 2026-11-12 with `/learn/convexity-hulls` as the example. It keeps the incumbent identity recorded in [DESIGN.md](../../DESIGN.md): cream surfaces, green actions, ochre accents, Georgia as the reading voice. Chapter copy, section order, routes, guided-example behaviour, reading-position restore and stored presets do not change.

It builds on [the navigation redesign](learn-navigation-redesign.md) and [the landing alignment](learn-landing-visual-alignment.md), and takes the presentation items from the 2026-11-12 critique of `/learn/sweep-algorithms` (intro measure, projection type size, neighbour links, document title). The critique's content and keyboard items (formula tab stops, the draft closing note, paragraph density) are outside this pass.

## Decisions

- **Shell canvas and roles.** The reader used the workspace canvas (`#f4f0df`) under a shell-canvas header, and about 25 one-off greens. It now uses the shell canvas and takes every colour from `--bezeg-shell-*` roles through a small set of `--chapter-*` aliases. Reason: `/learn` and the header already use the shell roles, so the chapter reads as the same destination. The alternative, keeping the workspace canvas because guided examples open in the workspace, leaves the two-tone page.
- **One reading measure.** Introduction, prerequisites and prose share `--chapter-measure` (38 times the body size, about 72 characters). Formula bands, example cards and playgrounds keep the full article width.
- **Projection size.** Body type is 16.4px up to about 1500px of viewport width and grows to 19.2px at 1920px; the article, contents rail and headings scale with it. Reason: classroom projection is a priority and the fixed size left wide empty gutters.
- **Contents rail.** The current section is marked by ink colour, tint and the 1px ochre rule, without a weight change. Reason: bold re-wrapped two-line titles and moved the items below while reading.
- **Guided-example cards.** The card takes the `panel` surface, which is the background of the captured previews, so the figure sits on the card without a visible patch. The rule above each card is removed; the card border is the only separator.
- **End of chapter.** Previous and next chapter are two bordered link blocks (label above a Georgia title) instead of two inline underlined links. The link text is unchanged for assistive technology.
- **Document title.** A chapter sets `<chapter title> · Bezeg` while it is open and restores the previous title on leaving. This is a new behaviour with no stored state.

No route, preset or storage change. No breaking change.

## Acceptance

- The reader uses the shell canvas; `ChapterPage.css` contains no hex colours.
- At 1366px the introduction, prerequisites box and paragraphs have the same width; at 1920px body type is at least 19px.
- No horizontal document overflow at 390px, 1366px and 1920px in Slovenian and English, including 200% text enlargement at 390px.
- Contents entries do not move when the current section changes.
- Previous/next links keep the text `Prejšnje poglavje: <title>` / `Naslednje poglavje: <title>` and at least 44px targets.
- Typecheck, lint, the learning unit tests and the production build pass; the chapter rows of the unified-learning smoke pass.
