# Lane L11 (fourier-coefficients), round 5: PARTIAL handoff (budget signal at 135k input)

## Done (observed)
- Parity recorded BEFORE conversion: sample `fourier-coefficients` in `src/graphs/base/declare/parity.test.tsx` (8 states, each sets every field; selections retried so no duplicate is refused), `src/graphs/functions/__parity__/fourier-coefficients.json` (rows only; slider read-offs are not recorded, outputs empty). Not re-recorded.
- `src/graphs/functions/FourierCoefficientsGraph.tsx` converted: `FourierCoefficientsIds`, `drawn`/`midpoints` maps captured in `createScene`, `parameterBindings` (fourier-order K, fourier-harmonic k, fourier-term, fourier-n), `declaration()` (per view: projection pucks K count, k count, term choice puck; decay puck N; legend of 6 or 6 entries per view), `functionPanel()` (rows/notes/plotted for both views), `drawnObject` (midpoint = any midpoint visible), `renderReadout` (declared readout plus the unchanged spectrum bars/decay spectra), `renderLegend` null, `PuckOwned` around K, term, harmonic (plus its help line) and N. Mathematics untouched.
- Fragment `src/localization/fragments/fourier-coefficients.ts` (bare names, helps, short a/b, decay sum legend template) registered in `fragments/index.ts`.
- `src/graphs/functions/FourierCoefficientsGraph.declaration.test.tsx` (7 states vs kernel, midpoint ring, arbiter writes). Red check: parseval row value +1 failed `AssertionError: expected '7,57967' to be '6,57967'`; reverted.
- Frames: `src/learning/content/fourierCoefficientsGuidedLessons.ts` FOCUS table (coef-area, coef-parseval, decay-sup) via `fourierFrame`.
- `just graph-check fourier-coefficients --route analysis/fourier-coefficients`: PASS (contract, parity, golden, declaration 9). Golden check unit passed (no differences). `npx tsc --noEmit` clean (before the lesson edit; rerun). declarationContract passed within the unit run.

## Not done
- `FourierCoefficientsGraph.host.test.tsx`: 6 of 19 fail because the K, harmonic, term and N controls are puck-owned and absent from Orodja (e.g. line 200 `spinbutton Highest harmonic K`, line 240 `nField`, line 410). Update as EulerGraph.host.test.tsx did: write through `graph.parameters.write(key, v, 'learner')`; one puck test using `puckControl`, `typePuck`, `waitForPucks` from realGraphTestHarness (installBoardShims last). Find the 6 with `just unit src/graphs/functions/FourierCoefficientsGraph.host.test.tsx` (log `.command-logs/l11-host.log`).
- `*FirstTask.test.tsx` case for fourier-coefficients (grep `fourier-coefficients` there), `src/learning/content/fourierCoefficientsGuidedLessons.test.ts` (passed in the run; recheck), `just lint` on changed files, `npx tsc` after the lesson edit, `just build`, `just smoke-lesson fourier-coefficients --port 4391 --workers=1` (check tests/guided-lessons.smoke.spec.cjs row for slider locators of K, k, N).

## Placement judgements
- K, k, term, N: pucks (flipped and compared while product, spectrum and sums are watched; term has 2 options).
- View, shape of f and handle sliders (also draggable), decay examples and scale, S_K switch: Orodja undeclared (setup or display housekeeping; handles are points).
- Legend: bottom-right default kept.
- No UntaggedWriteError seen so far.

## Scratch to delete
`.command-logs/l11-*.py`, `.command-logs/l11-new-tail.txt`.

## Round 5 continuation (observed)
- Host test updated: K/N reads via graph.parameters.read, N write via arbiter (learner), one puck test (K, N); 20/20 pass. Removed unused `field`, `nField`, PuckOwnedGroup import (lint).
- No fourier-coefficients case exists in *FirstTask.test.tsx; smoke row has no K/k/N locators. Nothing to change.
- tsc, lint, unit (functions, content, localization, declare), graph-check, build, smoke-lesson: all pass. Unit run preceded the last two trivial lint edits.
