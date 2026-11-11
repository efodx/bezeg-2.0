# Graph control visual polish

Status: in progress 2026-11-11 (stream [controls-visual](../tasks/feature-streams/controls-visual.md)). Acceptance criteria finalised from the [audit](../reviews/feature-streams/controls-visual/audit.md) (step 1, `bf843c25`, 122 routes, three views).

## Problem

The [shared graph controls](shared-graph-controls.md) made every graph's controls behave the same way: one label, keyboard, focus, refusal and Reset model in `src/inputs/` and `src/graphs/base/controls/`. They do not yet look like one family. The owner reported on 2026-11-11 that quite a few controls still look bad. Known examples: browser-default checkboxes 13 px high on the projective routes, a 40 px inspector field where the touch target is 44 px (`WorkspaceControls.css:54` outranks `NumberInput.css:26`), and button groups with hand-written radii.

[DESIGN.md](../../DESIGN.md) records the web shell and homepage palette, radii and components, but nothing for graph controls. The [roadmap](../roadmap.md#3-improve-tools-and-visual-design) asks for consistent spacing, typography, icons, contrast and curve styling that keep the elderflower identity, and [product direction](../product-direction.md#visual-design-proposal) asks for the look to be chosen through a small prototype, not from prose.

## Scope

In: the controls themselves (buttons, button groups, sliders and their number fields, number inputs, selects, switches and checkboxes, count setters, point and value lists, disclosures, playback buttons, Preset controls, refusal and hint text) and their layout in the workspace inspector, the control row and Presentation mode, on desktop and at 360 × 640.

Out: the graph drawing itself ([graph visual style](graph-visual-style.md), [rendered style contracts](rendered-graph-style-contracts.md)), the homepage and Learn shell, lesson panels, and behaviour of controls (already specified in [shared graph controls](shared-graph-controls.md)). No UI library is added; a dependency change stops the stream (feature-streams README).

## Approach

1. **Audit.** Screenshot the controls area of every Demonstration route at 1440 × 900, 360 × 640 (touch) and in Presentation mode, in Slovenian. Rank the problems: inconsistent sizes, spacing and alignment, browser-default widgets, weak contrast or focus, crowding or overflow at 360 px. Record evidence under `docs/reviews/feature-streams/controls-visual/`.
2. **Tokens and prototype.** Name control tokens (spacing, control height, radius, border, focus ring, typography) as CSS custom properties derived from the DESIGN.md palette. Restyle the shared components on one route (`/bezier/curve`), and compare before and after screenshots. Record the chosen look in a "Graph controls" section of DESIGN.md.
3. **Rollout by component.** One slice per component kind; most changes are shared CSS, so each slice reaches every route. Remove per-graph overrides that the shared style makes unnecessary.

## Audit summary

The [audit](../reviews/feature-streams/controls-visual/audit.md) ranked, by routes × severity: (1) Presentation mode keeps dark ink on the navy inspector (text 1.1–2.6 : 1 on 27 of 31 sampled routes); (2) button, field and select borders 1.48 : 1 against the panel on all 122 routes; (3) four button heights (34, 38, 44, 47 px) and fields 40 px beside 34 px buttons; (4) radii 0, 2 and 4 px, `.btn-group` forced with `!important`; (5) checkbox 18 × 18 and switch 32 × 18 side by side; (6) the focus ring literal `#577cc3` repeated in four files with offsets 0–3 px, and no ring on two buttons; (7) a 31 px `pointset-remove` and a 24 px `summary` on touch; (8) sliders with no boundary; (9) disabled shown by opacity alone; (10) seven font sizes in the inspector. No horizontal overflow or clipping was found. The two known items were not reproduced: inspector number fields are 44 px on touch (they render as `type=text`, so `WorkspaceControls.css:54` does not match), and the projective checkboxes are the shared 18 px box.

## Acceptance criteria

1. Every shared control kind reads its height, radius, border, focus ring and font size from the `--bezeg-control-*` tokens; no per-graph CSS sets a control's height, radius, border or focus ring except a recorded exception.
2. Text meets 4.5 : 1 and control boundaries and the focus indicator 3 : 1 against their surface, in the normal and the Presentation inspector. Disabled (`aria-disabled`) controls are exempt from the text ratio (WCAG 1.4.3) but must still look unavailable without relying on opacity alone. Every focusable control shows the token focus ring.
3. On coarse pointers every interactive target is at least 44 CSS px in both dimensions. A checkbox or switch whose wrapping `<label>` row is at least 44 px high and as wide as the inspector passes through the label.
4. No control's label, value or hint is clipped at 1440 × 900, 1024 × 768, 390 × 844 and 360 × 640 or at 200 % text (the `just controls-fixture` views), and no horizontal scroll appears (audit: 0 of 122).
5. The graph stays prominent: the board is not smaller than the audit baseline on any route, 1002 × 594 at 1440 × 900 and 982 × 620 in Presentation.
6. Before and after screenshots of the affected routes are recorded under `docs/reviews/feature-streams/controls-visual/` (images stay in the clean worktree's `.command-logs/`), and a UI and accessibility review accepts each slice.
7. DESIGN.md gains a "Graph controls" section that names the tokens and components.

## Tokens

Defined once in `src/inputs/controlTokens.css` on `:root`, re-bound under `.is-presenting`. Components read the tokens; Presentation changes only the colour tokens.

| Token | Value | Presentation |
| --- | --- | --- |
| `--bezeg-control-height` | 38px; 44px on `(pointer: coarse)` | same |
| `--bezeg-control-radius` | 6px; groups round only their outer corners | same |
| `--bezeg-control-border` | 1px solid `#767f6c` (4.11 : 1 on the panel `#fffdf5`, 3.66 : 1 on the canvas `#f4f0df`) | `#8f9bb3` (5.55 : 1 on `#17243b`) |
| `--bezeg-control-ink` | the workspace ink | `#f8f0d7` (13.6 : 1) |
| `--bezeg-control-surface` | the panel | `#20304a` |
| `--bezeg-control-selected-surface`, `-selected-ink` | `#19372f`, white: pressed (`aria-pressed`) and `.active` buttons | same |
| `--bezeg-control-focus` | 3px solid `#456db0` (DESIGN `focus`, 5.07 : 1 on the panel), offset 2px | `#f2c66d` (9.67 : 1 on navy) |
| `--bezeg-control-font-size` | 0.875rem (14px) for buttons, selects and labels; text fields keep 1rem so mobile browsers do not zoom on focus | same |
| `--bezeg-control-gap` | 8px | same |
| boolean box | checkbox 20 × 20; switch 36 × 20; both use the border and focus tokens | same |

## Decisions

Recorded by the stream handler as they are made: choice, reason, rejected alternative.

- 2026-11-11, control height 38 px on fine pointers. It sits between the 34 px buttons and 40 px fields so both kinds align in one row, and the inspector grows only slightly; the board size does not depend on inspector height. Rejected: 44 px everywhere (longer inspector on desktop, DESIGN's 44 px applies to primary shell actions) and 34 px (fields would shrink below a comfortable text box).
- 2026-11-11, radius 6 px. Softer than the current 2 px and still below the shell's 8 px action and 10 px choice radii, so graph controls read as a quieter tier. Rejected: 8 px (equal to shell primary actions, too heavy for dense groups) and keeping 2 px (the owner's complaint).
- 2026-11-11, focus colour `#456db0`, not the workspace's `#577cc3`: the DESIGN focus role, 5.07 : 1 on the panel against 4.06; in Presentation the pollen `#f2c66d`, because blue on navy fails 3 : 1.
- 2026-11-11, both boolean looks stay: the switch for immediate display toggles, the checkbox for choices within a set (existing component variants); only their sizes, borders and focus are unified. Rejected: one look for all (changes component meaning across 82 routes without a behavioural reason).
- 2026-11-11, prototype scope (step 2): the token file plus buttons and button groups, number fields, selects, the focus ring and the Presentation re-binding, checked on `/bezier/curve` and its Presentation view. These are the kinds visible on that route and cover findings 1, 2, 3, 4, 6 and 10. Steps 3a–3c take booleans, sliders, count setters and disclosures, then per-graph overrides.
- 2026-11-11, token values are literals, not `var(--bezeg-ink)`: the `--bezeg-*` palette is declared by component stylesheets (`AppHeader.css`, `DemonstrationWorkspace.css`), not on `:root`, so a token derived from it could resolve to nothing outside the workspace. Rejected: declaring the tokens on `.demonstration-workspace` (lesson pages and the controls fixture would miss them).
- 2026-11-11, prototype result (step 2): on `/bezier/curve`, `/bezier/affine`, `/analysis/darboux`, `/projective/five-point` and `/compgeo/convex-hull`, buttons, fields and selects measure 38 px (44 px touch) with a 6 px radius; boundaries 4.11 : 1 (Presentation 5.55 : 1); minimum inspector text 5.44 : 1 light and 6.73 : 1 Presentation (before 1.03–1.2 : 1); focus ring on the first ten controls in both themes; board unchanged. Screenshots: stream worktree `.command-logs/cv-proto/` (`before`, `after`, `-sel` with a curve selected). Left for step 3: the `FunctionReadout.css` action buttons (2 px, 1.48 : 1, 28 routes) and the transparent "Strni" ghost button.
- 2026-11-11, step 3b: count setters, point collections, remove and delete buttons, control-row fill buttons and disclosure summaries take `--bezeg-control-height`, so desktop buttons shrink from 44 to 38 px and touch keeps 44 px. Rejected: keeping 44 px on desktop for steppers (the only controls that would break the shared row height). Disclosure summaries without their own rule get the height from a `.workspace-inspector :where(details > summary)` rule (specificity 0,1,0) so the specific summary rules still win.
- 2026-11-11, unavailable buttons are dashed with the muted help ink (`#5b675a` light, `#b5bfd0` Presentation) at full opacity; pressed buttons keep the selected pair. Opacity made Presentation labels sink into the navy and did not meet criterion 2's "not by opacity alone". Rejected: a grey fill (reads as a selected state next to the dark selected fill).
- 2026-11-11, Presentation header and workspace actions: the pressed "Zapri predstavitev" toggle uses the selected pair (it was cream on cream after the prototype), and the header "Učenje" and "Demonstracije" buttons are transparent with cream ink (they kept the light shell fill under cream ink).
- 2026-11-11, step 4 reduced motion: one module, `src/graphs/base/controls/reducedMotion.ts`, with a getter, a subscription, `useReducedMotion()` and a `<ReducedMotion>` render wrapper. Class graphs render their playback block through the wrapper, so React owns the subscription from mount to unmount and the graph's own `reducedMotion()` (overridden in tests and lessons) is still the read. Rejected: subscribe and unsubscribe in each graph's lifecycle (14 edits, easy to leak). Graphs whose Play has no parameter slider pass `reducedMotionReason` naming their control (time slider, descent step slider, point position slider, Next step button).
- 2026-11-11, step 3c: the function-family action buttons (`control-row`, `value-list-row`, `zero-list-row` and the six `*-actions` groups) join the shared token button rule instead of `FunctionReadout.css` sizes; boundaries 1.48 → 4.11 : 1 (Presentation 1.2–2.47 → 5.55 : 1). The green "revealed" border on `control-row--fill` is dropped: dark green on navy fails 3 : 1 and the Show/Hide label already states the state. Recorded exception: `PascalControls.css:3` keeps its 44 × 44 floor at ≤ 700 px and on coarse pointers (a touch-target floor only; radius and border come from the tokens). Presentation `.form-text`, table captions and `h4` read the control inks (1.0–1.35 → 8.4–13.6 : 1).
