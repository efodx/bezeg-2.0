# Controls visual audit (Approach 1)

- Preview: production build of origin/master `bf843c25`, `http://127.0.0.1:4322/bezeg-2.0`, Slovenian. Audited 2026-11-11 by the bezeg-smoke worker. Playwright Chromium, one scripted run per view.
- Routes: **122 of 122** Demonstration paths. The `path:` entries in `src/demonstrations.ts` give 113; the projective, trig, lines and isometry rows live in `src/graphs/*/registration.ts` and add 9 (`/projective/*`, `/functions/unit-circle`, `/triangle-solver`, `/line-geometry`, `/isometries`). No page errors, no hidden inspector, no failed screenshots.
- Views: desktop 1440x900; mobile 360x640 (`hasTouch`, `isMobile`, `pointer: coarse` confirmed on 366/366 tab measurements); Presentation 1440x900 (button "Predstavitveni način", then "Odpri orodja"; `.is-presenting` present on 122/122).
- Per route and view: the whole inspector (`#workspace-inspector`), each of its tabs (Uredi, Prikaz, Shrani), measured and screenshotted. 1,000+ controls per view; `inContent` below means inside `#inspector-content` (the tab buttons and the collapse button are excluded).
- Evidence (clean worktree `agent-a18d8a9709fec93af/.command-logs/cv-audit/`): `desktop|mobile|presentation/<route-slug>__<edit|display|save>.png` (aside), `__page.png` (1440 full view), `mobile/<slug>__full.png` (full page 360x640), `measurements.json` (every control, all views), `summary.txt` (aggregates), `pres-text.json` (label contrast in Presentation, every 4th route, 31 routes), `montage/m1..m5.png`, scripts `run.cjs agg.cjs pres-text.cjs`. Slug = path with `/` replaced by `__`.
- Looked at: 12 routes in all three views, short of the 15 requested (bezier/curve, projective/five-point, analysis/accumulation, compgeo/convex-hull, functions/unit-circle, isometries, bezier/decasteljau, compgeo/interval-sweep, projective/three-views, bezier/affine, rational/farin-points, curve-geometry/curvature; montage m5 (ph/cubic, triangle-solver, patches/decasteljau) was rendered but not opened). Everything else is from measurements only.

## Not covered

- Only the inspector. Header buttons, graph pan and zoom buttons, the graph-adjacent playback slot and the lesson panel are outside the controls area and were not measured.
- Closed disclosures (`summary` contents) were not opened; Preset lists were only measured as rendered.
- Text contrast covers controls (all views) and labels (Presentation only, 31 routes). Light-theme labels and non-text contrast of checkbox and range fill were not computed (the 1.69 and 2.05 "text contrast" values for checkbox and range in the JSON are not meaningful and are excluded).
- Focus ring: only the first five in-content controls of the Uredi tab, desktop, via Shift then `focus()`.
- Clipping detector (`overflow` hidden or ellipsis with `scrollWidth > clientWidth`) found nothing; it misses text that wraps awkwardly. 1024x768, 390x844, 200 % text and English were not run.
- Known items: the 40 px touch NumberInput and the 13 px projective checkboxes were **not reproduced** (see the paragraph below the table).

## Ranked findings

Routes = of 122. Rank = routes x severity.

| # | Problem | Control kind | Routes | Measurement | Evidence |
|---|---|---|---|---|---|
| 1 | Contrast, Presentation: dark ink kept on the navy panel | point-list index button and label (`P0`), axis letters `x`/`y`, `legend`, curve picker button, count-setter buttons and labels, bool-field labels, `card-title`, `inspector-help` | 27 of 31 sampled (est. 85 %+ of all) | text 1.12 to 2.61 : 1 (need 4.5): `.point-list-index` 1.22, `.btn` in count setter 1.12, curve picker button 1.22, point-list axis 2.61, bool label 1.35; 272 nodes in 31 routes | `presentation/bezier__curve__edit.png`, `presentation/bezier__affine__edit.png`, `montage/m4.png` |
| 2 | Contrast: control boundary under 3 : 1 | button (`.btn`), number input, select | 122 | border against panel 1.48 : 1 on 1,003 buttons, 960 number inputs, 349 selects (desktop); 1.38 on `.workspace-modes`; Presentation 2.47 | `desktop/projective__five-point__edit.png` (fields read as faint outlines) |
| 3 | Inconsistent size: four button heights in one inspector | button | 122 | 34 px (1,225 buttons, 122 routes), 38 px (`.*-actions` in `FunctionReadout.css`, 28 routes), 44 px (`affine-action-button`, `inspector-playback`, 42 routes), 47 px (`count-setter-button`, 18 routes); field 40 vs button 34 beside each other | `desktop/analysis__darboux__edit.png`, `desktop/bezier__affine__edit.png` |
| 4 | Inconsistent radius and hand-written groups | button, button group | 121 | radius 0 (363: `preset-save`, `btn-primary` in groups), 2 px (1,061), 4 px (39: `affine-action-button`, count setter); `.btn-group` children forced to 0 / 2 px with `!important` | `desktop/bezier__affine__edit.png`, `desktop/compgeo__convex-hull__edit.png` |
| 5 | Two checkbox looks and small boxes | `bool-field-input` | 82 (checkbox 18x18: 24, switch 32x18: 61) | 18x18 radius 3 px next to 32x18 pill; box is 18 px on desktop; disabled state is `opacity:.5` only | `desktop/compgeo__convex-hull__edit.png`, `desktop/functions__unit-circle__edit.png` |
| 6 | Focus ring: three offsets, none on a few buttons | all | 4 of 540 samples (2 routes) show no ring | ring is 3 px `#577cc3` everywhere, offsets 0 / 1 / 2 / 3 px (input 1, select 2, button 1 or 3, checkbox 2, range 3); no ring: "Premakni" mode button and the disabled curve-picker button on `/bezier/curve`, `/curve-geometry/curvature` (outline `none`, no shadow); `#577cc3` on the cream panel is about 4 : 1, on navy it needs a check | `measurements.json` (`focus`) |
| 7 | Touch target under 44 px | `pointset-remove` button, `summary`, checkbox box | 82 checkbox rows, 1 route each for the other two | checkbox box 18x18 and switch 32x18 (354 controls in 82 routes) but the wrapping label is 262-276 x 44 px (hit area passes if the label is the target); `pointset-remove` 31x44 (`/compgeo/interval-sweep`, 9 buttons); `summary` 306x24 (`/analysis/fourier-coefficients`, "Vrednosti koeficientov (tabela)") | `mobile/compgeo__interval-sweep__edit.png` |
| 8 | Slider: no boundary, bare track | range | 122 | 219 sliders, 280x24 desktop, 44 px on touch, radius 0, no border; thumb and track are the browser rendering recoloured by `Slider.css` | `desktop/curve-geometry__curvature__edit.png` |
| 9 | Disabled look is opacity or low contrast, not a style | button, bool field | not counted | `Ponastavi` and `.bool-field-input[aria-disabled]` at opacity .5; Presentation shows disabled curve picker as an empty frame | `desktop/compgeo__convex-hull__edit.png` |
| 10 | Spacing and alignment: inspector vs control row | button, field | 18 | `.control-row` buttons 38 px (one 48 px) next to 34 px buttons; fields 40 px vs row buttons 38 px; `NumberInput` compact is 88x40, plain 280x40, some 41.6 / 44 / 44.8 px | `desktop/analysis__euler-method__edit.png` |

Known items from the brief: **NumberInput 40 px on touch is not reproduced** (all 960 number inputs are 44 px at 360x640 touch and at 1024x768 touch on `/bezier/curve`; they are 40 px on fine pointers by design). The inputs render as `type=text`, so the `input[type="number"]` rule at `WorkspaceControls.css:54` does not match them; the `min-height:40px` there still applies at 1440 and the `NumberInput.css:26` media query still wins on touch. **Projective checkboxes 13 px are not reproduced**: `/projective/five-point` and `/projective/three-views` render the styled `.bool-field-input` at 18x18 (label 276x44 on touch).

At 360 px there is no horizontal page overflow (0 of 122), no control outside the inspector, and no clipping detected; the inspector element screenshot is cut to the 640 px viewport, so read the `__full.png` for the whole page.

## Shared components and selectors

| Finding | File and selector |
|---|---|
| 1 | `src/inputs/PointListInput.css:5` `.point-list-index { color: var(--workspace-ink) }` and axis spans, `.is-presenting` rules in `src/inputs/NumberInput.css:21-24` and `BooleanField.css:34` cover fields only; `src/graphs/base/WorkspaceControls.css` `.is-presenting` block lacks buttons, legends, labels |
| 2, 3, 4 | `src/graphs/base/WorkspaceControls.css:44-52` (`.btn-group` radii `!important`, `.form-select` border), Bootstrap `.btn` default, `src/inputs/CountSetter.css` (`count-setter-button` 47 px) |
| 5 | `src/inputs/BooleanField.css:6-25` (`.bool-field-checkbox` 18 px / `.bool-field-switch` 32x18) |
| 6 | `src/inputs/Slider.css:10`, `BooleanField.css:11`, `NumberInput.css`, `WorkspaceControls.css:56` each declare `outline:3px solid #577cc3` with their own offset; the literal is repeated, not a token |
| 8 | `src/inputs/Slider.css:8-15` |
| 10 | `src/inputs/ControlRow.css` |

Per-graph overrides that set control height, radius, border or focus (candidates for removal, criterion 1):

- `src/graphs/functions/FunctionReadout.css:46-97`: `.mean-value-actions`, `.accumulation-actions`, `.darboux-actions`, `.extrema-actions`, `.convexity-actions`, `.taylor-actions` button `min-height:38px; padding:6px 8px; font-size:.86rem` plus a 44 px touch override each (28 routes; 13.76 px font, the only such size).
- `src/graphs/projective/PascalControls.css:3`: `.control-row[data-pascal-handle] button { min-height:44px; min-width:44px }`.
- Class-level (grep hits for `border-radius|outline` in graph CSS are plots, not controls): `SweepSideLists.css`, `BasisPlot.css`, `SpeedFactorPlot.css`, `EpicycleGraph.css`, `FourierDecaySpectra.css`, `FourierSpectrumBars.css` (not checked for controls).
- Classes with their own size on the audited routes without a graph CSS file: `affine-action-button` (44 px, 4 px radius), `inspector-playback` (44 px, 12.48 px font), `decasteljau-animation-actions` (44 px), `workspace-modes`, `workspace-curve-picker` (34 px).

## Current values per control kind (desktop, in-content controls, 3,521 incl. repeats)

| Kind | Count (routes) | Height px | Radius | Font | Border |
|---|---|---|---|---|---|
| button | 1,134+ (122) | 34 (1,225 incl. tabs); 38 (61); 44 (188); 47 (52) | 2 px (1,061), 0 (363), 4 (39) | 13.44 px (1,456 all kinds); 13.76 (62); 12.48 (74, playback); 17.6 (66, count-setter) | 1 px solid; 50 dashed read-only fields |
| number input (`type=text`) | 960 (122) | 40 (983 incl. others); 44 (27); 41.6, 42, 44.8, 45 (1 each) | 2 px | 16 px | 1 px solid, 1.48 : 1 |
| select | 349 (122) | 40 | 2 px | 13.6 px | 1 px, 1.48 : 1 |
| checkbox | 88 (24) | 18 | 3 px | label 14.08 px | 1 px |
| switch | 257 (61) | 18 (32 wide) | 28 px pill | label 14.08 px | 1 px |
| range | 208 (122) | 24 (44 touch) | 0 | 16 px | none |
| summary | 222 (115) | 44 (one 24) | 0 | 13.44 px | none |
| tab buttons (outside content) | 339 + 1,017 header | 34 desktop (44 touch) | 0 / 3 px at the ends | n/a | 1 px |

On touch at 360 px: button 44 (1,309) and 47 (53), field 44, select 44, range 44, summary 44, checkbox 18 and switch 18 high (label row 44). Font sizes in use across the inspector: 12.48, 13.44, 13.6, 13.76, 14.08, 16, 17.6 px (seven, in place of a scale). Presentation measurements repeat the desktop sizes; only colours differ.

## Board size, 1440x900

All 122 routes: board `.jxgbox` **1002x594 px** (workspace-graph section 1004x719). Presentation: 982x620. 360x640 mobile: 334 wide, 200 to 260 high (e.g. 334x260 on `/analysis/accumulation`). Per-route list: `measurements.json` (`board.board`); there is no route-to-route variation at 1440x900, so criterion 5 baseline is one number.
