# rational-function (RationalFunctionGraph, /functions/rational-functions) - done
Files: src/graphs/functions/RationalFunctionGraph.tsx; src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts (legacy step pattern + S4 `ux`).
- Rows (short values): zeros, holes (points list "(x; y)", same numbers), poles / pole-N ("x = a"), asymptote (equation), remainder (term at the probe, only when defined). Groups zeros-holes, poles, asymptote-group.
- Notes (long sentences, a value box is too narrow): rule, reduced (if cancelled), pole-N-note (sign behaviour), asymptote-note, division, remainder-note (probe undefined).
- Legend, conditional: curve; numerator-zero (list non-empty); denominator-zero; hole (holes exist); asymptote (not none). Probe/accent objects are not in the old legend: not added.
- Pucks: rational.k (help k_hint), rational.probe (help probe_help). Zero positions/multiplicities live in shared ZeroListEditor: no pucks (gap).
- ToolSection: rational-function-parameters (plain group, example+k+probe).
- Removed under pick: 3 caption lines, the board remainder label "r(x)/q(x) = ..", renderLegend, renderReadout.
- Frames (S4): pole expl (zeros,pole-0,asymptote); hole (zeros,holes); vertical (zeros,holes,pole-0); degrees (zeros,asymptote); remainder (asymptote,remainder); double-pole (zeros,pole-0,pole-1); observations open only.
- Inline strings: none (asymptote row name = rational_function_readout_asymptote). Gaps: legend kinds ring/cross become `point`; a sentence cannot be a highlightable row.
- Checks: tsc clean; just unit (host + batch B lesson test) passed; shots/walk here; values equal `none`.
- Page errors: "director is not defined" (viewDirector work, not this graph).
