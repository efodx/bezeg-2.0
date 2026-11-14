# Graph controls catalogue

Read this before adding a control to a graph or lesson panel. Use an entry below; write a new control only when none fits, put it in `src/inputs/`, add it to the fixture (`fixtures/controls/main.tsx`) and add its entry here. Behaviour rules are in [shared graph controls](specs/shared-graph-controls.md), tokens in [DESIGN.md](../DESIGN.md#graph-controls), and the reasons for this file in [control choice and composition](specs/control-choice-and-composition.md).

## Which control

Start from the value the student changes, not from the widget.

| The value is | Use | Not |
| --- | --- | --- |
| A number in a range the student explores: parameter, coefficient, radius, time, weight, probability | `Slider` (it has an exact field for typing) | `NumberInput` |
| An angle in degrees | `AngleSlider` | `Slider` with hand-written wrapping |
| A count of things: points, terms, degree, steps, samples | `CountSetter` | `NumberInput`, `Slider` |
| A point drawn on the board | One row of `PointListInput`: name, `x`, `y` on one line | Two `NumberInput`s labelled "… x" and "… y" |
| Several points, with add and remove | `PointCollection` above a `PointListInput` | Per-graph add and remove buttons |
| A list of single numbers (zeros, nodes, samples) | `ValueListInput` | A column of `NumberInput`s |
| One of several named options, an example, a mode | `ChoiceSelect` | A row of buttons, a raw `<select>` |
| A board tool (Move, Add, Delete) | A named group of pressed buttons (`aria-pressed`) | `ChoiceSelect`: the active tool must stay visible on a projector |
| On or off, applied at once | `OnOffSwitch` (`BooleanField variant="switch"`) | A button that toggles |
| Several independent choices in one set | `CheckboxGroup` | Separate switches |
| A result hidden until asked | `RevealButton` | `OnOffSwitch` |
| A run through steps or time | `PlaybackButtons`, with a `Slider` for the position | Own Play, Pause and Reset buttons |
| A matrix | `NumberInput` cells in the matrix's own rows and columns, until the shared number grid lands | Column vectors as point rows (that transposes the notation) |
| A number with no useful range | `NumberInput` | — |

Rules that the table implies:

- **`NumberInput` is not a default.** If the value has a `min`, a `max` and a `step`, it is a `Slider`. The slider shows the range, so help text that only states the range or the step goes.
- **One control per value.** Do not add a second control for something the panel or the host already offers: the host has Reset, Fit and Presets; a draggable point already has its typed row.
- **Say it once.** A sentence shown in a status line is not repeated in the readout list below it.
- **No local field helpers.** A `numberField()` method or an `IntField` component in a graph file is a sign that an entry here was missed. Call the shared control directly, or add a shared one.

## Layout in the inspector

The inspector is 310 px wide on desktop (about 286 px of content) and the full width of a phone. Check a new panel at both.

- One value per line where it fits; a point is one line, never two.
- Fields in one group share their left and right edges.
- A label sits directly above or beside its control, never alone on a line of its own.
- Help under a control is at most two lines at 310 px.
- A group box has all four edges; nothing is cut at the bottom of the panel.
- Look at a screenshot of the panel before calling it done. Measurements do not show a row that reads badly.

## Entries

| Control | Import | For | Notes |
| --- | --- | --- | --- |
| `Slider` | `src/inputs/Slider` | A ranged number | `customText` is its name. Exact field unless `formatValue` is set. `grid` snaps typed values with a notice; `cyclic` wraps; `unavailableReason` keeps it focusable; `hideBounds` drops the min and max labels. Arrow is one step, Shift or Page the `bigStep` |
| `AngleSlider` | `src/inputs/AngleSlider` | Degrees, 0 to 360, wrapping | Only the name, value and callbacks vary |
| `CountSetter` | `src/inputs/CountSetter` | An integer count | − value +. Buttons are unavailable with a reason at the bounds. `onSet` makes the value typeable |
| `NumberInput` | `src/inputs/NumberInput` | A typed number with no useful range; a grid cell | Commits on Enter or blur. Out of range is refused with a message, never clamped. `compact` and `hideLabel` are for cells inside another control |
| `PointListInput` | `src/inputs/PointListInput` | Typed coordinates of one or more points; the keyboard path for dragging | 1, 2 or 3 axes (`axisLabels`). `onRemove` adds a remove button per row; `onSelect` makes the name a pressed toggle. A single point is a list of one |
| `PointCollection` | `src/inputs/PointCollection` | Count, add (button, typed entry, board mode), clear | Sits above its `PointListInput` |
| `ValueListInput` | `src/inputs/ValueListInput` | A list of single numbers | Same commit and refusal rules as the point list |
| `ChoiceSelect` | `src/inputs/ChoiceSelect` | One of several named options | Native select. A `custom` option appears only while the scene matches no example |
| `ResetExampleButton` | `src/inputs/ResetExampleButton` | Back to the chosen example | Beside the example chooser; unavailable with a reason while the scene equals the example |
| `OnOffSwitch`, `BooleanField` | `src/inputs/OnOffSwitch`, `src/inputs/BooleanField` | On or off | Switch for immediate display toggles, checkbox within a set |
| `CheckboxGroup` | `src/inputs/CheckboxGroup` | Independent choices in one labelled set | |
| `RevealButton` | `src/inputs/RevealButton` | Show or hide a result | The label changes with the state |
| `UnavailableButton` | `src/inputs/UnavailableButton` | Any action that can be unavailable | Stays focusable (`aria-disabled`), states its reason on press. Never use native `disabled` |
| `PlaybackButtons` | `src/graphs/base/controls/PlaybackButtons` | Play, Pause, Step, Reset of a run | Shared labels and reduced-motion handling |
| `StepCounter` | `src/graphs/base/controls/StepCounter` | "Step n of m", counted from 1 | |
| `InspectorDisclosure` | `src/inputs/InspectorDisclosure` | A collapsible inspector group | Native `<details>`; open state survives tab switches |
| `ReadoutHeading`, `ReadoutList`, `ReadoutHelp`, `ReadoutScrollTable` | `src/graphs/base/controls/ReadoutParts` | Computed values shown as text | One list and heading style for every graph |
| `LiveReadout`, `StatusLive` | `src/graphs/base/controls/LiveReadout`, `StatusLive` | Screen-reader announcements of a changed state | One announcement per graph; silent while playing |
| `RefusalNotice` | `src/inputs/RefusalChannel` | Why an edit was refused | One channel per panel, shown alone, cleared by the next accepted edit |
| `ToolTippedButton` | `src/inputs/ToolTippedButton` | A button that needs a tooltip | |

The curve workspace's own panels (`CurveOperation`, `BezierCurveControls`, `CurveDisplayControls` and the rational and PH variants in `src/graphs/base/controls/`) are compositions of these for curve graphs; a new curve graph reuses them through `BaseCurveGraph`.

## Checking a panel

- `just controls-fixture` renders every shared control at inspector width, on a phone and at 200 % text, and fails on clipping, a missing focus ring, a small touch target or a point row that wraps.
- `node scripts/controls-inventory.cjs` regenerates the [call-site inventory](tasks/control-choice/inventory.md): every shared control in graph and lesson code, with a first reading of each typed number field against the table above.
