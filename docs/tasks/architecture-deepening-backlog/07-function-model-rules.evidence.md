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

## Handler verification of the pilot (2026-11-01)

- Full check: see the [A4 evidence](04-generic-spline-changes.evidence.md#handler-verification-2026-11-01). The same runs cover this commit.
- Browser (`bezeg-smoke` Haiku, plus a handler Playwright script for the file import; production preview on port 4311, Chromium 1440×900, fresh contexts) on `/bezeg-2.0/analysis/convexity`. In every rejected case the readout stayed at `a = −1, b = 1,5, t = 0,5`, and the input showed `aria-invalid="true"` with the hint.
  - SL out of range (a=5, b=−3, t=9): "Vnesi vrednost med −2 in 2.".
  - SL order: a=2 gives "Krajišče a mora ostati levo od b (a < b). Najprej premakni b."; b=−1,5 gives "Krajišče b mora ostati desno od a (a < b). Najprej premakni a.".
  - After a live switch to EN: a=2 gives "The endpoint a must stay left of b (a < b). Move b first."; t=9 gives "Enter a value between −2 and 2.".
  - A valid a=−0.5 applies.
  - Not checked: whether a hint that is visible during a language switch re-renders. Typing the non-number "abc" shows no hint and applies nothing; that is `NumberInput`'s existing draft behaviour, not this model.
  - Preset import, using files built from the unit-test contract:
    - a > b is rejected with "Datoteka ni podprta: krajišči morata izpolnjevati a < b (a strogo manjši od b); popravi vrednosti v datoteki. …" (EN: "Unsupported file: the endpoints must satisfy a < b …").
    - a=−2,5 is rejected with "… točke a, b in t morajo biti števila med −2 in 2; …" (EN likewise).
    - In both cases the confirm button stays disabled and the Preset list is unchanged. Non-JSON is rejected with "neveljaven JSON". An empty export `{}` is rejected because it has no collections (existing behaviour).
    - A valid file imports, and its Preset applies `a = 0, b = 2, t = 1,8`.
  - No console or page errors.


## Slice 2b: Bisection, MeanValue, Accumulation, Darboux (2026-11-01)

- **Workers:** two `bezeg-worker` Sonnet `medium` workers ran in parallel, each owning its models' blocks (dispatched 08:16Z).
  - Bisection + Darboux: about 102k tokens, 43 tools, 8.3 min.
  - MeanValue + Accumulation: about 80k tokens, 36 tools, 6.9 min.
  - Neither needed a repair.
- **Shape:** each model follows the pilot pattern:
  - `check<X>Model` plus edit functions in `src/analysis/<x>Model.ts`.
  - `<x>FileMessage` and `<x>EditMessage` in `src/graphs/functions/<x>Messages.ts`.
  - The setters throw `DomainError(<x>EditMessage(issue))`.
  - The `diagnose<X>` blocks delegate to the models.
  - The handler moved `cleanNoise` into `analysis/numbers.ts`, which keeps a single copy. `BaseFunctionGraph` re-exports it.
- **New keys** (in both `sl.ts` and `en.ts`):
  - `<bisection|darboux|mean_value>_endpoint_range_rejected`
  - `<bisection|darboux|mean_value>_example_rejected`
  - `mean_value_c_range_rejected`
  - `accumulation_function_rejected`
  - `accumulation_a_range_rejected`
  - `accumulation_x_range_rejected`
  - Order refusals reuse the existing `*_rejected_hint` keys and `darboux_refine_limit`.
  - Candidate cleanup: one shared key per text, since the four example keys and the three endpoint-range keys have identical wording.
- **Behaviour:** acceptance, diagnosis precedence and normalization match HEAD, according to the reviewer. One change: the MeanValue setter skips the commit when its cleaned value equals the current one (within 1e-9 noise). HEAD committed a model with the same field values. This is not visible, and Darboux already behaved this way. Accumulation keeps HEAD's raw-value comparison.
- **Mutations observed by the workers:**
  - A setter throwing HEAD's English text fails the new localization tests (Bisection, Accumulation).
  - The order-check mutations fail the model tests (Darboux `>=`; MeanValue's b-order check fed `value + 1`).
- **Review:** `bezeg-reviewer` Sonnet (engineering + localization) found no defects.
- **Handler checks on the final tree:** `just typecheck`, `just lint src` and `just unit src/analysis src/graphs/functions src/localization` all passed. Collection tests are unchanged.
- **Not run:** `just check` (deferred to A7 verification) and browser checks.

## Slice 2c: Extrema, Sequence, Taylor (2026-11-01)

- **Workers:** two `bezeg-worker` Sonnet `medium` workers ran in parallel (dispatched 08:30Z).
  - Extrema + Sequence: about 113k tokens, 61 tools, 19.8 min.
  - Taylor: about 63k tokens, 22 tools, 4.5 min.
  - Neither needed a repair.
- **Shape:** the same pattern as slice 2b.
  - Taylor issue kinds: `example`, `center` (a per-example range; min = max means a fixed center), `degree`, `x`, `visibility`.
  - Sequence `terms` has a file issue only, because terms change only through the iteration.
  - A stale `eslint-suppressions.json` entry for `SequenceGraph.tsx` was removed: its unused imports, including a dead `LessonActionRegistry`, are gone.
- **New keys:**
  - `extrema_endpoint_range_rejected`
  - `extrema_example_rejected`
  - `sequence_example_rejected`
  - `taylor_example_rejected`
  - `taylor_center_fixed_rejected`, whose Slovenian text the handler changed:
    - Old: "Središče tega primera je negibno pri c = …".
    - New: "Pri tem primeru je središče stalno: c = …".
    - Why: "negibna točka" is the catalog's term for a fixed point of an iteration, and "stalno" matches `taylor_center_fixed_help`.
- **Mutations observed by the workers:**
  - A setter throwing English fails the new localization tests (Sequence, Taylor).
  - Disabling the Extrema a-order check fails 5 tests.
  - Loosening the Taylor degree check fails the model test and 3 graph tests.
- **Review:** `bezeg-reviewer` Sonnet (engineering + localization) found no defects.
  - Acceptance, normalization, precedence and same-value behaviour match HEAD.
  - Process deviation: the reviewer ran `npx vitest run src/graphs/functions src/analysis` (2065/2065 passed on the final tree) instead of going through `just`.
- **Handler checks on the final tree:** `just typecheck` and `just lint src` passed. The handler's `just unit src/analysis src/graphs/functions src/localization src/learning` run was stopped by OS memory pressure before it finished.
  - Unit evidence on the final tree is therefore the reviewer's run, plus each worker's own file-filtered runs.
  - `just check` stays required at A7 verification.

## Slice 2d: UniformConvergence, FixedPoint, Complex (with reciprocal and roots) (2026-11-01)

- **Workers:** two `bezeg-worker` Sonnet `medium` workers ran in parallel (dispatched 08:55Z), after the owner approved continuing despite memory pressure.
  - UniformConvergence + FixedPoint: about 113k tokens, 52 tools, 10.7 min.
  - Complex: about 120k tokens, 58 tools, 11.9 min.
  - Neither needed a repair.
- **Shape:**
  - One messages module per family: `uniformConvergenceMessages.ts`, `fixedPointMessages.ts`, and `src/graphs/complex/complexMessages.ts`, which serves all three complex models.
  - `complexReciprocalPresets.ts` and `complexRootsPresets.ts` delegate to `check*Model` with the same precedence.
  - `MAX_TYPED_ARGUMENT` moved into `complexModel.ts`.
- **New keys:**
  - `uniform_example_rejected`
  - `fixed_point_example_rejected`
  - `complex_example_rejected`
  - `complex_argument_zero_rejected`: "Argument števila 0 ni določen. Vrednost je zavrnjena." (EN: "The argument of 0 is undefined. The value is rejected.")
- **Behaviour:** acceptance, normalization and precedence match HEAD, according to the reviewer. One text change: an r refused for leaving x outside [0, r], and an r off the grid, now both show the existing `uniform_r_rejected_hint`, which names both rules. HEAD showed two separate English texts. The reviewer accepted this (low).
- **Existing tests edited:**
  - Seven `toThrow(/English/)` assertions in `src/graphs/complex/*Graph.test.ts` and one in `UniformConvergenceGraph.test.ts` became the Slovenian text. The reviewer confirmed these are pure substitutions.
  - A `changeUniformR` test moved from `uniformConvergence.test.ts` to `uniformConvergenceModel.test.ts`, with stronger cases.
  - Stored-file tests are unchanged.
- **Mutations observed by the workers:**
  - A graph throwing English fails the localization tests (Uniform, Roots).
  - Changing the n bound fails the model boundary test.
  - Disabling the zero-argument guard fails `complexModelRules.test.ts`.
- **Review:** `bezeg-reviewer` Sonnet. No high or medium findings. Low findings:
  - The `complex_coordinate_rejected_hint` and `complex_recip_radius_rejected_hint` texts hard-code their ranges. This is a pre-existing pattern and is deferred.
  - The shared `IterativeFunctionGraph.tsx:82` `cannotAdvanceMessage` is still English. Bisection, Sequence and FixedPoint use it, and it moves to slice 2e.
- **Handler checks on the final tree:** `just typecheck`, `just lint src` and `just unit src/analysis src/graphs/functions src/graphs/complex` all passed.

## Slice 2e decision (handler, 2026-11-01): remaining English throws

- **Function graphs without a diagnosis** (Linear, Exponential, Trigonometric, Continuity, Derivative, DefiniteIntegral, AreaBetweenCurves, ArcLength), plus `IterativeFunctionGraph.cannotAdvanceMessage`:
  - These graphs' fields already fall back to the localized generic `number_rejected_hint`, so their English setter text reaches a learner only when a lesson scene action fails.
  - **Decision:** localize these setter throws with shared, parametrized keys.
  - **Deferred:** model-rule ownership for these parsers. They have no stored-file diagnosis, and each rule is already a single predicate in `analysis/`. Adding file diagnoses is new behaviour, not part of A7.
  - Brief: handler job file `a7-2e-brief.md`, copied into handler handoff 5.
- **LinearMap (`LinearMapGraph.tsx:130,140,156,162,178,188`):** the slice 2e worker first establishes whether any throw is learner-reachable. These throws either reach controls (which swallow them) or validate authored scene payloads. If no learner path exists, record that and leave the kernel's messages in place.

## Slice 2e: remaining function-graph setter throws (2026-11-01)

- **Worker:** one `bezeg-worker` Sonnet `medium` (dispatched 09:12Z, about 101k tokens, 60 tools, 10.9 min). No repair. The handler made two small edits:
  - It aligned the Slovenian h = 0 wording with `derivative_h_note`.
  - It applied the review's low finding: Derivative now names its field with `derivative_function_label`.
- **Shape:**
  - `src/graphs/functions/functionSetterMessages.ts` has three shared builders: `numberRangeRejected`, `integerRangeRejected` and `choiceRejected`. Each names the field by its existing `*_label` key as a nested `Message`.
  - Linear, Exponential, Trigonometric, Continuity, Derivative, DefiniteIntegral, AreaBetweenCurves and ArcLength throw `DomainError(message(...))`.
  - `IterativeFunctionGraph.cannotAdvanceMessage()` now returns `Message`, and Bisection, Sequence and FixedPoint localize it.
- **New keys:**
  - Shared: `function_number_range_rejected`, `function_integer_range_rejected`, `function_choice_rejected`.
  - Graph-specific, with special explanations: `linear_coordinate_rejected`, `linear_vertical_rejected`, `linear_limit_rejected`, `trig_phase_rejected`, `derivative_h_rejected`.
  - `cannotAdvanceMessage`: `bisection_cannot_advance`, `sequence_all_terms_shown`, `fixed_point_cannot_advance`.
- **Behaviour:** predicates, bounds and normalization are unchanged, according to the reviewer. Only the thrown text changes.
- **Tests:**
  - `refusalTexts.testutil.ts` throws each refusal once per language and asserts the exact SL and EN text. It is used in the 11 graph tests.
  - Two English-regex assertions in `LinearFunctionGraph.test.ts` now match the Slovenian text.
  - The worker observed the new Continuity test fail against the restored English throw.
- **LinearMap decision:** the kernel's English messages stay. Deferred to the linear-map lesson.
  - `LinearMapGraph.tsx:130` (matrix inputs), `:140` (handle drag) and `:156,162` (selects): the graph swallows these errors through `ignoreOutOfDomain`, so no learner sees them.
  - `:178` (forwarded `validate*` text from `linearMapModel.ts`) and `:188` are reachable only from lesson scene actions. No lesson uses `linear-map` actions yet: `lessonCatalog.test.ts:185` lists the lesson as unpublished, and only `LinearMapGraph.test.ts` applies such actions.
  - When the linear-map lesson is authored, localize `:178,188`, or unit-apply all of its authored actions.
- **Review:** `bezeg-reviewer` Sonnet found no defects. One low finding (the borrowed integral label) is fixed.
- **Handler checks on the final tree:** `just typecheck`, `just lint src` and `just unit src/graphs/functions src/localization` passed.
