# Task 07 evidence: one owner for function-model rules (slice 1, convexity pilot)

Task: [07-function-model-rules.md](07-function-model-rules.md). Baseline: `8ead6cdd`. Slice 1 changes only the convexity model; the other ten function models are unchanged and listed below for slice 2.

## The pattern (copy this for the other ten models)

Three layers, one answer. `src/analysis/<x>Model.ts` owns the rules and returns data. The graph family owns the words.

```
analysis/convexityModel.ts            (no localization, React or JSXGraph)
  ConvexityIssue      = {kind:'example', allowed} | {kind:'range', points, min, max}
                      | {kind:'order', moving?} | {kind:'visibility'}      -- data, never text
  checkConvexityModel(data)   -> {ok:true, model} | {ok:false, issue: ConvexityIssue | undefined}
                                 stored-model validity + sanitizing; issue undefined = malformed (generic message)
  parseConvexityModel(data)   -> model | undefined          (= checkConvexityModel, kept for the collection and the graph's load path)
  chooseConvexityExample(v)   -> {ok:true, model} | {ok:false, issue}        edit: pick a named example
  moveConvexityPoint(m, p, v) -> {ok:true, model} | {ok:false, issue}        edit: validity, order rule and normalization (cleanNumber)
graphs/functions/convexityMessages.ts (the only place that turns an issue into a Message)
  convexityFileMessage(issue)  -> Message  ("... correct the value in the file")   used by the collection diagnosis
  convexityEditMessage(issue)  -> Message  (existing *_rejected_hint keys + 2 new) used by the setters
graphs/functions/functionPresetCollections.ts   diagnoseConvexity = checkConvexityModel + convexityFileMessage (no ranges)
graphs/functions/ConvexityGraph.tsx             setA/B/T/Example = model call + `throw new DomainError(convexityEditMessage(issue))`
graphs/functions/BaseFunctionGraph.tsx          DomainError(reason: string | Message); a Message is rendered into `.message`
                                                and kept as `.reason`. Controls still swallow DomainError by class (unchanged).
analysis/numbers.ts                             cleanNumber moved here; BaseFunctionGraph re-exports it (no caller changes)
```

Rules for slice 2: a model returns an issue (kind plus the values a message needs), never a string. Issue kinds mirror the existing localized diagnosis keys, so stored-file messages do not change. Edit functions take the current model and return the next model or an issue; "no change" returns the same object. A model that has no stored-file diagnosis yet still gets `check` returning `issue: undefined` for malformed data.

## Deletion test (knowledge callers lost)

- Collection (`functionPresetCollections.ts`): no longer knows the convexity range `[-2, 2]`, the example id list, the `a < b` rule, the "range beats order" precedence or the visibility type rule. Removed imports of `CONVEXITY_EXAMPLE_IDS`, `CONVEXITY_X_MIN/MAX`, `isConvexityExampleId`, `isConvexityInterval`, `isConvexityX`.
- Graph setters (`ConvexityGraph.tsx`): no longer know the range check, the `a < b` check (and which endpoint to name), `cleanNumber` normalization, the same-value shortcut or any English text. `isConvexityExampleId`/`isConvexityX` imports removed.
- Deleting `convexityModel.ts`'s `checkConvexityModel`/`moveConvexityPoint` would put these rules back into three callers (parser, collection, graph); that is the cost the module now absorbs.
- Adding a convexity field now touches `convexityModel.ts` (rule and issue), `convexityMessages.ts` (words) and the graph's view of the field; the collection file is not touched.

## Preset compatibility

Method: a temporary test (deleted afterwards) ran `functionPresetCollections.convexity.check` on 30 inputs in Slovenian and English, before and after the change, and diffed the rendered messages or accepted data. Logs: `.claude/jobs/8526e8df/tmp/a7-compat-before.json` and `a7-compat-after.json`. Result: `diff` reported identical (60 entries, 14 accepted, 46 rejected with the same message). Inputs covered: valid, boundary (`a=-2,b=2,t=-2`; `t=2`; `a=1.99,b=2`; `a=-0,b=0.0001`), unknown example (string and number), out-of-range a/b/t, reversed and equal endpoints, wrong types, NaN and Infinity, missing fields, `secondDerivativeVisible` of wrong type or `undefined`, extra properties, and combined violations (precedence). The existing assertions in `functionPresetCollections.test.ts` are untouched and pass.

## Tests added

- `src/analysis/convexityModel.test.ts`: direct model tests for validity, boundary and invalid values per field, rule precedence, malformed data, the example choice, point moves (range, order, normalization, no-change identity, no mutation).
- `src/graphs/functions/ConvexityGraph.test.ts`: a refused edit throws a `DomainError` whose text is localized in both languages (six refusals) and carries the structured `reason`. Existing assertions unchanged.

## Mutations observed (restored after each; tests: model, graph, collection files)

| Mutation | Result |
|---|---|
| `moveConvexityPoint`: `a < b` check made `<=` | 5 failed |
| `moveConvexityPoint`: `cleanNumber` skipped | 1 failed (`normalizes an accepted value ...`) |
| `checkConvexityModel`: range diagnosis removed | 5 failed |
| `checkConvexityModel`: visibility diagnosis removed | 4 failed |
| `convexityEditMessage`: a and b order messages swapped | 1 failed (graph localization test) |
| `diagnoseConvexity` returns `undefined` | 7 failed (existing collection tests) |
| Old `ConvexityGraph.tsx` (HEAD) with the new graph test | 1 failed: the new localization test (English text thrown) |

## Slice 2 inventory (at `8ead6cdd`)

Function models with a `diagnoseX` in `functionPresetCollections.ts` (the ten left, `:54-170` before slice 1): Bisection, MeanValue, Accumulation, Darboux, Extrema, Taylor, Sequence, UniformConvergence, Complex, FixedPoint. Model parsers without a diagnosis (generic message only): linear, exponential, trigonometric, continuity, derivative, riemann, areaBetween, arcLength. Also `complexReciprocalModel.ts` and `complexRootsModel.ts` (own tests, not in the function collection). `src/analysis/*Model.ts` count: 21 files.

`new DomainError` lines by file at baseline (`git grep -c`), after slice 1 convexity is 2 instead of 6:

- `src/graphs/functions/` (72 lines, 19 files incl. `IterativeFunctionGraph.tsx`): Accumulation 3, ArcLength 2, AreaBetweenCurves 2, Bisection 5, Continuity 1, Convexity 6, Darboux 7, DefiniteIntegral 4, Derivative 3, ExponentialFunction 1, Extrema 5, FixedPoint 3, IterativeFunction 1, LinearFunction 3, MeanValue 7, Sequence 4, Taylor 4, TrigonometricFunctions 5, UniformConvergence 6.
- `src/graphs/complex/` (13): ComplexMultiplication 7, ComplexReciprocal 3, ComplexRoots 3.
- `src/graphs/linear/` (6): LinearMap 6 (two throws forward another module's message, `LinearMapGraph.tsx:130,178`).
- Total 91 lines at baseline, 87 now. `BaseFunctionGraph.test.ts` also constructs `DomainError`.

Learner-visible paths for these messages: lesson actions propagate the error; `GuidedLesson.tsx:173,214,367` and `LessonSession.ts:211` show `error.message`. Inspector controls swallow it (`ignoreOutOfDomain`, `BaseFunctionGraph.tsx`). So localizing at the throw is enough; the language is read at throw time.

## Decisions and risks

- `DomainError` now accepts a `Message` (backward compatible with strings, so the other graphs are unchanged until their slice). Chosen over a subclass so all slices share one type.
- Setter messages reuse the existing `convexity_a/b/t_rejected_hint` keys. Two keys were added in `sl.ts` and `en.ts`: `convexity_endpoint_range_rejected` and `convexity_example_rejected`. No new glossary term (krajisce and primer are used elsewhere in the catalog).
- The file messages stay "correct the value in the file"; the setter messages are separate because the file wording is wrong for a lesson or a number field. That is why the messages module has two functions.
- `ConvexityEditIssue` allows `order` without `moving`; the message defaults to the `a` wording. Slice 2 can tighten the type if it helps.
- The graph's drag clamp and its other uses of `CONVEXITY_X_MIN/MAX` and `CONVEXITY_X_STEP` still import from `analysis/convexity`; they are display and gesture settings, not validity rules.
- Not verified here: browser behaviour (invalid input and Preset import in both languages), the production build, and the full unit suite.

## Handler review of the pilot (2026-10-31)

- **Handler fix:** `convexityEditMessage` formats range bounds in the current language, as the fields' own `rejectedHint`s do (`ConvexityGraph.tsx`, `FixedPointGraph.tsx`). File messages keep the language-neutral file-contract form. Convexity's bounds are the integers ±2, so no visible text changed. Rule for slice 2: edit messages use `currentLanguage()`, file messages the "en" form.
- **Engineering + localization review** (`bezeg-reviewer` Sonnet): no blocking finding. Acceptance and diagnosis order match HEAD; setters match HEAD apart from text; the two new Slovenian keys are fine.
- **Inputs for slice 2:**
  - `DomainError(Message)` renders text at throw time. `GuidedLesson.tsx` and `LessonSession.ts` store `error.message`, so a startup error stays in the old language after a switch. HEAD's English text had the same flaw (not a regression). Slice 2 should build `DomainError` on `LocalizedError`'s lazy text (`localization/index.ts`) and have those callers render lazily.
  - `ConvexityIssue` is numeric-only, and `convexityEditMessage` passes single-letter field names as parameters. Models with enum, integer or array fields need further issue kinds and per-field message keys. Look for a shared boolean-field check across models.
