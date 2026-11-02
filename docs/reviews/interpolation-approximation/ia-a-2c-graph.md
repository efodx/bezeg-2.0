# IA-A-2c: `interp-runge` graph (lesson I2), evidence

Unreviewed worker output; not registered (no route, catalog entry, `graphFactories` entry or lesson). Only the Preset collection key `interp-runge` is new.

## Files
- `src/analysis/rungeInterpolationModel.ts`: model `{functionId, degree, nodeRule, showError, showSemicircle}`, check/parse/edit rules (`RungeIssue` is data), `rungeData` (nodes, barycentric p, 20001-point error sample, drawn grid).
- `src/graphs/functions/RungeInterpolationGraph.tsx` (extends `BaseFunctionGraph`), `rungeInterpolationMessages.ts`, `RungeInterpolationGraph.host.test.tsx`.
- `src/graphs/functions/functionPresetCollections.ts`: `interp-runge` entry with a diagnosis.
- `src/localization/sl.ts`, `en.ts`: 42 `interp_runge_*` keys in lockstep.

## Decisions
- Defaults: Runge function, degree 10, equispaced, error shown, semicircle off. Degree integer 1..40 (kernel cap); unknown ids, out-of-range or non-integer degree and non-boolean flags are rejected with the file message naming the field.
- Cache: one entry keyed on (functionId, degree, nodeRule) holding nodes, 20001-point sample and the drawn series (every 20th grid point, 1001 points). Not the base `modelCache`/`memoView` (those key on all model fields, so a switch would resample). `sampleRuns` counts computations.
- p is evaluated only by `barycentricEvaluate`; f drawn faint, p solid, markers at (x_j, f(x_j)).
- Semicircle: unit semicircle, points (cos t_j, sin t_j), vertical projections to the axis; drawn only when `nodeRule` is chebyshev (the switch is disabled for equispaced; the stored flag survives a rule change).
- Readout "grid maximum" (not supremum) with location and grid size 20001, 4 significant figures (`1,916`, `0,1092`, `59,82`, `0,01533`; the spec's 1.9157 is 5 figures). The grid-maximum cross is hidden when the maximum is above 10 (off the view).
- Default view `[-1.25, 2.5, 1.25, -0.5]`, exact (`equalAxisUnits` false): shows the n = 10 overshoot (about 1.96 at x = -0.94 and 0.94).
- Controls: function select, degree stepper plus number field, node rule select, two switches. Nothing is draggable.
- No lesson actions registered (later slice).

## Mutation checks (observed failing, then restored)
- Cache always misses: 2 fail (view-only change; error switch resamples).
- Semicircle drawn for equispaced too: 1 fails (node-count delta).
- Degree cap 41: 2 fail (refused 41; invalid file).
- Number formatting fixed to English: 4 fail (table, Reset, round trip, language).
- Check drops `showSemicircle`: 1 fails (Preset round trip).
- p replaced by f: 1 fails (default overshoot).
- Grid maximum scaled by 0.99: 4 fail (table, Reset, round trip, language).
- Not mutated: unmount cleanup (shared base).

## Checks run
- `just unit src/graphs/functions/RungeInterpolationGraph src/graphs/functions/functionPresetCollections src/localization`: passed (the shared collection test also covers the new entry).
- `npx tsc --noEmit --pretty false`: exit 0. `just lint` on the five touched source files: passed.

## Not verified
- No browser check, no live SL/EN switch in a browser, no keyboard walk, no touch; production build not run.
- The dispose test asserts owned objects 0 and no board update after language change; board objects are not inspected after unmount (the board is freed with the session).
- Slovenian copy (`Rungejeva funkcija`, `mreža`, `vozliščni polinom`) not reviewed by the owner.

## Handler acceptance (handler 22, 2026-11-02)

Reviews: engineering + UI (`bezeg-reviewer` Sonnet, no blocking findings) and mathematics (`bezeg-reviewer` Sonnet, spec table recomputed in plain Python: 1.91566 at x = 0.9402, 0.109153, 59.8223 at x = 0.975, 0.0153337). Handler repairs:
- Mathematics (medium): the axes have unequal units, so the semicircle was drawn as a half-ellipse. Its heights are now scaled by `unitX / unitY` (recomputed on every board update), so it is a circle on screen; the projections `x = cos θ_j` are unchanged. New host test: every semicircle point lies one x unit from the origin in pixels and projects onto its node; it failed with the plain `sin` (mutation), passes with the fix.
- Copy: `interp_runge_note` (SL, EN) no longer says the error does not shrink "for this f" (false for Chebyshev nodes). It now says the error grows for Runge's function with equispaced nodes, and that Chebyshev nodes minimize the maximum of the node polynomial, not the error at every degree.
- Engineering minors: `rungeEditMessage` is exhaustive (the `flag` issue uses the file message); the grid-maximum marker limit is a named constant. Fixed help-element ids (two instances would duplicate them) are left as they are.

Handler checks on the final tree: `just unit src/graphs/functions/RungeInterpolationGraph` 18/18; `npx tsc --noEmit` and `just lint` pass. The production build passed before the last two repairs; a broader unit run (`src/graphs src/localization src/analysis src/learning`) was stopped by the system for low memory without a failure and must be rerun.
