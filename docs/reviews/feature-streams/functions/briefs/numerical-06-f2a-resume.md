# Brief handoff-v12: numerical methods 06 F2a resume (quadrature graph)

- **Role:** fix and verification worker; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push or delegate. Another worker edits `src/graphs/projective/`, `PresetImport.ts` and the `projective_five_point_*` locale block concurrently: do not touch those; ignore type errors from `src/graphs/projective/`.
- **Goal:** finish the slice in `docs/reviews/feature-streams/functions/briefs/numerical-06-f2a.md` from the previous worker's note `docs/reviews/feature-streams/functions/worker-numerical-06-f2a-handoff.md`. Source is written (uncommitted): `src/analysis/quadratureModel.ts`, `src/graphs/functions/QuadratureGraph.tsx`, `quadratureMessages.ts`, their tests, `functionPresetCollections.ts`, `PresetCatalog.test.tsx`, the `quadrature_*` locale block.

## Steps

1. Fix the `QuadratureGraph.test.ts` range-error regex (message uses U+2212 `−7`).
2. Verify the reported host-test expectation "trapezoid n=4 ratio 19.25": for `sin` on [0,π] the trapezoid ratio at n=4 must be 4.13 (N4 acceptance 1: ratio = quotient of the two displayed errors). Find out which function/interval gives 19.25; if the ratio formula or the error at n/2 is wrong, fix the source, not the test. State the cause in your report.
3. `just unit src/analysis src/graphs/functions src/graphs/base/presets src/localization > <log>`; read only failures; fix until green. Confirm `DefiniteIntegralGraph` tests are unchanged and pass.
4. Mutation evidence for at least four new assertions (wrong ratio denominator, odd n accepted for Simpson, parabola overlay off by a subinterval, invalid Preset accepted, language switch not applied): mutate, observe the failure, revert.

## Return

≤ 300 words: fixes as `file:line`, the 19.25 cause, checks with log paths, mutation evidence, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/n06/`. Budget: grep before reading, ≤150 lines per read, outputs to logs. On `HANDOFF` or after ~25 turns, overwrite the handoff note above and return partial.
