# function-inverse (FunctionInverseGraph, /functions/inverse) - done
Files: src/graphs/functions/FunctionInverseGraph.tsx; src/learning/content/schoolFunctionGraphsGuidedLessons.ts (S2 `ux` only).
- Readout groups: setup (pair, domain), points (point, mirror; primary/comparison tones), slopes (forward-slope, inverse-slope, product). Notes: hypothesis, asymptote (long sentences, a value box was too narrow: overlapped the name). readoutHelp = function_inverse_note.
- Legend: forward; inverse only when inverseVisible; mirror-line; point (drawn always). Asymptote lines were never in the old legend: not added.
- Pucks: inverse.x0 (help function_inverse_note), inverse.base only while restriction=exp (help function_inverse_hypothesis_exp). Slider paramKey on both.
- ToolSections (pickTitle, no master change): function-inverse-point, -restriction, -base.
- Removed under pick: the 3 board caption lines, renderLegend, renderReadout.
- Frames with ux (S2): mirror expl (point,mirror); reveal (mirror); restrict expl open only; tangent expl (3 slope rows), obs open only; base expl (point,mirror,product), obs open; ln expl (2 slopes), obs open; explore obs open.
- Inline strings: none. Contract gaps: none (long-sentence rows must be notes; notes cannot be highlighted).
- Checks: tsc clean; just unit (host test + S2 lesson test) passed; shots + walk in this folder; values match `none`.
- Page errors: "director is not defined" x2 (walk; from the uncommitted viewDirector work, not this graph).
- Defects: view director zooms to a wider view than master at load (shared).
