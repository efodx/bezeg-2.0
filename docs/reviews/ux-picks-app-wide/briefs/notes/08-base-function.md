# 08 step 2, slice 1: BaseFunctionGraph (handoff note)

## Plan

The base cannot know any subclass's rows (each builds them inline in `renderReadout` with its own labels and
formatting), so "common" is a mechanism, not content. The base gets one opt-in hook and derives the declaration from it:

- `protected functionPanel(): FunctionPanel | undefined` (default `undefined`). A subclass returns `{rows, notes?, help?,
  status?, plotted?}` as declared data (`Message` names, `MessageNumber`/`FormattedValue` values).
- `BaseFunctionGraph.declaration()` is implemented once: `undefined` without a panel (every subclass behaves as today);
  with one it declares the `values` readout group, notes, help, status and default marks (the plotted function sampled over
  the view box, `nice` marks, so the director can run).
- Panels render from the same data (`renderDeclaredReadout()` / `renderDeclaredStatus()`), so panel and declaration cannot
  differ; `FunctionReadout`/`FunctionStatus` themselves are unchanged.
- A subclass that overrides `declaration()` (Taylor, transformations, bisection, linear map) keeps it untouched; they may
  call `this.commonDeclaration()` to compose.
- No subclass changes visibly unless it opts in. First opt-in: exponential-function (plain), with a parity recording.

Revision: `declaration()` is NOT overridden in the base (declarationContract finds declaring graphs by that override and 36
tests failed when it was); the base overrides `getDeclaration()` instead: own `declaration()` first, else the common one.

## Results

- Files: BaseFunctionGraph.tsx (`FunctionPanel`, `functionPanel`, `commonDeclaration`, `getDeclaration`, `plottedMarks`,
  `renderDeclaredReadout`, `renderDeclaredStatus`), ExponentialFunctionGraph.tsx (opt-in), its declaration test,
  parity.test.tsx sample, `__parity__/exponential-function.json` (recorded before the change).
- Parity (exponential, check mode): every row and note matches in 7 states; only "missing output" for the slider read-off
  (`a` has no arbiter binding, so no declared parameter; the known unbound-parameter gap). Not declared on purpose.
- Checks: tsc clean; `just unit` functions+analysis+base+declarationContract passed; graph-check taylor, bisection,
  linear-map pass; lint passed; observed failure: plotted +0.01 fails 5 tests (close-to 5e-10).
- Browser (4483, 1440x900): exponential shows readouts in an "Odcitki" board card, bisection same, no error seen.
- Open: the other 34 subclasses are not opted in; each needs its own rows (Message names) and parity recording.

## Revision 2 (handler decisions)

`BaseFunctionGraph.declaration()` is now the panel-derived one (`undefined` without `functionPanel()`); a subclass that
overrides `declaration()` keeps its own and may spread `commonDeclaration()`. `getDeclaration()` is no longer overridden.
`declarationContract` discovery is now "`getDeclaration()` returns a declaration" (the one authorized suite edit).
`parity.ts` gained one rule: a bare slider read-off ("2") is covered when a declared row shows the same value and the graph
declares a parameter (the slider prints the value without "a ="). Exponential is the worked example: `a` is bound and declared
as a board puck (`ExponentialFunctionGraph.tsx`: `parameterBindings`, `declaration`, `functionPanel`), its slider is wrapped in
`PuckOwned`, the mirror switch stays in the display settings, and the five lesson steps in `functionGuidedLessons.ts` carry
frames (`exponentialFrame({highlight, uses})`).

## Recipe: converting one BaseFunctionGraph subclass (lane brief)

Touch only the graph file, its lesson file(s), its tests, its recording, its fragment. Example: exponential-function.

1. **Record first.** Add a sample to `SAMPLES` in `src/graphs/base/declare/parity.test.tsx` (5-8 states, every shown value
   changes at least once; graphs without arbiter keys use a custom `apply` with `runAs('learner', () => graph.setX(v))`),
   then `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx` before touching the graph.
2. **Ids type** `export type <Graph>Ids = {param; row; note; legend; section; action}` (`never` where unused).
3. **`functionPanel()`**: return `{rows, notes?, help?, status?, plotted?}` from `this.model`. Row `name` is a catalog
   `message(key)` (reuse the keys the old panel used), a symbol-only row uses `symbol`; values are `messageNumber(v, decimals)`
   (what `formatNumber(v, language, decimals)` showed), `message(...)` for words, or `{kind: 'formatted', text}` for text the
   graph formats itself (no letters). `plotted` is the main curve `x => f(x)` so view marks exist. New text goes in a fragment
   (`src/localization/fragments/<family>.ts`), never `sl.ts`/`en.ts`.
4. **`renderReadout()`** becomes `return this.renderDeclaredReadout()`; a status group becomes `this.renderDeclaredStatus()`.
   A panel that differs from the base shape (several groups, reveals, tables) stays as is: leave `functionPanel()` unset for
   that part or skip the graph; undeclared parts fall back to Orodja.
5. **Bound parameters**: `parameterBindings()` with the lesson name as key (`FUNCTION_PARAMETER_NAMES`), `read` from the
   model and `apply` the existing validated setter. Override `declaration()` as
   `{...this.commonDeclaration(), parameters: [...]}` (range/count/choice, placement by the guide's rule; board for what is
   changed while watching). Wrap each Orodja control that a puck replaces in `<PuckOwned param="key">`. Writes in tests and
   parity go through `graph.parameters.write(key, value, 'learner'|'lesson')` or `runAs`.
6. **`drawnObject` / `performAction`** only when you declare a legend or actions (guide steps 4-5).
7. **Lesson frames**: pass `declare` in the lesson builder (`frame(id, kind, exponentialFrame({highlight, uses}))` where the file
   has a local `frame` helper; extend the helper with an optional `declare`). At most 3 highlights, only rows the scene shows
   (a row that exists only in some states, e.g. `mirror-base`, only in scenes that show it), `uses` only unlocked params.
8. **Test** `<Graph>.declaration.test.tsx` (copy `ExponentialFunctionGraph.declaration.test.tsx`): `checkDeclaration` empty,
   keys bound, rows equal the inspector, marks follow the curve, over >= 5 states; break it once and report the failure.
9. **Checks**: `BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx` (no differences), `just graph-check
   <id>` (the declaration test file name must start with the id without hyphens), `just unit src/learning/content/declarationContract`,
   `just unit src/graphs/functions`, `npx tsc --noEmit --pretty false`, `just lint <files>`, then a screenshot at 1440x900.
10. **Report** per the guide's section 8 format, plus: rows left in the old panel and why.

## Status at handoff (partial)

Done and observed: tsc clean; `just unit` functions+analysis+base+src/learning/content passed (incl. declarationContract with the new
discovery); parity check-mode passes for exponential; graph-check exponential-function (with --base) pass: contract, parity,
declaration, fuzz. Not seen finished: graph-check --base for taylor/bisection/linear-map (logs `.command-logs/gc2-*.log`),
and `just lint` on the final file set (earlier lint on the first set passed). Browser screenshot after puck change not retaken.

## Close-out (round 2)
- Fingerprint now omits the first frame's `declare` (premise checked: frame `declare` flows GuidedLesson.tsx:595 -> card layer; highlights are `data-highlight` on ReadoutsBody rows/notes, cards.css:7; no JSXGraph style). Changed: guidedExamplePreviews.test.ts ~90, scripts/generate-guided-example-inventory.cjs sceneForStep. Generator output equals committed capture-inventory.json (restored via checkout). No other script computes it.
- Capture script UI-string expectation to fix (handler): scripts/capture-guided-example-previews.cjs:710.
- Exponential declaration test: arbiter write/read-back + refused -5; red check (apply ignores value) failed it, log 08d-exp-red.log; restored.
- linear-map probe valueWidthDrift: same failure on published master (08d-gcb-linear-map-master.log): pre-existing.
