# Handoff: phase portrait pilot (partial, budget stop)

Done and observed:
- Graph declaration, drawnObject, performAction in `src/graphs/dynamics/PhasePortraitGraph.tsx` (ids `PhasePortraitIds`); legend elements registered in `drawnElements` via `curve(..., legendId)`; the wrap curve now has `visible: pendulum && wraps non-empty` (matches the board legend text).
- Fragment `src/localization/fragments/dynamics.ts` (2 keys: `dynamics_legend_seeds`, `dynamics_legend_columns`), registered in `fragments/index.ts` next to bezier/taylor/transformations.
- `PhasePortraitGraph.declaration.test.tsx`: 9 tests pass. Observed failure: legend object id "frame" renamed "framex" -> `frame: expected undefined to be defined`; restored.
- `BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx`: phase-portrait passed; only the decasteljau case failed (another worker's, in progress).
- 18 observation frames of PP1-PP3 declared in `src/learning/content/phasePortraitsGuidedLessons.ts` (frame ids `<step>-observation`) via guidedStep `declare`.
- `just unit src/learning/content/declarationContract`: passed (did not confirm the phase-portrait frames appear in its output).
- Placement note written.

Not done: `just unit src/graphs/dynamics`, `just unit src/localization`, `just unit src/learning/content`, `npx tsc --noEmit` (last run showed only an error in the transformations worker's test file, before the lesson edit), `just build`, `just graph-check phase-portrait`, notes file.
