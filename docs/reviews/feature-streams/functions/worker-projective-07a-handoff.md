# Handoff: projective 07a (K4 five-point graph), partial

## State
Implementation written, tsc clean at last run (after renaming the graph's Reset method to `restoreDefault`, since BaseGraph already has `reset`). ESLint reported one unused import (`ConicType` in fivePointText.ts); that import was then removed with sed, not re-run. No unit or host tests were written or run. No mutation evidence. Logs: C:/Users/NonFriedMotherBoard/.claude/jobs/7077c050/tmp/07a/ (tsc1, tsc2, eslint1).

## Touched files (all under src/)
New in graphs/projective: fivePointModel.ts, fivePointEdit.ts, fivePointText.ts, FivePointGraph.tsx, FivePointControls.tsx.
Edited: graphs/projective/projectivePresetCollection.ts (projective-five-point parser and collection), graphs/base/presets/PresetImport.ts (registers it), localization/sl.ts and en.ts (block `projective_five_point_*` after `prompt_projective_pole_polar_infinity`, 41 keys each, lockstep; sl.ts/en.ts working-tree line endings may have flipped to LF, git diff shows only +41 lines each).

## Design notes
- Model: points are numerators over 15 (limit +-150), a/b/t indices, example ids. `lastUnique` (points of last unique position) is graph state, stripped from exported Preset graphState. Extrapolation toggle and selection are transient.
- Names: points A-E; control P0,P1,P2; Farin F1,F2; shoulder S. Arc is drawn through `deCasteljauInPlace` with weights (`arcPoint`). Deviation: `arcDeviation`, 200 samples. Extrapolation split at denominator zeros: `extrapolationIntervals`/`extrapolatedPieces`.
- Status text imports `MIN_CIRCLE_PIECES` from RationalBezierCurveCircleGraphN.tsx.
- Terms reused: utež, tangenta, stožnica, par premic, šop stožnic, Farinova točka, pol glede na stožnico. No new terms.

## Remaining
1. Re-run tsc and eslint on touched files.
2. Write fivePointModel.test.ts (exact examples: cofactors, P1, w, Farin, shoulder, zeros, line-pair/pencil, deviation < 1e-9, parse refusals, edits, stale logic, extrapolation never crossing a zero), FivePointGraph.host.test.tsx (copy PolePolarGraph.host.test.tsx), a parser case in projectivePresetCollection.test.ts.
3. Run `BEZEG_MEMORY_FLOOR_GB=0.5 just unit src/graphs/projective src/projective src/localization`, plus the Preset import test.
4. Mutation evidence (4+), then the 400-word report.

## Unverified
Everything at runtime: example numbers, board creation, controls, locale type checks beyond tsc.
