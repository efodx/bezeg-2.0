# Control choice and composition

**Status:** proposed, 2026-11-14 (owner request). Follows [shared graph controls](shared-graph-controls.md) (behaviour, complete 2026-11-11) and [graph control visual polish](control-visual-polish.md) (tokens, complete 2026-11-12). Not yet scheduled: no task files exist.

## Problem

The owner reported five controls on 2026-11-14, after both streams closed:

| # | Where | Defect | Source |
| --- | --- | --- | --- |
| 1 | Descent, "Polmer kotalečega se kroga r" | A typed field for a value from 0,25 to 3 in steps of 0,25, with three lines of help explaining its limits. A slider needs neither | `DescentGraph.tsx`, local `numberField` |
| 2 | Inversion, "Polmer inverzije r", "X: x", "X: y" | A point shown as two stacked full-width fields; a radius typed | `InversionPanel.tsx`, local `IntField` and `PointFields` |
| 3 | Curve workspace, "Način urejanja: Premakni" | The closed disclosure box looks cut off at the bottom | `BaseCurveGraph.tsx`, `.editing-mode`; cause not yet reproduced |
| 4, 5 | Curve workspace, point list | Each point takes two lines: name, `x` and its field, then `y` and its field alone; with a remove button the `y` field is narrower than the `x` field | `PointListInput.css`, `.point-list-row` |

All five use shared components and pass lint, the fixture and both audits. Three gaps let them through:

1. **Lint checks the primitive, not the choice.** A raw `<input>` fails; a `NumberInput` where a `Slider` belongs passes. Of 146 `NumberInput` call sites in `src/graphs` and `src/learning`, 141 set `min`, `max` and `step` (62 in functions, 14 in recursion, 12 each in compgeo and complex). Nothing says when a number is a slider. The new families each wrote a local helper for typed fields: `numberField` in Descent, Kinematics and Waves, `entryField` in PhasePortrait.
2. **Compositions are not shared.** The spec gave query points a single-point form of the point list, but Inversion and Simson (`PointFields`, `PPrimeFields`) still stack two `NumberInput`s. The lint rule cannot see a group.
3. **The visual audit measured; it did not look.** Its own record: 12 of 122 routes were opened as images and "everything else is from measurements only"; the clipping detector "misses text that wraps awkwardly"; closed disclosures and the lesson panel were not covered. The point list wraps at the inspector's default width (310 px) because `.point-list-row` is `flex-wrap`, added on 2026-11-06 so that nothing clips at 200 % text. The row passes "no clipping" and looks broken.

## Part A: the right control

### Choice table

One table, in DESIGN.md under *Graph controls*. `NumberInput` is no longer a default: it needs one of the listed reasons at the call site.

| The value is | Control |
| --- | --- |
| A number in a range the student explores: parameter, coefficient, radius, time, weight | `Slider` with its exact field |
| An angle | `AngleSlider` |
| A count: points, terms, degree, steps | `CountSetter` |
| A point drawn on the board | One row of the point list (single-point form): name, `x`, `y` on one line |
| A list of points or values | `PointListInput`, `ValueListInput` |
| One of several named options | `ChoiceSelect`; board tools stay a pressed group (decision 9) |
| On or off | `OnOffSwitch` for display, checkbox within a set |
| A number with no useful range, an entry of a compact grid (matrix), or a value copied from a source and not explored | `NumberInput`, with that reason |

Also redundant, and removed: help text that only explains a field's range or step (the slider shows it); a second control for a value the panel already offers; a typed field for a draggable point outside the point row. The typed point row stays as the keyboard path (decision 11).

### Find

A script (`scripts/controls-inventory.cjs`, TypeScript compiler API) lists every shared-control call site in `src/graphs` and `src/learning`: file, component, the props that decide the choice (`min`, `max`, `step`, `integer`), label key, and adjacent controls. It is complete by construction; the 2026-11-06 audits were samples that stopped at their budget. A worker classifies each row against the table: keep, slider, count, point row, remove. The result is `docs/tasks/control-choice/inventory.md`.

### Fix

Migrate by family, largest first (functions). Local field helpers go. Each migration checks lesson prose and guided-example control steps that name the old control, and keeps commit timing, refusal and keyboard behaviour from the shared-controls decisions. Presets and routes do not change.

## Part B: finding controls that look bad

Measurements find wrong sizes. They do not find a row that reads badly. The sweep therefore produces pictures a reviewer can cover in full, and adds detectors for the composition defects reported.

1. **Capture.** `just controls-sweep` (script committed under `scripts/controls-sweep/`; the last audit's script lived only in a worktree log directory). For each of the 122 routes: every inspector tab, every disclosure opened, a point or curve selected where that reveals controls, each option of a select that changes which controls show, and the lesson panel's controls. Views: 1440 × 900 (inspector 310 px), 1024 × 768, 360 × 640 touch, Presentation.
2. **Group by composition, not by route.** Crop each control group and fingerprint its DOM structure without text. About 1,000 controls per view reduce to the distinct compositions; each gets one contact sheet showing its worst cases (longest label, most rows, with and without remove buttons). A reviewer then sees every composition once, at every width.
3. **Detectors**, run on every crop. Each must fail on today's state of the reported defect before its fix lands:
   - *Row wraps:* children of one control row sit on more than one line at 310 px (4, 5).
   - *Ragged fields:* sibling fields in one group differ in left or right edge (5).
   - *Clipped box:* a bordered element is cut by an overflow ancestor after it is scrolled into view (3).
   - *Long help:* help under a control exceeds two lines at 310 px (1).
   - *Point as fields:* adjacent number fields whose labels differ only by an axis letter (2; static, from the inventory).
   - *Bounded field:* `NumberInput` with a range and no reason (1; static).
4. **Judgement pass.** One subagent per contact-sheet group runs the impeccable critique on the images, with DESIGN.md's *Graph controls* and a five-line rubric: one line per value where it fits, aligned edges, label next to its field, no text that explains the widget, nothing cut. Each finding names the sheet and crop, says whether the shared component or the call site is at fault, and proposes the fix. The handler opens the sheets for the top findings itself.
5. **Owner gallery.** The contact sheets are published as one page. The owner marks what still looks wrong; all five reported defects came from the owner's eye, so this is the ground truth for the rubric. Findings and marks go to `docs/reviews/control-choice/findings.md`, ranked by routes affected.
6. **Fix shared components first.** The point row is the first: image mockups of two or three layouts at 310 px and 360 px ([prototype](../product-direction.md#visual-design-proposal) rule), owner picks, then one CSS grid in `PointListInput` reaches all 14 files that use it.

## Part C: new controls

1. **The choice table is where workers read it:** DESIGN.md, linked from the F2a row of the [family template](../tasks/feature-streams/README.md#family-template).
2. **The choice is enforced per call site.** `NumberInput` in graph and lesson code requires a typed reason from the table's last row; a call without it fails `tsc`. Rejected: a file-level lint exemption list, because one allowed field in a file would admit the others.
3. **Missing compositions become components.** A single-point row and a labelled parameter slider cover the cases the local helpers wrote by hand. A graph that needs a new group adds it to `src/inputs/` with a gallery entry, as the shared-controls rule already says for capabilities.
4. **The fixture becomes a gallery of compositions.** `fixtures/controls` shows every composition at 310 px and phone width, light and Presentation, with long Slovenian labels. `just controls-fixture` runs the Part B detectors on it and joins CI; it is not in CI today.
5. **The detectors run on real routes** in the catalog sweep tier (sampled locally, full daily in CI), so a new graph that wraps a row or clips a box fails without anyone opening it.
6. **A new or changed panel is looked at.** F2a evidence includes inspector screenshots at 310 px and 360 px, every tab, disclosures open. The handler reads the images against the table and the rubric before accepting; [review routing](../agent-workflow.md#review-routing) for control changes names screenshots, not measurements, as the input.

## Order

0. Fix the five reported defects, each with the detector that would have caught it.
1. Choice table in DESIGN.md; inventory script and classification. Read-only apart from the docs and script.
2. Capture, contact sheets, judgement pass, owner gallery, ranked findings.
3. Shared-component fixes from the findings, point row first.
4. Choice migration by family.
5. Gates: typed reason, gallery fixture in CI, detectors in the catalog sweep, family template and review routing text.

Steps 1 and 2 can run in parallel. Step 5's typed reason lands with the last family of step 4.

## Acceptance

1. Every control call site in graph and lesson code matches the choice table; each remaining `NumberInput` carries a reason; no local field helper remains.
2. No detector fires on any of the 122 routes or on the gallery fixture, in the four views.
3. Every distinct composition has a contact sheet, and the owner has marked the gallery; every marked item is fixed or recorded with a reason.
4. The five reported defects are fixed, with before and after images in `docs/reviews/control-choice/`.
5. The gallery fixture and detectors run in CI; the family template and review routing carry the new text.
6. Behaviour decided in shared graph controls is unchanged: commit timing, refusals, keyboard, Reset. Presets, routes and mathematical meaning are unchanged. Board size does not shrink below the visual-polish baseline.

## User impact

Many typed number fields become sliders with an exact field, so values are set by dragging or arrow keys as well as typing. Point coordinates take one line per point. Some help lines under fields disappear. Lesson text that tells the student to type into a field is reworded where the control changes. No route or stored Preset changes.

## Open to the owner

- The point-row look (step 3 mockups).
- Whether matrix entries stay typed fields or become sliders; the table keeps them typed until decided.
