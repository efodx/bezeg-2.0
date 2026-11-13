---
name: Bezeg web shell and homepage
description: The existing cream, green, and elderflower interface for exploring mathematical curves.
colors:
  canvas: "#f7f5e9"
  panel: "#fffdf5"
  preview-panel: "#fffdf6"
  ink: "#19372f"
  ink-secondary: "#526152"
  label: "#647557"
  label-selected: "#526152"
  action: "#244c37"
  action-hover: "#355c3d"
  on-action: "#fff"
  choice-ink: "#29452e"
  choice-selected: "#edf2e7"
  choice-hover: "#f8f9f4"
  rule: "#d6dccb"
  ochre: "#b88a43"
  lesson-ink: "#885512"
  focus: "#456db0"
  header-focus: "#577cc3"
rounded:
  action: "8px"
  choice: "10px"
  preview: "16px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.action}"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  choice-selected:
    backgroundColor: "{colors.choice-selected}"
    textColor: "{colors.choice-ink}"
    rounded: "{rounded.choice}"
---

# Bezeg design system: existing web shell and homepage

## Overview

This records the header, homepage and shared Demonstration workspace, with separate guidance for the learning surfaces below. The approved botanical studio direction pairs scholarly display typography with a calm mathematical instrument: the Bezeg name, elderflower identity, warm cream surfaces, green actions, and restrained ochre accents. Desktop exploration and classroom projection take priority; essential workflows remain available with touch and keyboard on smaller screens.

The source of the implemented shell roles is `src/shellTokens.css`, using the `--bezeg-shell-` prefix. Existing workspace variables retain their separate scope. No dark-mode behavior is implied by this document.

## Colors

Canvas and panel roles deliberately differ: Home and workspace use `canvas`, the header uses `panel`, and carousel cards use `preview-panel`. Preserve those distinctions. The role suffixes in the frontmatter match CSS custom properties in `src/shellTokens.css`; that stylesheet also owns botanical, media, border, and scrollbar roles.

Use `ink` for headings, `ink-secondary` for explanatory copy, `action` for primary links, and `ochre` for the section accent. The lesson action uses `lesson-ink`. Focus uses a distinct blue, retaining the existing header/home variants.

Category labels use `label` on the preview panel. On selected tiles, use `label-selected`: the old label color against the selected surface gave only 4.369:1 contrast. The selected role gives approximately 5.78:1. Maintain at least 4.5:1 for these small labels across selected, hovered, and focused states. Focus outlines do not replace a readable text foreground.

The Demonstrations catalogue (`DemonstrationsPage.css` and the shared `DemonstrationCollection.css`) takes its colours from the same `--bezeg-shell-*` roles as Home and Learn. Card family labels, topic counts and the search placeholder use `label` (`label-selected` on the pressed topic), and the search field and phone topic select use `field-rule` for their border. The workspace picker dialog's own frame (`DemonstrationPicker.css`) still carries its literal values.

## Typography

The site has one display face, self-hosted Literata (owner decision 2026-11-13; it replaces the Newsreader of the first botanical studio pass). The brand, Home headline, featured demonstration title and workspace title use it through `--bezeg-font-display`, like every other title: see [title typography](#title-typography-literata) for the family, files and license. It supports Slovenian diacritics and requires no external font requests. Navigation, form controls, labels, breadcrumbs, counts and supporting copy retain the existing system sans stack.

Titles follow one rule, held as tokens in `src/shellTokens.css`: the larger the role, the lighter the weight, the tighter the tracking and the closer the lines.

| Role | Size | Weight | Tracking | Leading |
| --- | --- | --- | --- | --- |
| hero | `clamp(2.625rem, 1.6rem + 4.6vw, 5rem)`: 42px at 320px wide, 43.5px at 390px, 72.7px at 1024px, 80px from 1183px | 550 | -0.022em | 1.05 |
| page | `clamp(2.25rem, 4.6vw, 3.75rem)`: 36 to 60px | 550 | -0.018em | 1.08 |
| section | `clamp(1.4rem, 2.2vw, 1.7rem)`: 22.4 to 27.2px | 600 | -0.01em | 1.2 |
| item | `clamp(1.2rem, 1.8vw, 1.42rem)`: 19.2 to 22.7px | 600 | -0.003em | 1.25 |

The Home headline takes the hero role on a balanced 18ch measure, with no separate phone size. A -0.04em left margin hangs its first stem on the copy's edge and `clamp(16px, .3em, 24px)` separates it from the lede. It sets on two lines from 724px up and, on phones, on two lines in English and three in Slovenian, where it breaks at its comma. The Home section heading takes the section role. Featured titles are 27–34px (25px at 700px and below, 23px at 360px and below), weight 600 with section tracking, 1.15 leading and a balanced wrap, with 15px explanatory text. Workspace titles use weight 550 with page tracking and leading on a 36–56px scale (32–44.8px at 700px and below), with 7px below the title (9px at 700px and below). The wordmark is 30px (25px narrow), weight 600 with -0.01em tracking.

The Home lede is 19px with 1.5 line height (18px at 820px and below, 16px at 700px and below), balanced and at most 42rem wide, which keeps it on one line on desktop in both languages; the catalog action follows 28px below it (24px, then 20px, at the same widths). The Demonstrations and Learn ledes are 18px with 1.5 line height (16px at 700px and below). The family label follows the featured title, rather than acting as an eyebrow. Category labels remain secondary at 10–11px and retain the contrast safeguards above. Existing bilingual copy is unchanged.

## Layout

The homepage content has a 1100px maximum width and natural vertical flow. The featured card uses a 40% artwork / 60% copy split on desktop (at least 300px for media), a 320px media stage, and a continuous cream preview-panel surface without a divider. Preserve the complete artwork with proportional containment. See [homepage preview spacing](docs/specs/homepage-preview-spacing.md). The intro is one left-aligned column at every width: heading, copy, then the catalog action under the copy. The intro holds no drawing and reserves no space for one: the outlined elderflower was removed on 2026-11-13, leaving the header mark and, at 1600px and above, the side botanicals to carry the motif. Below 700px, the preview and text stack, with page padding reduced to 16px horizontally. At 480px and below the featured card's two actions stack full width. Below 700px the prompt reserves its longest line count so the selector rail does not move between slides. The rail runs to the card's edges. Preserve the horizontal selector rail's internal scrolling; the document must not overflow horizontally. Keep visible focus reachable within that rail.

The workspace aligns the graph and 320px inspector in a two-column grid within a 1280px measure, with a 22px gap. At 1100px the heading and actions stack; at 900px and below the learning prompt follows the graph, then the inspector flows naturally with no inner scroll. Desktop keeps the existing inspector content as its one scroll owner, with an explicit scrollbar and stable gutter. Paint containment keeps its clipped descendants from extending the document. The graph owns its mathematical grid; the surrounding canvas stays quiet. Navigation controls sit below the graph, with pan, zoom and fit visually separated.

## Elevation & Depth

The featured card uses the soft two-part shadow in `--bezeg-shell-shadow-card`; action links use `--bezeg-shell-shadow-action`. The 2026-11-13 botanical studio refinement removes the decorative page-wide graph grid, the featured card's thick green rail and standalone ochre heading dashes. Mathematics owns the grid; Home preserves its real curve previews. Its intro no longer carries the outlined elderflower drawing (removed 2026-11-13): at 18 to 32% opacity it read as a watermark beside the headline, and its outline style differed from the filled side botanicals. The earlier ornament approvals in `docs/specs/homepage-visual-flair.md` are superseded for these surfaces by `docs/specs/botanical-studio-refinement.md`.

## Shapes

Home uses an 8px action radius, 10px choice radius, 18px featured preview radius, and circular previous/next controls. Primary controls retain at least 44px height; selector choices retain at least 72px height and lead with a 52×40 thumbnail of their demonstration preview (`media-rule` border, `choice-rule-selected` when pressed) instead of an index. Workspace graph and inspector use continuous 1px frames with a 16px radius and no colored caps or shadow. Inspector tabs sit in an inset segmented group; selection uses the shared dark control fill. Workspace actions and navigation keep 44px targets on narrow layouts and coarse pointers. Presentation retains its navy and cream palette.

## Components

The shared header contains the brand, Learning and Demonstrations links, and the language selector. The homepage contains its existing introduction, catalog action, featured demonstration, selection rail, and attribution footer. The featured card's metadata and actions change together.

Retain carousel timing, manual takeover, temporary hover/focus pauses, visibility guards, and reduced-motion behavior. Each eligible switch plays a single silent clip pass. Hover, focus and touch viewport visibility can continue playback. The introduction is type alone. The introductory elderflower that the [annotation follow-up](docs/specs/annotated-ui-follow-up.md) gave its own space beside the copy was removed on 2026-11-13.

## Guided lesson reading overlay

The lesson overlay uses the warm panel, ink, secondary ink, rule and forest action roles above. It is a lean reading card (34rem on desktop): the utility row holds a grip, the lesson title when it differs from the visible page heading, and the chapter return, Hide, and Exit actions. The title truncates on one line and the utilities stack at narrow panel widths. The frame heading is 22px Literata. Notes and worked examples are set apart by tint alone, without a nested border. The row below the utilities holds progress and navigation until the panel's width stacks them. Next carries the primary action treatment. Keep natural content height, a bounded scrolling reading region and persistent actions on narrow or short screens. Programmatic focus on the reading section does not draw a perimeter around the panel; interactive controls retain visible keyboard focus.

On wide boards the card starts at the upper left. Default 2D lesson scenes pan toward the uncovered plot at their starting scale, with the normal Orodja column alongside. The pan tapers away on ultrawide plots to keep the construction closer to the card. An authored scene view or 3D camera takes precedence. Narrow boards use the centered home.

The open panel (by its heading row) and the closed tab can each be dragged anywhere within the visible graph; the grip and the tab also move with arrow keys. A lifted shadow while dragging is the only motion. Once either has been moved, they travel together: hiding leaves the tab at the panel's top-left corner and reopening opens the panel at the tab, clamped to the graph. Positions last for the lesson and reset when another lesson starts. See [the refinement specification](docs/specs/lesson-panel-visual-refinement.md).

## Learn landing

The Learn landing (`/learn`) matches the shell: shell canvas and the 48px graph grid backdrop, all colours from `--bezeg-shell-*` tokens (no hex in landing rules). The page opens with a Literata heading in the page role (no eyebrow: Home, Demonstrations and Learn dropped theirs on 2026-11-13 because the header already names the brand and the active view), merged copy, a count line (chapters, sections, guided examples, with correct Slovenian plurals) and the start action to the right on desktop. Page, strand and topic headings are Literata ([title typography](#title-typography-literata)); labels, counts and copy stay sans. Each strand is a card (preview panel surface, 1px media rule, 16px radius, soft shadow) under an ochre-bar heading; rows inside are separated by one hairline and tint with the shell choice-hover colour on hover, with a thin path rule through the thumbnail centres on desktop. The read action is a bold text link with an arrow, not an outlined button, sharing one wrapped line with the Contents disclosure. At 700px and below the gutter is 16px, the 92px thumbnail sits beside the title, and the Contents counts become screen-reader-only so the page stays short. Focus uses the shell focus token with a 3px outline.

## Do's and Don'ts

- Use semantic shell roles for new states on the audited surfaces and check their foreground/background pairing.
- Preserve the elderflower header mark and side botanicals, mathematical previews, bilingual copy, clear focus, and keyboard access.
- Keep geometry and graph colors independent from this shell palette.
- Do not introduce marketing claims, replacement artwork, further typography changes, dark mode, or new carousel behavior through this document.

## Learning map and chapter wayfinding

`/learn` is an ordered path grouped into strand headings with a hairline rule; rows carry no step numbers or markers because the order is only suggested (the start action names the starting topic). On desktop a 1px `rule` line runs between the row thumbnails so the previews read as stations on the path; below 700px rows are separated by `rule` hairlines instead. Rows carry a small `preview-panel` thumbnail with a `media-rule` border, a Literata heading link, `ink-secondary` purpose text, a quiet `panel` read action with a `control-rule` border, and a native contents disclosure with an ochre CSS chevron. Keep filled `action` treatment for the single start action. Chapter readers show a breadcrumb with the chapter position, previous/next chapter beneath the desktop contents, and a sticky narrow contents bar with the section position. See [the redesign spec](docs/specs/learn-navigation-redesign.md).

## Chapter reader

Chapter readers (`/learn/<chapter>`) sit on the shell canvas and take every colour from `--bezeg-shell-*` roles through the `--chapter-*` aliases at the top of `ChapterPage.css`; the stylesheet holds no hex colours. Body type is `--chapter-text`: 16.4px up to about 1500px of viewport width, growing to 19.2px at 1920px for projection, and the contents rail, headings, notes and card copy are sized from it. Introduction, prerequisites and prose share one measure (`--chapter-measure`, about 72 characters); formula bands, guided-example cards and playgrounds keep the full article width. The current contents entry is marked by ink colour, the `choice-selected` tint and a 1px ochre rule, never by weight, so wrapped titles stay in place while reading. Guided-example cards use the `panel` surface, which is the background of the captured previews, with a 1px `rule` border and a 16px radius; the filled `action` button is the card's one action. The chapter ends with two bordered link blocks, previous on the left and next on the right (stacked below 520px), each a small label with a drawn arrow above a Literata title; the link text stays `<label>: <title>`. While a chapter is open the document title is `<chapter title> · Bezeg`. Focus uses the shell focus token with a 3px outline. See [the polish spec](docs/specs/chapter-reader-polish.md).

## Guided lesson reading panel

The expanded graph overlay uses the shell's opaque `panel`, `ink`, `ink-secondary`, `rule`, `action` and `focus` roles. Its desktop width is bounded to a reading measure and inset from the graph edge. The current-frame heading leads the explanation. Frame type accompanies step/frame progress in the navigation row above the reading area. The panel's accessible name always includes the full lesson title. Keep 44px action targets and bounded internal prose/formula scrolling, including enlarged text. The minimized graph tab and lesson interaction remain unchanged. See [the refinement spec](docs/specs/lesson-panel-visual-refinement.md).

## Graph controls

Graph controls are the quieter tier below the shell's primary actions. Their values live once, as `--bezeg-control-*` custom properties in `src/inputs/controlTokens.css`; shared components in `src/inputs/` and the inspector rules in `src/graphs/base/WorkspaceControls.css` read them, and graph CSS does not set a control's height, radius, border or focus ring. Presentation mode re-binds only the colour tokens. See [graph control visual polish](docs/specs/control-visual-polish.md) for the reasons and rejected alternatives.

| Token | Normal | Presentation |
| --- | --- | --- |
| `height` | 38px; 44px on coarse pointers | same |
| `radius` | 6px; button groups round only their outer corners | same |
| `border` | 1px `#767f6c` (4.1 : 1 on the panel) | `#8f9bb3` |
| `ink` / `surface` | `#20372d` / `#fffdf5` | `#f8f0d7` / `#20304a` |
| `selected-ink` / `selected-surface` | white / `#19372f` (pressed and selected buttons) | same |
| `focus` | 3px `#456db0`, offset 2px | `#f2c66d` |
| `font-size` | 0.875rem; text fields `field-font-size` 1rem so mobile browsers do not zoom | same |
| `gap` | 8px | same |

Buttons, button groups, number and coordinate fields, selects, the curve picker and mode buttons share height, radius, border and focus. Pressed and selected buttons take the dark selected fill in both themes. Switches mark immediate display toggles and checkboxes mark choices within a set; both use the focus token, and their box sizes, sliders, count setters and disclosures move to the tokens in the stream's later steps. Every control keeps at least 4.5 : 1 text and 3 : 1 boundary and focus contrast in both themes, and at least 44px targets on touch (a checkbox or switch through its full-width label row).

## Title typography (Literata)

Titles are set in Literata, site-wide. It replaced the system sans of page and strand headings and the Georgia or extra-heavy sans of older headings. See [elder identity](docs/specs/elder-identity.md#title-typography-literata).

- **Two voices.** Literata (variable, SIL OFL 1.1, self-hosted in `src/fonts/literata/`, Latin and Latin Extended, roman only) names things: the wordmark, page titles, chapter and section titles, demonstration titles, lesson frame titles. The system sans operates things: controls, labels, breadcrumbs, counts and running copy. Mathematics stays in MathJax's serif.
- **Roles.** `src/shellTokens.css` holds the `@font-face` rules (weights 200 to 900, `font-display: swap`), the family (`--bezeg-font-display`, falling back to Georgia) and, for each of four roles (hero, page, section, item), a size, a tracking and a leading token; [Typography](#typography) lists their values. Two weight tokens cover every title: `--bezeg-type-display-weight` (550) for the one `h1` of a page, in the hero or page role, and `--bezeg-type-title-weight` (600) for every smaller title and the wordmark. Optical size follows the font size (`font-optical-sizing: auto`). No request goes to a font CDN.
- **Own sizes, shared rhythm.** A title that needs its own size keeps it and takes its role's weight, tracking and leading from the tokens.
  - Page role: the Demonstrations and Learn titles (the page size itself; Learn at most 17ch), the workspace title (36–56px) and the chapter title (33.6px up to 3.1 × chapter text, 50.8px at 1440px; at most 24ch).
  - Section role: Home, Learn strand and picker dialog headings (the section size itself), chapter section headings (24px up to 2 × chapter text, 32.8px at 1440px), and the tracking of the featured Home title and the wordmark.
  - Item role: Learn topic headings and the empty-catalogue heading (the item size itself), catalogue card titles (19px), chapter exploration and source headings (1.3 × chapter text, 21.3px), chapter neighbour titles (1.15 × chapter text, 18.9px), the chapter activity heading and lesson completion title (22.4px), and the lesson frame heading (22px on its own 1.2 leading, so the lesson panel keeps its height).
- **Wrapping.** Titles that can run to several lines use `text-wrap: balance`; the Learn lede uses `text-wrap: pretty`. To change how titles sit, change a role token, not one page.
