# Elder identity beyond the gutters

Status: round 1 (described below) was rejected by the owner on 2026-11-13 and removed; after three demos the owner chose Literata titles, which are published. On 2026-11-13 he postponed all elder artwork ("we'll do this another day"): the headline shoot, lesson progress stem and contents rail described below are not in the app and are kept only at the local tag `elder-identity-demo-2026-11-13`. Branch `worktree-elder-identity` (worktree `.claude/worktrees/elder-identity`). State and next steps: [state note](../reviews/elder-identity/state.md).

## Problem

The [side botanicals](side-botanicals.md) show only at 1600px and wider on Home, Demonstrations and Learn. Laptops, projectors and phones see either the older outlined sprig (Home below 1600px, the catalogue picker, workspace headings at 12% opacity) or no elder artwork. The site carries three botanical styles: the paper-cut branches, the outlined sprig and the floret icon.

## Owner request (2026-11-13)

The owner approved directions 1 to 3 of a proposal and asked for a preview before acceptance. Deferred to later tasks: an elder drawn from Bézier control points as a Demonstration (direction 4) and a seasonal berry variant (direction 5).

1. One style everywhere: replace the three outlined sprigs with static paper-cut pieces from the side-botanical generator. On Home below 1600px a single branch arches in from the right edge.
2. A kit of small parts from the generator: an elder mark in place of the ochre bar before headings, a stem-and-leaf rule as a divider, lesson step dots that open from bud to floret, a flower head that blooms once when a guided lesson is finished, and elder artwork for the catalogue's no-results state and the chapter playground's loading placeholder.
3. Quiet placements where the graph leads: a static sprig in the chapter header band and a low hedge at the end of the page. No animated branches in workspaces, lessons or chapter pages (side botanicals decision 2 stands).

## Decisions (handler, 2026-11-13; the owner may overrule at the preview)

- **Source of the artwork.** `src/elderArt/elderParts.ts` builds every piece from the primitives of `src/sideBotanicals/elderGeometry.ts`, which now exports them. A `density` argument draws fewer, larger florets for small artwork; the default leaves the gutter output unchanged. Rejected: hand-drawn SVG, which would be a fourth style.
- **Static.** The new pieces do not sway. The only motion is the single bloom at lesson completion and a pulse on the loading placeholder, both off under reduced motion.
- **One botanical motif per view.** At 1600px and wider the Home sprig and the hedge on Home and Learn are hidden, because the gutters carry the motif there.
- **Hedge.** Upright leafy shoots with flower heads on about two in five, spanning the content column and cropped at its sides on narrower screens. A first version with sparse stalks read as meadow weeds and was rejected in a rendered comparison.
- **Decorative only.** Every piece is `aria-hidden`, takes no pointer events and adds no text, so there are no localization changes. Lesson progress text stays; the dots only accompany it.

## Acceptance criteria

- No outlined sprig remains: `welcome-botanical`, `workspace-botanical` and `demonstration-picker-botanical` draw generated paper-cut art or are removed, with their old stylesheet rules.
- At 1366, 820 and 390px in both languages, Home, Demonstrations, Learn, one chapter page, one workspace and one guided lesson show no horizontal document overflow, and no artwork covers text or intercepts a click.
- At 1600px and wider Home and Learn show the gutters and neither the sprig nor the hedge.
- A workspace in presentation mode shows no elder artwork.
- With reduced motion nothing animates.
- The same arguments give identical path data for each builder (unit test); the gutter artwork is unchanged (existing tests).
- Typecheck, lint, the affected unit tests and the production build pass. A focused browser check covers the routes above; results are recorded in the state note.
- The owner reviews a running preview before the branch is published.

## Title typography (Literata)

Owner decision, 2026-11-13: titles change site-wide to the serif Literata, self-hosted in `src/fonts/literata/` (variable roman, Latin and Latin Extended subsets, SIL OFL 1.1). A design exploration with Fraunces was tried first and rejected for its letterforms.

- Titles in the header wordmark, Home, Demonstrations, catalogue cards, picker, Home carousel, Learn, chapter pages, activity context, guided lesson frames and the workspace heading use `--bezeg-font-display` and four size tokens (hero, page, section, item) from `src/shellTokens.css`. The Home headline is weight 700, other titles 600 to 700. Running text, controls and MathJax keep their faces.
- The older outlined drawings on Home, the workspace heading and the picker are removed; the headline shoot and the lesson stem stay (next section).
- Acceptance: every title renders in Literata with correct Slovenian letters (`document.fonts.check('700 40px Literata', 'jčšž')`), no title is clipped, no horizontal overflow at 1366, 820 and 390px, and no request goes to a font CDN.

## Headline shoot behind the text

Owner decisions, 2026-11-13: the plant that grows from the Home headline's full stop is **always behind the text and never over it**; the growth along the stem is approved; a stem that reacts to the pointer is deferred. An earlier version wove the stem in front of the last line and behind the first; the owner rejected the part in front.

- `buildHeadlineShoot` (`src/elderArt/elderParts.ts`) draws in hundredths of the headline's `em` with its origin on the full stop. The stem is three cubic segments joined without a corner: it stands up from the stop in the clear space after the last line, leans in behind the end of the line above, comes out over that line and arches to the right, where it carries one flower head beside the headline. Four leaf pairs sit along it.
- `ElderTitleShoot` (`ElderArt.tsx`, `ElderArt.css`) renders one SVG with `z-index: -1` inside the page's stacking context. Nothing is drawn in front of the text.
- Growth, once per load: a mask stroke reveals the stem from the stop (`SHOOT_GROWTH`: 300ms delay, 2800ms, slow at both ends so the start at the stop is seen); each leaf unfolds from its base at the moment the stem reaches it (`shootGrowthTime`); the rays fan out and the florets open in four groups. Afterwards leaves and head sway and the floret groups drift slightly, like the gutter branches. Under reduced motion the plant is fully grown and still.
- Fit: the plant is drawn at 82% about the stop at 700px and below, where the header is closer, and hidden at 480px and below, where the last line can fill the width and leave no room beside the stop. `index.html` preloads the two Literata files so the stop is in place before the stem starts.
- Reasons for the shape (handler decision): with everything behind the text, a stem that leaves the stop towards the text disappears at once and the plant no longer reads as growing from the stop. Leaving upward keeps the root visible; passing behind the end of the line above keeps the plant in the headline instead of beside it. Rejected: the earlier path kept wholly behind (root hidden behind the last letter); a wider turn (needs more room above the headline than the header leaves); showing it on phones (it fits or is cut off depending on how the headline wraps).
- Known limits: the plant only touches the text where the first line is about as long as the last; where a language or width makes the first line much shorter it stands beside the headline. Seen from far away the stem and its turn can recall a question mark above the stop.
- Lesson progress stem and chapter contents rail (handler decision, 2026-11-13): the lesson progress stem stays, because it shows progress that the panel otherwise only states in words. The chapter contents rail is removed: its leaves were cut off at the list's edge and read as a rendering fault, and the line repeated the highlighted current item.
- Acceptance: one SVG and no element in front of the text; no horizontal overflow at 1680, 1366, 820, 600 and 390px in both languages; the plant does not reach the header; with reduced motion nothing animates; unit tests cover determinism, the joined stem, leaf order and the growth times.
