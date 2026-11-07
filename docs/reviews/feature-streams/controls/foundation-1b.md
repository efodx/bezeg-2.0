# Shared graph controls, slice 1b: boolean field and field chrome

Worker report. Base 26a535af, nothing committed.

## Changes per file

- `src/inputs/BooleanField.tsx` (new): one boolean field, `variant: "switch" | "checkbox"`, native `<input type="checkbox">` plus `<label htmlFor>` (useId), `help` and `describedBy` joined into `aria-describedby` (line 29), Enter is `preventDefault`ed (line 31). No role is added: today's `OnOffSwitch` rendered no `role="switch"` (measured in the browser, `role` null), so the switch is announced as a checkbox, unchanged.
- `src/inputs/BooleanField.css` (new): all control appearance (track or box, checked, focus-visible, disabled), row wrapping (`overflow-wrap: anywhere`), the label fills the row so the whole row is the hit area, `min-height: 44px` under `(pointer: coarse), (max-width: 700px)`. Hosts set only `--bool-field-min-height` and `--bool-field-pad`. Rules carry a `.bool-field` prefix so they beat the global `input[type]:checked` in `bootstrap-overrides.scss` (found by the first after-screenshot probe: checked colour was wrong without it).
- `src/inputs/OnOffSwitch.tsx`: B1 choice: kept as the switch variant (a thin wrapper over `BooleanField`), so all 48 callers and the two tests that check `type.name === 'OnOffSwitch'` are untouched. Gained an optional `help`. Its per-switch `<Form>` is removed.
- `src/inputs/describedBy.ts` (new): `joinIds`.
- `src/inputs/NumberInput.tsx`: `help` prop (`number-input-help`, linked), description order hint, help, describedBy; `inputMode` is `decimal` only when `min >= 0`, else `text` (B5). `NumberInput.css`: label wrapping, help style.
- `src/inputs/Slider.tsx` plus new `Slider.css`: own class `slider-field`, own imported stylesheet. Moved here from hosts: `.slider-label` rules, `.slider-label output`, `.slider-range` (merged, the later 0.75rem size wins as before), the `.form-range` display and focus rules (re-scoped from `.workspace-inspector` to `.slider-field`), and a 44px range hit area under a coarse pointer (new). Help and range summary go through `joinIds`.
- `src/inputs/CountSetter.tsx`/`.css`: optional `help` (linked to the group by `aria-describedby`), label wrapping.
- `src/graphs/base/WorkspaceControls.css`: removed `#inspector-display .form-check*` (appearance), `.workspace-inspector .tools .form-check*`, the slider rules above, and the coarse `#inspector-display .form-check` rule. Kept layout: `.inspector-control:has(.bool-field)` margin, tools row `--bool-field-min-height: 32px; --bool-field-pad: 0`, `.list-group-item:has(.bool-field)` padding.
- `src/graphs/functions/FunctionReadout.css`: removed all `.function-inspector .form-check` / `.form-switch` appearance and its coarse rule; added `.bool-field` to the sibling-gap selector (switches used to be `<form>` siblings and received that 12px gap; without it spacing would change).
- `src/graphs/base/DemonstrationWorkspace.css`: removed the `.slider-label` and `.slider-range` rules (moved). `.workspace-inspector .form-check` (line 188) stays: it still styles the preset selector's `Form.Check`, which is not a boolean field.

## B2: form wrapper

Removed. Finding: in browsers (and user-event) Enter on a checkbox inside a form with a submit button performs implicit submission. The new test failed on first run for exactly this (`onSubmit` called once), so the field now cancels Enter. Space toggles; Enter does nothing.

## Tests and mutation evidence

New `src/inputs/BooleanField.test.tsx` (names, native checked/change, Space, no role, disabled, help plus describedBy, none, separate ids, no own form, Enter or Space cannot submit an enclosing form), plus additions to `NumberInput.test.tsx` (inputMode, three-way description), `CountSetter.test.tsx` (help, none), `Slider.test.tsx` (class, describedBy).
Each assertion was observed to fail under a deliberate mutation (logs `.command-logs/1b-mut-<name>.log`, script `.command-logs/1b-mut.sh`; files restored and compared):
- Enter not cancelled: failed (also failed for real before the fix).
- `<form>` wrapper back in `OnOffSwitch`: failed.
- `role="switch"` added: 6 failures.
- Field help dropped from describedby (boolean, number, count setter, slider): failed each.
- `inputMode` always decimal: failed.
- `slider-field` class removed: failed.

## Checks

- `just unit src/inputs`: passed (log `.command-logs/1b-unit-inputs.log`; 56 plus the new tests, all green on the final run).
- `DerivativeGraph.test.ts`, `TrigonometricFunctionsGraph.test.ts` (the OnOffSwitch consumers): passed (`.command-logs/1b-unit-consumers.log`).
- `just typecheck`, `just lint`: passed (`1b-typecheck.log`, `1b-lint.log`). `just build`: passed (`1b-build.log`), rebuilt after the CSS specificity fix.
- Smoke on port 4327: `curve-ownership` plus `count-setter` specs, 11 passed (`1b-smoke1.log`); `guided-lessons` test "Dvigni stopnjo with weight labels" (the only spec using a checkbox role), 1 passed (`1b-smoke2.log`). Preview on 4327 stopped.
- Full `just unit`: passed in 1819.6s (`.command-logs/1b-unit-full.log`, runner log `2026-11-07T11-10-35-946Z-11272-2b1cfca3.log`).

## Screenshots (1440x900, inspector panel, `.command-logs/shots/`)

`before-*.png` from the 26a535af build, `after-*.png` from this build; script `.command-logs/1b-shots.cjs`.
- Display tab of `bezier/decasteljau` (`*-display.png`): visually identical; measured track 32x18, row 38 both.
- Function inspector, `analysis/euler-method` Edit (`*-function.png`): identical (the switch is below the fold in the image; measured 32x18, row 38 both).
- Tools list, `bspline/basis` Edit (`*-tools.png`): deliberate difference. Before, tools switches were Bootstrap defaults (34x20 track, pale unchecked track with a yellow knob); now they use the same moss look as Display (32x18). Row height 32 and position unchanged.

## Decisions and unverified

- Tools switch look unified with Display and the function inspector (named above); it is the only appearance change.
- Coarse-pointer 44px was set in CSS but not rendered under an emulated coarse pointer; only desktop screenshots were taken.
- Not verified: the Slider, CountSetter and NumberInput chrome in a coarse-pointer browser; the `.tools` host padding of switches with `help` (no caller uses `help` yet); the presenting (dark) theme with the new field.
- Raw checkboxes (PointSetControls etc.), refusal notices and the lint rule are untouched, as scoped.

## Handler acceptance

- **Review (Sonnet, engineering and accessibility):** missing colour fallbacks, unreadable new help text in presenting mode, and no forced-colours rule. Fixed in `BooleanField.css`, `CountSetter.css` and `NumberInput.css`. `overflow-wrap: anywhere` became `break-word`. Kept: `.workspace-inspector .form-check` in `DemonstrationWorkspace.css`, because `PresetSelector` still renders a Bootstrap check.
- **First-pass smoke (Sonnet):** [foundation-1b-smoke.md](foundation-1b-smoke.md). Layout, interaction and touch height passed on four routes in both languages. The forced-colours on state lost its thumb, and the presenting on track was hard to see; both are fixed. The locked inspector during a lesson is intended: lesson smoke asserts it.
- **Repair recheck (Haiku, then the handler with the same script):** forced colours show a native ticked and empty box; the presenting border is rgb(181, 191, 208) in both states after a specificity fix; the normal theme screenshot is pixel-identical.
- **Not verified:** the checkbox variant, help on a switch and a disabled switch in a browser (no route renders them; slice 5's fixture will); real iOS keyboards; a screen reader.
