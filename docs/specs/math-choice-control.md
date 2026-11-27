# Math choice control

**Status:** planned, not started; owner: later (owner request 2026-11-27). Queue: [math choice control tasks](../tasks/math-choice-control/README.md). Extends the [controls catalogue](../controls.md); `ChoiceSelect` stays the control for plain-text options.

## Problem

`ChoiceSelect` (`src/inputs/ChoiceSelect.tsx`) is a native `<select>`. Browsers render `<option>` content as plain text, so a formula option cannot be typeset with MathJax. Option texts therefore use flat catalog text, for example `taylor_formula_flat` "e^(−1/x) for x > 0, 0 otherwise" (`src/localization/en.ts:1557`), while the same formula is typeset elsewhere in the app. A student sees `e^(−1/x)` in the list and a typeset formula on the board. The owner wants a choice control whose options and selected value render MathJax formulas.

### Current call sites with formula options

Found by reading `ChoiceSelect` call sites and their catalog keys. Only the first group was confirmed from option text; the others were judged from the label and the catalog, and the implementing worker must open each option list and confirm before migrating.

Confirmed formula or math-notation options:

- `src/graphs/functions/TaylorGraph.tsx:477` (Taylor "Primer funkcije", the case that started this)
- `src/graphs/levelsets/ContourMapGraph.tsx:1395` (`levelsets_graph_fn_*`: "x² + y²", "sin x · sin y")
- `src/graphs/dynamics/PhasePortraitGraph.tsx:1453` (`phase_graph_system_*`: "θ′ = ω, ω′ = −sin θ")
- `src/graphs/functions/FunctionInverseGraph.tsx:264` (`function_inverse_restriction_*`: "x² on x ≥ 0 and √x")
- `src/graphs/functions/RungeInterpolationGraph.tsx:280` (`interp_runge_function_*`)
- `src/graphs/functions/BisectionGraph.tsx:367` (`bisection_example_sign_step`: "f(x) = −1 for x < 0, otherwise 1")
- `src/graphs/functions/FourierCoefficientsGraph.tsx:440` (`fourier_decay_example_*`: "sgn(x − 1)", "1/(2 − cos x)")

Function, map or equation pickers, likely formula options (unverified): `AccumulationGraph.tsx:320`, `DefiniteIntegralGraph.tsx:222`, `DerivativeGraph.tsx:157`, `QuadratureGraph.tsx:239`, `FunctionTransformationGraph.tsx:340`, `TrigonometricFunctionsGraph.tsx:167`, `ExtremaGraph.tsx:366`, `ConvexityGraph.tsx:406`, `DarbouxGraph.tsx:289`, `MeanValueGraph.tsx:306`, `RootFindingGraph.tsx:290`, `FixedPointGraph.tsx:368`, `SequenceGraph.tsx:370`, `UniformConvergenceGraph.tsx:354`, `EulerGraph.tsx:312` (all under `src/graphs/functions/`), plus Growth model in the recursion graphs (`recursion_graph_growth_model_*`: "y = y₀·qⁿ").

That is 23 call sites (8 confirmed, 15 by label), and a smaller borderline set whose options carry symbols but need no typesetting: complex examples (`ComplexReciprocalGraph.tsx:434`, `ComplexRootsGraph.tsx:360`), `ConicFocalGraph.tsx:282`, `SimsonLinePanel.tsx:99`, `IsometryGraph.tsx:1433`, `CorrelationGraph.tsx:442`. Their Unicode text may stay; decide per site.

## Goals

1. One shared control, working name `MathChoice`, in `src/inputs/`, whose trigger and options show MathJax formulas.
2. Each option has a flat speakable text that is its accessible name.
3. Keyboard, touch, screen reader and projector use work at least as well as the native select.
4. The formula call sites above use it; `ChoiceSelect` keeps serving plain-text options.

## Non-goals

- Replacing `ChoiceSelect` for plain text; making all selects custom.
- Typesetting free-form formula input (the function editor is separate).
- Changing option ids, state, presets, routes or lesson actions.
- A multi-select, a searchable combobox or grouping, unless the open questions ask for them.

## Design constraints

- **Pattern.** WAI-ARIA select-only combobox with a listbox popup: the trigger has `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; options are `role="option"` with `aria-selected`.
- **Keyboard.** Up and Down move; Home and End jump; Enter or Space opens and selects; Escape closes and returns focus to the trigger without changing the value; type-ahead matches the start of the flat text; Tab closes and moves on. Disabled options are skipped but stay announced.
- **Screen readers.** Every option gets `aria-label` equal to its flat text; the typeset output is `aria-hidden` so MathJax's assistive MathML is not read twice. The trigger announces label, selected flat text and help, as `ChoiceSelect` does now.
- **Touch and small screens.** Targets at least 44 px high; the list scrolls, opens within the viewport (flips upward or becomes a bottom sheet when the inspector is near the screen edge) and closes on an outside tap; no hover-only behaviour.
- **Projector legibility.** Formula size at least that of the inspector body text; contrast follows the control tokens; the selected option is marked by more than colour.
- **MathJax.** Typeset through `typesetMath` in `src/mathjax/loadMathJax.ts`, which lazy-loads and prunes detached formulas; re-typeset when the open list or the selected value changes. While MathJax loads, and if it fails, show the flat text, so the control never shows an empty option. Respect the guidance in `typesetMath` about assistive MathML and detached math lists (the Guided lesson leak it records).
- **Options.** `{value, tex, flat, disabled?}`; `tex` undelimited like the `latex` fields, `flat` the catalog text. Localization keys stay in `sl.ts` and `en.ts` in lockstep; existing flat keys become the `flat` field.
- **`custom` option.** Same as `ChoiceSelect` today: listed (disabled) only while the scene matches no example, selected value `custom`.
- **Full text under the control.** Same rule as `ChoiceSelect`: when the typeset selected formula is wider than the trigger, it is shown in full under it (`data-choice-full`-like marker); one that fits is not repeated. The measurement uses the rendered width, not canvas text.
- **Other `ChoiceSelect` props.** `label`, `help`, `reason` (aria-disabled, visible reason, polite refusal line) keep their behaviour.
- **Dependencies.** None new by default: build on the existing React Bootstrap and `useId`. A headless library (for example a listbox primitive) needs a stated reason and an ADR note before it is added.
- **Performance.** Opening the list typesets at most its options once; inspector re-renders during board drags must not retypeset.

## Alternatives considered

| Option | Pros | Cons |
| --- | --- | --- |
| Better plain Unicode text in the native select (superscripts, `√`, `−`) | No new code; native keyboard, touch and screen reader behaviour; zero risk | Cannot show fractions, roots over expressions or exponents of exponents; still differs from the board's typeset formula; each formula is hand-written twice |
| Native select plus the selected formula typeset under it | Native behaviour kept; the chosen formula is correct and typeset; small change | The list itself still shows flat text, so students compare options without seeing the formulas; the text under the control duplicates the select |
| Custom listbox (owner's chosen direction) | Options and trigger both typeset; one look across the app; room for later features | Most work; accessibility and touch must be rebuilt and tested; MathJax cost in the list |

The owner chose the custom listbox on 2026-11-27. The first two stay as fallbacks if the keyboard-only walk or the screen-reader check fails.

## Acceptance

1. **Unit and interaction tests** (`just unit src/inputs/MathChoice.test.tsx`): open and close; arrows, Home, End, Enter, Space, Escape, Tab and type-ahead; selection fires `onChange` once; Escape keeps the value; `custom`, disabled options and `reason` behave as in `ChoiceSelect.test.tsx`; with MathJax mocked to fail or stay pending the flat text shows; after typesetting each option keeps its `aria-label`.
2. **Keyboard-only walk** of a migrated panel (Taylor), recorded in the task: reach, open, move, choose, cancel, leave, without a pointer.
3. **Screen-reader name check:** the accessibility tree (a role and name query in the browser) shows each option named by its flat text, with no doubled MathML reading; record which screen reader, if any, was tried.
4. **Inspector width:** `just shot --width 310 --selector <panel>` for the trigger closed, the list open, and a long formula, both languages, looked at before acceptance.
5. **Touch:** opened and chosen at a 390 px viewport; list stays inside the viewport and scrolls.
6. **Smoke routes:** the Taylor, Contour map and Phase portrait routes in [the browser checklist](../smoke-tests.md), one Guided lesson that drives a migrated select, and one migrated site in each of the Slovenian and English languages.
7. **Catalogue:** `docs/controls.md` lists the control in its choice table (lines 17 and 58 pattern), says when to prefer it over `ChoiceSelect` (formula options), and carries a screenshot under `docs/controls/`.
8. **Migration:** every confirmed formula call site above uses the control; each unverified one is opened, then migrated or recorded as plain text with a reason. Option ids, presets and lesson actions are unchanged; `npx tsc --noEmit --pretty false` and `just build` pass.

## Open questions for the owner

1. Which migrated panel is the first, Taylor only or all confirmed sites in one pass?
2. Should unverified function pickers with only simple text (for example "sin x") stay on `ChoiceSelect`, or does one look across the app matter more?
3. Is a bottom sheet on narrow screens acceptable, or must the list always drop down in place?
