# Control choice and composition

**Status:** scheduled, 2026-11-14 (owner request; started the same day). Queue: [control choice tasks](../tasks/control-choice/README.md). Follows [shared graph controls](shared-graph-controls.md) (behaviour, complete 2026-11-11) and [graph control visual polish](control-visual-polish.md) (tokens, complete 2026-11-12).

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

### Control catalogue

One file, `docs/controls.md`, lists every shared control: what it is for, when not to use it, its import, and a picture at inspector width. An agent reads it before adding a control to a graph and writes a new control only when no entry fits; the new control then gets an entry. AGENTS.md and the F2a row of the [family template](../tasks/feature-streams/README.md#family-template) link to it. It opens with the choice table below. `NumberInput` is no longer a default.

| The value is | Control |
| --- | --- |
| A number in a range the student explores: parameter, coefficient, radius, time, weight | `Slider` with its exact field |
| An angle | `AngleSlider` |
| A count: points, terms, degree, steps | `CountSetter` |
| A point drawn on the board | One row of the point list (single-point form): name, `x`, `y` on one line |
| A list of points or values | `PointListInput`, `ValueListInput` |
| One of several named options | `ChoiceSelect`; board tools stay a pressed group (decision 9) |
| On or off | `OnOffSwitch` for display, checkbox within a set |
| A matrix | The point row's number cells, laid out in the matrix's own rows and columns (decided 2026-11-14). Its columns are not shown as points: that would transpose the notation the lessons use |
| A number with no useful range | `NumberInput` |

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
5. **The handler decides.** The owner delegated the design judgement on 2026-11-14: the handler looks at every contact sheet, decides what is wrong and how it should look, and records findings in `docs/reviews/control-choice/findings.md`, ranked by routes affected. The owner corrects later from the before and after images.
6. **Fix shared components first.** The point row is the first; one CSS grid in `PointListInput` reaches all 14 files that use it. Its look, decided 2026-11-14: one line per point, holding the name, one equal-width field per axis, and the remove button where there is one. The axis letters appear once, as a header above the columns. The row wraps under its name only when the fields would fall below five characters wide (200 % text). Rejected: an axis letter beside every field (the repeated `x` and `y` the owner reported) and a label above every field (twice the height).

## Part C: new controls

Kept small on the owner's direction (2026-11-14): the catalogue does most of the work, because the reported choices were made with no guidance to follow.

1. **The catalogue**, linked from AGENTS.md so every agent session sees the pointer.
2. **A shared control looks right at inspector width before it ships.** The existing fixture (`just controls-fixture`) gains a 310 px inspector column and the row-wrap and ragged-field checks. The catalogue's pictures come from this fixture, so a control with no fixture entry has no catalogue entry.
3. **A changed panel is looked at.** The handler opens a screenshot of the inspector at 310 px before accepting a control change; measurements alone do not pass.

Dropped as too heavy for the gain: a typed reason on every `NumberInput`, the fixture in CI, and detectors in the catalog sweep. Reconsider them only if a wrong choice ships again after the catalogue exists.

## Order

0. Fix the five reported defects, each with the detector that would have caught it.
1. The catalogue (`docs/controls.md`) with its links; inventory script and classification. Read-only apart from the docs and script.
2. Capture, contact sheets, judgement pass, ranked findings.
3. Shared-component fixes from the findings, point row first; the fixture's 310 px column and checks.
4. Choice migration by family.

Steps 1 and 2 can run in parallel.

## Acceptance

1. Every control call site in graph and lesson code matches the choice table; no local field helper remains.
2. No detector fires on any of the 122 routes or on the fixture, in the four views, at the closing sweep.
3. Every distinct composition has a contact sheet the handler has looked at; every finding is fixed or recorded with a reason.
4. The five reported defects are fixed, with before and after images in `docs/reviews/control-choice/`.
5. `docs/controls.md` has an entry and a picture for every shared control, and AGENTS.md and the family template link to it.
6. Behaviour decided in shared graph controls is unchanged: commit timing, refusals, keyboard, Reset. Presets, routes and mathematical meaning are unchanged. Board size does not shrink below the visual-polish baseline.

## User impact

Many typed number fields become sliders with an exact field, so values are set by dragging or arrow keys as well as typing. Point coordinates take one line per point. Some help lines under fields disappear. Lesson text that tells the student to type into a field is reworded where the control changes. The unit circle's angle fields wrap a typed value into the turn and step by 1°. No route or stored Preset changes.

## Decisions made during the work (handlers, 2026-11-14)

The owner delegated these; each can be corrected from the before and after images.

- **Interval ends** `a`, `b` are two sliders over one fixed range, so their tracks line up; the existing handler keeps their order. A bound that followed another value became the fixed outer range where the handler already refuses an out-of-order value, and stayed a moving bound where an index runs up to a count set just above it (the chosen harmonic up to `K`, `k` up to `n`).
- **A lone abscissa** of a marked point is a slider. A pair that places one drawn point is a point row, also for a complex number (columns headed Re and Im).
- **Counts by size.** Up to about 60 values a count is a `CountSetter`; a larger count is a slider; above about 1000 steps on the track a range is a validity limit and the field stays typed with a reason in [`decisions.json`](../tasks/control-choice/decisions.json) (Linear `k` and `n`, Density's ends, the Growth capital, Simulation trials, the inserted knot). A random seed stays typed.
- **Angles.** UnitCircle uses `AngleSlider`: a typed value outside the turn wraps instead of being refused, and the arrow step is 1° (was 0,5°). EulerCircle keeps a plain 0 to 360 slider because its playback ends at 360.
- **One control per value.** BinomialNormal's separate "exact p" field went into the `p` slider's exact field.
- **Sweep.** Three views, not four: the 1024 × 768 view has the same inspector column as 1440 × 900. Three reviewers covered every contact sheet; the handler opened three sheets and the migration screenshots, not all 48 ([findings](../reviews/control-choice/findings.md)). Long teaching paragraphs under readouts are not widget help and stay.
- **Slider bounds** sit at the ends of the track without the words "Min" and "Max"; the caption row is gone ([findings](../reviews/control-choice/findings.md), S2). The bounds are hidden from assistive technology, which reads the range from the input's `min` and `max`; they are no longer part of the slider's description, and tests read the two attributes.
- **Said twice.** Where a status line and a readout row say the same thing, the row goes (Inversion). Where the duplicate was a help paragraph beside a labelled readout and there is no status line (the contour map's height scale, the solids' range, the lattice paths' page), the paragraph goes and the readout stays. A heading that repeated the one switch under it goes (PH offsets).
- **A label that a catalog poster or clip was captured through is not renamed without recapturing.** A recipe or clip row finds a control by its visible name, and the stored media records that name. Six clip rows and five overlay labels therefore keep their old text until the capture can run again ([queue, slice 2i](../tasks/control-choice/README.md#queue); findings S9). Reason: on 2026-11-14 the capture refused to run because five registered Demonstrations had no recipe yet. Alternative rejected: publishing with stale media records, which fails the browser smoke on CI.
- **Detectors.** `long-help` counts only help that belongs to one control; a group's paragraphs are the Demonstration's teaching text. `ragged-buttons` accepts rows of a grid (equal widths, edge to edge), so the 3 + 2 + 1 Presets block passes.

## Owner direction, 2026-11-14

- A catalogue file of the shared controls, so an agent sees what exists before writing a new one.
- Design decisions are the handler's: no owner gallery and no mockup round.
- Prevention stays light; the catalogue is the main measure.
