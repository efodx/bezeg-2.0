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

Canvas and panel roles deliberately differ: the header/home canvas uses `canvas`, header controls use `panel`, and carousel cards use `preview-panel`. Preserve those distinctions. The role suffixes in the frontmatter match CSS custom properties in `src/shellTokens.css`; that stylesheet also owns botanical, media, border, number, and scrollbar roles.

Use `ink` for headings, `ink-secondary` for explanatory copy, `action` for primary links, and `ochre` for the section accent. The lesson action uses `lesson-ink`. Focus uses a distinct blue, retaining the existing header/home variants.

Category labels use `label` on the preview panel. On selected tiles, use `label-selected`: the old label color against the selected surface gave only 4.369:1 contrast. The selected role gives approximately 5.78:1. Maintain at least 4.5:1 for these small labels across selected, hovered, and focused states. Focus outlines do not replace a readable text foreground.

## Typography

Keep the existing system sans-serif stack from `src/index.css`. The brand uses a 700-weight system sans at 23px on desktop and 20px below 700px. The homepage heading uses weight 700, line height 1.06, a 17ch measure, and `clamp(34px, 4.2vw, 60px)` on desktop. The mobile override remains in `WelcomePage.css`.

Introductory copy is 17px with 1.55 line height (15px on narrow screens); the section heading is 22px (20px narrow). Carousel titles are 25px (21px narrow), with 15px explanatory text. Category labels are intentionally secondary at 10–11px and need the contrast safeguards above. This record does not authorize new fonts or changes to existing copy.

## Layout

The homepage content has a 1100px maximum width and natural vertical flow. The featured card uses a 40% artwork / 60% copy split on desktop and a continuous cream preview-panel surface, including nested media, without a divider. Preserve the complete artwork with proportional containment. See [homepage preview spacing](docs/specs/homepage-preview-spacing.md). The intro stacks below 820px. Below 700px, the preview and text stack, with page padding reduced to 16px horizontally. Preserve the horizontal selector rail's internal scrolling; the document must not overflow horizontally. Keep visible focus reachable within that rail.

## Elevation & Depth

The featured card uses the existing soft two-part shadow in `--bezeg-shell-shadow-card`; action links use `--bezeg-shell-shadow-action`. Preserve the approved faint graph grid, botanical artwork, and 5px green leading rail. Their purpose and approval are recorded in `docs/specs/homepage-visual-flair.md`.

## Shapes

Keep the observed 8px action radius, 10px choice radius, 16px preview radius, and circular previous/next controls. Primary controls retain at least 44px height; selector choices retain at least 72px height.

## Components

The shared header contains the brand, Learning and Demonstrations links, and the language selector. The homepage contains its existing introduction, catalog action, featured demonstration, selection rail, and attribution footer. The featured card's metadata and actions change together.

Retain current carousel timing, manual takeover, temporary hover/focus pauses, visibility guards, and reduced-motion behavior. The audit's proposed pause button was explicitly excluded by the owner. No animation, content, or interaction redesign is part of this token consolidation.

## Guided lesson reading overlay

The lesson overlay uses the warm panel, ink, secondary ink, rule and forest action roles above. Its title occupies a full row, with quiet Hide/Exit actions below; Next carries the primary action treatment. Keep natural content height, a bounded scrolling reading region and persistent actions on narrow or short screens. Programmatic focus on the reading section does not draw a perimeter around the panel; interactive controls retain visible keyboard focus. See [the refinement specification](docs/specs/lesson-panel-visual-refinement.md).

## Do's and Don'ts

- Use semantic shell roles for new states on the audited surfaces and check their foreground/background pairing.
- Preserve the elderflower artwork, mathematical previews, bilingual copy, clear focus, and keyboard access.
- Keep geometry and graph colors independent from this shell palette.
- Do not introduce marketing claims, replacement artwork, typography changes, dark mode, or new carousel behavior through this document.

## Guided lesson reading panel

The expanded graph overlay uses the shell's opaque `panel`, `ink`, `ink-secondary`, `rule`, `action` and `focus` roles. Its desktop width is bounded to a reading measure and inset from the graph edge. A smaller lesson title and quiet utility actions identify the session; the larger current-frame heading leads the explanation. Frame type accompanies step/frame progress in the footer. On wide screens navigation shares that footer row; narrow layouts stack it. Keep 44px action targets and bounded internal prose/formula scrolling, including enlarged text. The minimized graph tab and lesson interaction remain unchanged. See [the refinement spec](docs/specs/lesson-panel-visual-refinement.md).
