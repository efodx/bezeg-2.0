# Guide: converting ONE more graph to explicit declarations

Worked example: Taylor (src/graphs/functions/TaylorGraph.tsx, search `workspaceUx`). Others: FunctionTransformationGraph.tsx, curves/bezier/DecasteljauGraph.tsx. Contract: src/uxPicks/declare/graphUx.ts.

## 1. Read (10 min)
1. The graph's `renderReadout`, `renderLegend`, `caption(...)` calls (board text) and any `renderControls` paragraphs that only restate state.
2. Note every number the learner can read (this is the card content) and which are values vs sentences (notes).
3. Read the lesson for the graph: which values do its frames talk about?

## 2. Declare
Override `protected override workspaceUx(): GraphUx | undefined` in the graph class.
- First line: `if (!pickOn("boardText")) return undefined;` (pick off = master UI exactly).
- Read the graph's own model/state (`this.model`, `this.state`), never DOM. It runs on every render, so values follow the state.
- `formula`: TeX, no delimiters, doubled backslashes in TS strings. Decimal comma inside TeX must be `{,}` (Transformations: `.replace(/,/g, "{,}")`).
- `readouts`: groups of rows `{id, name, symbol?, value, tone?}`. Group by meaning (setup / values at x / traced point), titles short. `id`s are stable: lesson frames refer to them.
- `name` is plain words, `symbol` TeX, `value` plain text from the graph's own formatter (same numbers as the old panel, decimal comma).
- **Math values (card redesign 4ddf9677):** when a value is a formula or equation (`x = 2`, `y = x + 2`, a list of zeros, a vector), also give `valueTex` (undelimited TeX, decimal comma `{,}`, same value mathematically as `value`); the card typesets it. Plain numbers stay `value` only. Example: `RationalFunctionGraph.workspaceUx`.
- **Rows link legend entries, never duplicate them (owner):** a row about a drawn object sets `legend: "<legend entry id>"`; the card draws that entry's swatch before the name and the Legenda card drops the entry. Do not rely on `tone` for colour (it only mutes). The legend entry's colour must be the colour the object is actually drawn in (check the board). Example: rational functions zeros/pole/asymptote rows, Voronoi `query-point`.
- **Notes:** the first note is shown, the rest sit behind "Več". Put the most useful note first; never repeat a row's content in a note.
- **Catalog-key rule (trial defect, both models).** Before writing any `name`, `title`, legend `label` or puck `help`, list the `t("...")` keys the graph already uses for that quantity: `grep -n 't("' <graph file>` and the keys inside its `renderReadout`/`renderLegend`/`renderControls`. Reuse the exact key the old panel showed for that row (same words for the learner in both modes). Inline Slovenian is allowed only when no key exists; list every inline string in your notes. Never add catalog keys.
- Tones: `primary`/`comparison` = the curve colours, `error`, `accent` (construction), `muted`. Use a tone only when the value belongs to a drawn object of that colour.
- `notes`: state sentences (muted). `readoutHelp`: ReactNode behind "?". `legend`: `{id,label,kind: line|dashed|area|point,color}` using GraphPalette. **Only entries drawn in the current state**: each entry is conditional on the same state flag that makes the object visible (toggle each visibility control and each mode once and check the legend follows). `sections`: read-only explanatory cards `{id,title,body}` (Transformations: "Vrstni red operacij").
- `pucks` is not implemented by the readout work (separate contract).

## 3. Stop drawing what moved (pick on only)
- Board captions: `visible: boardTextOnBoard` on each `caption` line (`const boardTextOnBoard = () => !pickOn("boardText")`).
- Inspector: `renderReadout()` / `renderLegend()` start with `if (pickOn("boardText")) return null;`.
- Keep anything projection or tests need (e.g. no change to model, markers).
- A graph with no board text (De Casteljau) stops nothing.
- Toggle takes effect on the next graph render (GraphHost does not subscribe to picks).

## 4. Lesson frames
In the lesson content file, `frame(id, kind, ux?)` takes `FrameUx` `{open?: ('readouts'|'legend'|'section:<id>')[], highlight?: rowId[]}`. Add it only to frames whose prose actually names those values/legend entries (read each frame). Examples: analysisGuidedLessons.ts (`readouts(...)` helper), schoolFunctionGraphsGuidedLessons.ts (`step({..., ux})`), guidedLessons.ts (De Casteljau). Calculation frames: none. `GuidedLesson.tsx` publishes `frame.ux` (`useFrameUxPublisher`).
- **Legacy `step(content)` files** (most `*GuidedLessons.ts` files build frames in a local `step` with `frame(id, kind)` and no `ux`): copy the pattern of `schoolFunctionGraphsGuidedLessons.ts` lines 11-41 into that file: `import type {FrameUx}`, `frame(id, kind, ux?)`, `StepContent.ux?: {explanation?, observation?}`, and `step({ux, ...content})` passing `ux?.explanation` / `ux?.observation`. Change nothing else in the step builder.
- **Highlight rules (trial defects).** (1) Never highlight a row whose value the frame asks the learner to predict or find (an observation prompt "Kaj se zgodi…", "Ugotovi…", "Napovej…" about that value): open the card, highlight nothing or only the given inputs. (2) Never highlight or open a row/legend entry that the frame's scene hides (read the scene's visibility/overlay actions; a hidden object's row is absent or meaningless). (3) Highlight only rows that exist in `workspaceUx()` for that scene's state (ids are checked by eye, not by the compiler: grep each id). (4) At most 3 highlighted rows per frame.

## 5. Verify
1. `npx tsc --noEmit --pretty false`.
2. Preview http://127.0.0.1:4460/bezeg-2.0/ with `?ux=a1,a19,a3,a29,boardText,dockTools,b1,toolsCard`. Deep links hit the error page in dev: open /demonstrations, then click the graph's link (see round6/explicit/shot.cjs, walk.cjs, misc.cjs).
3. Compare each card value with `?ux=none` (the old panel) on the same state.
4. Walk the lesson (`?learn=1`, Naprej until the end): no page errors, highlights match the frame text (walk.cjs prints highlighted rows per frame).
5. Card at 310-400 px and 1024x768 (cards fold; click the title to open). An unconverted graph (analysis/bisection) must show its original UI.
6. Stale Vite: if the app shows "Strani ni mogoče odpreti" for every route, a module was served empty; `touch` the file.

## Pucks
Pucks are exactly what the graph declares, in this order; nothing is guessed from controls.
1. Give each parameter control a key: `<Slider paramKey="taylor.c" .../>`, `<CountSetter paramKey="taylor.n" .../>`, `<AngleSlider paramKey="circle.alpha" .../>` (props only; a loop over fields uses a template key, e.g. `transform.${field}`). A control in a shared component (De Casteljau's `DecasteljauAnimationControls`) takes the key there. Never write a local wrapper around a shared input to get a key: if a shared input lacks `paramKey`, add the optional prop to it and pass it through to `Slider`/`CountSetter` (one line), and say so in your notes.
2. In `workspaceUx()` return `pucks: [{param: "taylor.c", help: t("taylor_points_help")}, ...]`. `help` is the card text behind the puck's "?" (catalog `t()` text where one exists, inline Slovenian otherwise). Absent `pucks` = no pucks; `[]` = none.
3. Check: puck width stays constant while the value sweeps (the value box reserves the widest formatted value; sweep with Home / PageUp and compare `getBoundingClientRect().width`).

## View focus
A graph declares what the view keeps in view (`GraphUx.focus`, `FocusDecl`; design: docs/reviews/ux-picks/view-fit.md). Absent = the view is never fitted.
```ts
focus: {
  at: values => ({                       // PURE in the param values (registry keys), also evaluated at nearby values
    must: [{kind: "point", at: [c, 0]}, {kind: "segment", from: [x, fx], to: [x, tx]}],   // stay visible, clear of cards
    nice: [{kind: "curve", f: u => f(u), from, to}],                                      // when room allows
  }),
  reach: {"taylor.n": [4, 5, 6]},        // optional: values to predict at instead of +-25 % of the range / +-2 steps
  limits: {maxOut: 1.6, maxIn: 1.6},     // zoom-out limit; zoom-in (fill mode only)
}
```
- Shapes (`focusShapes.ts`): point, segment, curve `y=f(x)`, parametric, line, region, disc, band. Clamp y of curves near poles/steep growth to the default view (Taylor: `clamp`). Return NaN where undefined; it is dropped.
- Read values with `values["key"] ?? this.model.x`; never read the board from `at`.
- Must points are what cards must not cover: control points and the traced point, not every construction point (De Casteljau: control points + B(t); intermediate rows are `nice` or omitted).
- Behaviour you get for free: fit on load, on lesson action, on resize and when a card opens; a drag never refits while the pointer is down, on release it refits if a must point is under a card; learner pan/zoom pauses auto-fit; "Prilagodi točkam" resumes (fill mode); reduced motion jumps, otherwise a 250 ms glide. The view the graph or a lesson asks for is kept as intent (`setIntentBox`); the fit never overwrites saved view state.
- Lesson frames declare no focus yet (`FrameUx` has no `focus`); a frame that needs a detail view sets its own view.
- Example: `TaylorGraph.workspaceUx` / `focusDecl`.

## Removal inventory (from NOTES, after slice 1)
Deleted: boardText/boardTextLayout.ts, boardTextTex.ts, lessonRefs.ts(+test), legendStore.ts, BoardSection.tsx, graphs/legend/markBoardLegend.ts and its calls (ComplexPower, EulerCircle, PhasePortrait, ContourMap, LinearProgram: pickOn view/legend tweaks reverted). Kept: autoOpenStore.ts (DockCard). Shim: boardText/BoardReadout.tsx is pass-through; about 30 graphs still wrap panels in it. Unwrap on conversion; delete when none remain. Plumbing: BaseGraph.workspaceUx + `ux` in getWorkspacePanels, DemonstrationWorkspace -> useGraphUxPublisher, model.ts LessonFrame.ux, guidedLessons.ts GuidedLessonFrame.ux, catalogLessonAdapter.ts copies `ux`.

## Tool sections

Tool sections (fold chevron, "?" help) are declared with `ToolSection` (`src/inputs/ToolSection.tsx`). Nothing is detected from the DOM.

```tsx
<ToolSection id="taylor-points" title={t("...")} help={t("...")} defaultFolded>...controls...</ToolSection>
```

- Props: `title`, `id` (stable, unique per graph; keys the stored fold `ux-tools-fold:<id>`), `foldable` (default true), `help` (section-level help: move the group's `p.inspector-help` here), `defaultFolded`, `name` (accessible name when titles repeat across tabs), `className`.
- Other shapes: `element` + `headingElement` + `headingClassName` (+ `rootRef`, `rootProps`) reproduce the markup exactly, e.g. `PointListInput` (`fieldset.point-list > legend`), `Commands` (`div.card-body > div.card-title h5`), the function reveals (`div.inspector-reveals > h3.inspector-reveals-title`, help via `BaseFunctionGraph.revealsHelp()`).
- `pickTitle`: a title shown only while toolsCard is on, for a group that has no heading on master (master stays unchanged).
- Pick off: the old markup, help as `p.inspector-help` after the children. A section with no title (and no pickTitle) is a plain group.
- Converted shared panels: Commands, curve selection, graph view / curve display, presets / export figure, PointListInput, function reveals. Native `<details>` (`InspectorDisclosure`, editing mode) already collapse and are left as they are. A graph's own private groups stay plain until it declares them.
- Unit tests see the plain app (`picks.ts` starts empty under vitest); a test that needs a pick calls `setPicks`.
