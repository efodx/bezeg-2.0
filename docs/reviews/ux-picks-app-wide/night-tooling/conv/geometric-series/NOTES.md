# geometric-series (GeometricSeriesGraph, /functions/geometric-series) - done
Files: src/graphs/functions/GeometricSeriesGraph.tsx; src/learning/content/schoolFunctionGraphsBatchCGuidedLessons.ts (legacy step pattern + S5 `ux`).
- formula: S_n = a(1-q^n)/(1-q) (TeX, same as the board caption). Groups: setup (a, q, terms), values (last-term, sum[primary], limit[comparison], error, first-within, behaviour[muted]). readoutHelp = series_note.
- Legend: term, sum (area); limit only when |q|<1; band only when limit and tolerance>0.
- Pucks: series.q, series.n (CountSetter), series.a, series.tolerance; help = series_fields_help / playback_note / legend_band (all catalog).
- ToolSections (pickTitle): geometric-series-ratio, -playback (untitled), -first-term, -tolerance, -example. Help paragraphs kept as `p.inspector-help` (not moved to section help).
- Removed under pick: all 6 caption lines, renderLegend; renderReadout returns only the FunctionStatus (announcement region stays in the inspector).
- Frames (S5): bars (sum,limit; obs legend), predict (open only), reveal (sum; obs legend), limit (limit,error), alternating (limit,sum), divergence (limit), decimals (sum,limit), explore (first-within,error); observations open only.
- Inline strings: none. Gaps: none new (status lines are not declarable, stay in the inspector).
- Checks: tsc clean; just unit (host + batch C lesson test) passed; shots/walk here; values equal `none`.
- Page errors: "director is not defined" (viewDirector work, not this graph).
- Not verified: puck width sweep, toggling each legend condition by hand, 310 px card.
