# Converting a graph to explicit declarations

How to make one graph declare what the board workspace shows (task 02; [ADR 0065](../adr/0065-graphs-declare-presenters-render.md), [ADR 0066](../adr/0066-catalog-fragments-for-declarations.md)). Presenters render only what a graph and a lesson frame declare; nothing is read from the page. The contract and its doc comments are in `src/graphs/base/declare/graphDeclaration.ts`; it is handler-owned, so report a needed change instead of making it. Worked examples: Taylor (`d34e9f9b` graph, `56414ad2` text, `c92616bb` frames), `a87ba078` (transformations, De Casteljau, phase portrait), `cd31e769` (triangle centres), `18c97a67` (linear map, cross-ratio).

## 1. Steps, in order

1. **Parity recording first, if the graph has none.** Add a `Sample` (a demonstration id, a file under `src/graphs/<family>/__parity__/`, five to eight states, each a list of `graph.parameters.write(key, value, 'learner')` writes or a custom `apply`, chosen so every shown value changes at least once) to `SAMPLES` in `src/graphs/base/declare/parity.test.tsx`, then run `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx`. Record before touching the graph: the declaration must reproduce the present panel, not new text. Check with `BEZEG_PARITY_CHECK=1 just unit ...` (add `BEZEG_PARITY_REPORT=1` for a `.report.txt` per recording). Parity matches rows by name, symbol or id and compares values; a recorded sentence may match a declared note.
2. **Write the ids union.** `export type <Graph>Ids = {param; row; note; legend; section; action}`, each a string union, `never` when unused (`TaylorIds`, `TaylorGraph.tsx:90`). Parameter ids are arbiter keys.
3. **Override `declaration()`** (`protected declaration(): GraphDeclaration<<Graph>Ids> | undefined`). It is a pure function of `this.state` and the bound parameters: no React, JSXGraph, board reads or functions in the result. Reuse the catalog keys the old panel used for each row (same words in both modes).
4. **Override `drawnObject(id)`.** Resolve each legend entry's `object` to `{color, visible}` of the element the graph drew; colour and visibility are never declared. Return `undefined` for an id not drawn.
5. **Override `performAction(id)`.** Run the same method the panel button calls, as the learner; throw on an unknown id.
6. **Write `<Graph>.declaration.test.tsx`** beside the graph with the real graph harness (copy `TaylorGraph.declaration.test.tsx`). Over at least five states: `checkDeclaration` finds nothing, every parameter key is bound, every legend entry resolves and is visible, readout values equal the panel. Then **break the declaration once and observe an assertion fail**, restore it, and report the failure text. A test that never failed proves nothing.
7. **Add the fragment** (section 4) and register it in `fragments/index.ts`.
8. **Declare the lesson frames** (section 2).
9. **Run the checks:** `just graph-check <graph-id>` (section 7), `just unit src/learning/content/declarationContract` (confirm your graph's frames were evaluated), `just unit src/localization`, `just unit src/learning/content`, `npx tsc --noEmit --pretty false`, `just build`.
10. **Write the placement note** `docs/reviews/ux-picks-app-wide/02-<graph>-placement.md` (two sentences of reasoning per parameter) and the paste-able summary (section 8).

## 2. Lesson frames

A frame declares the rows its text asks the learner to read and the controls it asks them to use. Build it with `const frame = frameDeclarer<<Graph>Ids>()` so an unknown id is a type error; `frame({highlight: [...], uses: [...], open: [...]})`. Do not rename frame ids (progress keeps its place). Pass `declare` according to the builder the lesson file uses:

- **`guidedStep`** (`src/learning/content/guidedStep.ts`): `declare: {explanation?, calculation?, observation?}`, one `FrameDeclaration` per frame kind the step builds.
- **A local `frame()` helper** (a file that builds frames by hand, e.g. `projectiveConicsGuidedLessons.ts:16`): add an optional `declare?: FrameDeclaration` argument and spread it as `...(declare ? {declare} : {})`.
- **Legacy `step(...)`** (a file building one synthesized frame per step): add an optional `declare` to the content type and to the frame it builds, and pass `declare: frame({...})`.
- **Chapter `step(id, title, body, prompt, actions, declare?)`** (`linearMapsChapterLessons.ts:32`): the step's single frame gets the `declare` (`${id}-content`); a frame that only has one when `declare` is given keeps its synthesized form otherwise.

Highlight rules:

- At most 3 (`MAX_FRAME_HIGHLIGHTS`); only rows and notes present in that scene's declaration (a row a scene hides cannot be highlighted; the contract test reports `no such row or note in this scene`). A note may be highlighted like a row.
- Highlight what the text talks about. Do not highlight a value the frame asks the learner to predict or find ("Napovej...", "Ugotovi..."): open the card, or highlight only the given inputs.
- `open`: `readouts`, `legend`, `tools`, `section:<id>`; only cards that exist in that scene.

`uses` and `open: ['tools']`:

- `uses` lists the parameters and actions the text asks the learner to operate. Each must exist in the scene and not be locked (`enabled` for actions).
- If a used control has `placement: 'tools'`, the frame must also `open: ['tools']`; a board control needs no `open`. The test says `an Orodja control the frame does not open`.

## 3. Placement rule

Taylor's rule: **what the learner changes while watching the graph goes on the board; a choice with a few named options goes on the board; a setting chosen once, a setup step or a display switch goes to Orodja** (`placement: 'tools'`, with a `section` that the frame opens).

Slice 6 refines the choice and toggle half: a choice (at most 4 options) or a toggle is a **puck** (`puck: true` on a `choice` parameter or a toggle action, `puck: {group, short}` on the actions of a group; both `placement: 'board'`, actions with `pressed`) only when a lesson asks the learner to switch it and notice the change, or exploration flips it repeatedly to compare. `placement: 'board'` alone leaves the control a board control that is not a puck (for example Taylor's example choice). Wrap the Orodja control in `PuckOwned` with the key (action id, group key and member ids) so it renders nothing while the puck exists, and the lesson frame needs no `open: ['tools']` for it. The rule is in [controls.md](../controls.md#puck).

A board control has no section. Put two sentences of reasoning per parameter in the placement note. Worked examples:

| Graph | Board | Orodja | Why |
| --- | --- | --- | --- |
| Taylor | centre `c`, degree `n` (count), point `x`, example (4-option choice), `show-error` action with `pressed` | nothing | Each is changed repeatedly with the curve and error bar in view; the example replaces the whole scene, so the choice stays next to it. The prediction-then-reveal step is a moment in the lesson, so an action, not a setting. |
| Transformations | `c`, `d`, `a`, `b`, tracked `u`, base function (7-option choice) | `toggle-ghost` action | The lesson is "change one parameter and watch"; the ghost is a display setting every scene switches on itself. |
| De Casteljau | `t`, `play` (toggle action, `pressed`), `reset` | `full-curve` action (section `construction`) | Moving `t` while watching the rows is the lesson; the full curve is a display switch chosen once. Speed has no arbiter key, so it is undeclared. |
| Phase portrait | system and equilibrium (choices), matrix `a`..`d`, zoom, time, `play-pause`, `reset-time` | seed count (section `seeds`) | Everything watched while changing is on the board; adding a start point is setup. Equilibrium and matrix entries are `locked`, not absent, where the system does not use them, so a frame can still name them. |
| Linear map | matrix entries, test angle, iteration `step`, composition indices, `play-pause`, `next-step`, `reset-run` | mode, example, display switches, composition sources (section `maps`) | The view and example define the scene and are chosen first; the running iteration is read live. In composition mode the entries move to Orodja and are locked when they come from a chosen map. |
| Triangle centres | the four centre switches (actions) | the triangle switch (section `display`) | Lessons ask the learner to flip O, I, H while dragging a vertex; no lesson asks for the triangle switch. |
| Cross-ratio | nothing declared | nothing declared | Nothing is bound in the arbiter, so only notes, status and legend are declared. |

## 4. Catalog rules (text)

- Every word is a `Message` (`message('key', {...})`); a string outside the `sl`/`en` catalogs is a type error. `checkDeclaration` and the contract test's text walk reject anything else (`not a catalog Message or FormattedValue`).
- **Numbers:** a number the language formats is `messageNumber(...)`; a number the graph already formatted (significant digits, an interval, a point) is a `FormattedValue` `{kind: 'formatted', text}`. It may hold digits, signs, separators, spaces, brackets and math symbols, never letters.
- **Math notation with letters** (`y = -2 f(0,5(x - 3)) + 1`) is refused by `FormattedValue`. Use a template key in your fragment with the formatted pieces as placeholders (`transformations_rule_value`). For formulas give `valueTex` (undelimited TeX, decimal comma as `{,}`) with `value` as the plain-text form.
- **No pass-through keys** such as `"{value0}"` that only carry a formatted string.
- **Fragments per family** ([ADR 0066](../adr/0066-catalog-fragments-for-declarations.md), [localization.md](../localization.md)): new declaration text goes in `src/localization/fragments/<family>.ts`, exporting `{sl, en}` with `en` checked against `sl`'s keys, registered with one line in `fragments/index.ts`. Never add declaration keys to `sl.ts` or `en.ts`; keys keep a family prefix and may not repeat across fragments and the main catalog (a unit test checks). Reuse existing keys where the old panel had them; triangle centres needed no fragment. Call `t('key')` without placeholders and `t('key', {value0: ...})` with exact names; after text changes run `npx tsc --noEmit --pretty false`.
- A choice option's `value` is an id, not text; only `label` is a `Message`.
- Lesson prose follows `lessonMathNotation.test.ts` (symbols in `\(...\)`, `{,}` decimals); never weaken it.

## 5. Handler decisions (settled)

- **Unbound parameters are not declared.** A declared parameter's `key` must be bound in the graph's arbiter (`graph.parameters`, task 01; `FUNCTION_PARAMETER_NAMES` keys where a lesson name exists). If a control has no key (cross-ratio handles, De Casteljau speed, triangle vertices), leave it in the present panel and report it. Do not add bindings.
- **Display switches are actions with `pressed`.** There is no bound toggle for a switch without an arbiter key: declare it as an action, `pressed` following the switch, and `performAction` runs the method the panel switch calls.
- **Statuses go in `status`** ("Iteracija se je ustavila."), with a tone; the panel's sentences that are state, not label and value, are `notes`.
- **Points are rows and legend entries.** There is no point-valued parameter kind; start vectors, seeds and handles stay draggable on the board and in the present panel, and appear as rows (with a swatch via `legend`) and legend entries.
- **Legend:** one entry per drawn curve or marker, `object` resolved by `drawnObject`; only entries drawn now are visible (the presenter reads visibility from the object).

## 6. Known contract gaps

Handler decisions pending at the gate before task 08 (`docs/reviews/ux-picks-app-wide/state.md`, "Contract gaps"), and what a converter will hit:

- No formula value kind: math notation with letters needs a fragment template key with formatted pieces.
- No point-valued or point-set parameter kind (phase-portrait seeds, point sets, vectors, triangle vertices, cross-ratio handles).
- Choice option values are strings; the arbiter may read a number (`phase-equilibrium` is 0/1).
- No place for board captions or insets (phase-portrait matrix columns, trace-determinant inset); parity lists captions no declared text contains as `uncoveredCaptions`.
- Declarations read `state`, which lags the live value during playback (De Casteljau `t`); presenters need the arbiter read.
- `RationalDecasteljauGraph` inherits De Casteljau's declaration unreviewed.
- **Parity does not compare `status`**, parameter values (a control's own read-off such as "t = 0,50" counts as covered by the declared parameter with that `symbol`), canvas-only values, MathJax output or live regions (`02-parity.md`); check statuses by hand.
- **Multi-object legend entries resolve to the first visible element** (`drawnObject` returns one object); an entry that stands for several drawn objects shows only the first one's colour and visibility.
- **`just graph-check` finds the declaration test by file-name prefix of the id:** the file's lower-cased base name must start with the id with hyphens removed (`projective-cross-ratio` finds `ProjectiveCrossRatioGraph.declaration.test.tsx`). Name the file accordingly, or it counts as FAIL.
- **A graph whose inspector renders from the declaration needs recordings of every mode**; linear map is recorded only for the basis and determinant modes, so the other modes are unchecked.

## 7. Checking one graph

`just graph-check <graph-id> [--route <path>] [--base <url>] [--seeds N]` ([commands.md](../commands.md)) runs the contract test filtered to ` <id>: `, the parity test in check mode on the graph's recordings (`<id>.json` or per-mode `<id>-<mode>.json`), and the graph's declaration test. A filter that matches no test, a missing recording or a missing declaration test is FAIL; the one exception is a graph whose declaration shows no values (no readouts, notes, readout help or status, as `bezier`), which has nothing to compare, so parity prints `n/a (no shown values)` and passes (`showsNoValues` in `parity.ts`). Logs are in `.command-logs/graph-check/`. With `--base` it also runs `just probe` and a short `just fuzz`; without it the browser part is skipped.

The contract test (`src/learning/content/declarationContract.test.tsx`) discovers a graph by its `declaration()` override, takes every lesson on it (catalog and chapter-registered), applies each lesson step's scene synchronously and checks every frame with `checkDeclaration`, `checkFrame`, `drawnObject` and the text walk. Its permanent seeded failures show what a mistake looks like: `highlight no-such-row: no such row or note in this scene`, `uses no-such-control: ...`, `legend curve: object "not-drawn" is not drawn`, `4 highlights, at most 3`, `uses p: locked in this scene`.

**Golden row:** when `src/graphs/**/__parity__/<id>.golden.json` exists (the generated baseline of the default state and every lesson step, `parityGolden.test.tsx`; re-record with `BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx` only for a reviewed value change), `just graph-check` adds a `golden` row comparing the current panels with it. It does not replace parity.

## 8. Per-graph recipe and summary

Order: parity recording, ids union, `declaration()`, `drawnObject`, `performAction`, declaration test with an observed failure, fragment, frames, `just graph-check <id>`, the other checks of step 9, placement note. Touch only the graph file, its lesson files, its tests, its recording, its fragment and its placement note; a shared base is a report, not an edit. Report (paste-able, ≤ 350 words):

```
Graph: <id>   Family: <family>
Ids: param ... / row ... / note ... / legend ... / section ... / action ...
Placement: board: ...; Orodja: ...; undeclared (no arbiter key): ...
Fragment keys added: ...
Frames declared: <lesson file>: <n frames> (builder kind)
Checks: graph-check <id> PASS/FAIL; declarationContract; localization; content; tsc; build
Observed failure: <assertion text after breaking the declaration>
Files touched: ...
Contract gaps: <file:line, what was needed>
```
