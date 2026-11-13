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

This records the incumbent header and homepage, not a redesign or a complete specification of the mathematical workspace. The approved direction is a calm educational interface with the Bezeg name, elderflower identity, warm cream surfaces, green actions, and restrained ochre accents. Desktop exploration and classroom projection take priority; essential workflows remain available with touch and keyboard on smaller screens.

The source of the implemented shell roles is `src/shellTokens.css`, using the `--bezeg-shell-` prefix. Existing workspace variables retain their separate scope. No dark-mode behavior is implied by this document.

## Colors

Canvas and panel roles deliberately differ: the header/home canvas uses `canvas`, header controls use `panel`, and carousel cards use `preview-panel`. Preserve those distinctions. The role suffixes in the frontmatter match CSS custom properties in `src/shellTokens.css`; that stylesheet also owns botanical, media, border, and scrollbar roles.

Use `ink` for headings, `ink-secondary` for explanatory copy, `action` for primary links, and `ochre` for the section accent. The lesson action uses `lesson-ink`. Focus uses a distinct blue, retaining the existing header/home variants.

Category labels use `label` on the preview panel. On selected tiles, use `label-selected`: the old label color against the selected surface gave only 4.369:1 contrast. The selected role gives approximately 5.78:1. Maintain at least 4.5:1 for these small labels across selected, hovered, and focused states. Focus outlines do not replace a readable text foreground.

The Demonstrations catalogue (`DemonstrationsPage.css` and the shared `DemonstrationCollection.css`) takes its colours from the same `--bezeg-shell-*` roles as Home and Learn. Card family labels, topic counts and the search placeholder use `label` (`label-selected` on the pressed topic), and the search field and phone topic select use `field-rule` for their border. The workspace picker dialog's own frame (`DemonstrationPicker.css`) still carries its literal values.

## Typography

Keep the existing system sans-serif stack from `src/index.css`. The brand uses a 700-weight system sans at 23px on desktop and 20px below 700px. The homepage heading uses weight 700, line height 1.06, a 17ch measure, and `clamp(34px, 4.2vw, 60px)` on desktop. The mobile override remains in `WelcomePage.css`.

Introductory copy is 17px with 1.55 line height (15px on narrow screens); the section heading is 22px (20px narrow). Carousel titles are 25px (21px narrow), with 15px explanatory text. Category labels are intentionally secondary at 10–11px and need the contrast safeguards above. This record does not authorize new fonts or changes to existing copy.

## Layout

The homepage content has a 1100px maximum width and natural vertical flow. The featured card uses a 40% artwork / 60% copy split on desktop and a continuous cream preview-panel surface, including nested media, without a divider. Preserve the complete artwork with proportional containment. See [homepage preview spacing](docs/specs/homepage-preview-spacing.md). The intro is one left-aligned column at every width: heading, copy, then the catalog action under the copy; the elderflower keeps its corner and its reserved space, which is dropped at 1600px and above where the art is hidden. Below 700px, the preview and text stack, with page padding reduced to 16px horizontally. At 480px and below the featured card's two actions stack full width. Below 700px the prompt reserves its longest line count so the selector rail does not move between slides. The rail runs to the card's edges. Preserve the horizontal selector rail's internal scrolling; the document must not overflow horizontally. Keep visible focus reachable within that rail.

## Elevation & Depth

The featured card uses the existing soft two-part shadow in `--bezeg-shell-shadow-card`; action links use `--bezeg-shell-shadow-action`. Preserve the approved faint graph grid, botanical artwork, and 5px green leading rail. Their purpose and approval are recorded in `docs/specs/homepage-visual-flair.md`.

## Shapes

Keep the observed 8px action radius, 10px choice radius, 16px preview radius, and circular previous/next controls. Primary controls retain at least 44px height; selector choices retain at least 72px height and lead with a 52×40 thumbnail of their demonstration preview (`media-rule` border, `choice-rule-selected` when pressed) instead of an index.

## Components

The shared header contains the brand, Learning and Demonstrations links, and the language selector. The homepage contains its existing introduction, catalog action, featured demonstration, selection rail, and attribution footer. The featured card's metadata and actions change together.

Retain carousel timing, manual takeover, temporary hover/focus pauses, visibility guards, and reduced-motion behavior. Each eligible switch plays a single silent clip pass. Hover, focus and touch viewport visibility can continue playback. The introductory elderflower is a decorative accent with its own space beside the copy on wide layouts. At narrower widths it yields space to the copy and controls. See the [annotation follow-up](docs/specs/annotated-ui-follow-up.md).

## Guided lesson reading overlay

The lesson overlay uses the warm panel, ink, secondary ink, rule and forest action roles above. It is a lean reading card (34rem on desktop): the utility row holds a grip, the lesson title when it differs from the visible page heading, and the chapter return, Hide, and Exit actions. The title truncates on one line and the utilities stack at narrow panel widths. The frame heading is 20px. Notes and worked examples are set apart by tint alone, without a nested border. The row below the utilities holds progress and navigation until the panel's width stacks them. Next carries the primary action treatment. Keep natural content height, a bounded scrolling reading region and persistent actions on narrow or short screens. Programmatic focus on the reading section does not draw a perimeter around the panel; interactive controls retain visible keyboard focus.

On wide boards the card starts at the upper left. Default 2D lesson scenes pan toward the uncovered plot at their starting scale, with the normal Orodja column alongside. The pan tapers away on ultrawide plots to keep the construction closer to the card. An authored scene view or 3D camera takes precedence. Narrow boards use the centered home.

The open panel (by its heading row) and the closed tab can each be dragged anywhere within the visible graph; the grip and the tab also move with arrow keys. A lifted shadow while dragging is the only motion. Once either has been moved, they travel together: hiding leaves the tab at the panel's top-left corner and reopening opens the panel at the tab, clamped to the graph. Positions last for the lesson and reset when another lesson starts. See [the refinement specification](docs/specs/lesson-panel-visual-refinement.md).

## Learn landing

The Learn landing (`/learn`) matches the shell: shell canvas and the 48px graph grid backdrop without the botanical art, all colours from `--bezeg-shell-*` tokens (no hex in landing rules). The page opens with a bold system-sans heading (no eyebrow: Home, Demonstrations and Learn dropped theirs on 2026-11-13 because the header already names the brand and the active view), merged copy, a count line (chapters, sections, guided examples, with correct Slovenian plurals) and the start action to the right on desktop. Page and strand headings are sans; chapter titles stay Georgia as the reading voice. Each strand is a card (preview panel surface, 1px media rule, 16px radius, soft shadow) under an ochre-bar sans heading; rows inside are separated by one hairline and tint with the shell choice-hover colour on hover, with a thin path rule through the thumbnail centres on desktop. The read action is a bold text link with an arrow, not an outlined button, sharing one wrapped line with the Contents disclosure. At 700px and below the gutter is 16px, the 92px thumbnail sits beside the title, and the Contents counts become screen-reader-only so the page stays short. Focus uses the shell focus token with a 3px outline.

## Do's and Don'ts

- Use semantic shell roles for new states on the audited surfaces and check their foreground/background pairing.
- Preserve the elderflower artwork, mathematical previews, bilingual copy, clear focus, and keyboard access.
- Keep geometry and graph colors independent from this shell palette.
- Do not introduce marketing claims, replacement artwork, typography changes, dark mode, or new carousel behavior through this document.

## Learning map and chapter wayfinding

`/learn` is an ordered path grouped into strand headings with a hairline rule; rows carry no step numbers or markers because the order is only suggested (the start action names the starting topic). On desktop a 1px `rule` line runs between the row thumbnails so the previews read as stations on the path; below 700px rows are separated by `rule` hairlines instead. Rows carry a small `preview-panel` thumbnail with a `media-rule` border, a Georgia heading link, `ink-secondary` purpose text, a quiet `panel` read action with a `control-rule` border, and a native contents disclosure with an ochre CSS chevron. Keep filled `action` treatment for the single start action. Chapter readers show a breadcrumb with the chapter position, previous/next chapter beneath the desktop contents, and a sticky narrow contents bar with the section position. See [the redesign spec](docs/specs/learn-navigation-redesign.md).

## Chapter reader

Chapter readers (`/learn/<chapter>`) sit on the shell canvas and take every colour from `--bezeg-shell-*` roles through the `--chapter-*` aliases at the top of `ChapterPage.css`; the stylesheet holds no hex colours. Body type is `--chapter-text`: 16.4px up to about 1500px of viewport width, growing to 19.2px at 1920px for projection, and the contents rail, headings, notes and card copy are sized from it. Introduction, prerequisites and prose share one measure (`--chapter-measure`, about 72 characters); formula bands, guided-example cards and playgrounds keep the full article width. The current contents entry is marked by ink colour, the `choice-selected` tint and a 1px ochre rule, never by weight, so wrapped titles stay in place while reading. Guided-example cards use the `panel` surface, which is the background of the captured previews, with a 1px `rule` border and a 16px radius; the filled `action` button is the card's one action. The chapter ends with two bordered link blocks, previous on the left and next on the right (stacked below 520px), each a small label with a drawn arrow above a Georgia title; the link text stays `<label>: <title>`. While a chapter is open the document title is `<chapter title> · Bezeg`. Focus uses the shell focus token with a 3px outline. See [the polish spec](docs/specs/chapter-reader-polish.md).

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
