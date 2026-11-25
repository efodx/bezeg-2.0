# 08 label/symbol rule

Rule added to docs/guides/converting-a-graph.md (section 4) and briefs/08-lane.md (common misses).
Presenter: ReadoutsBody.tsx:90-91 already rendered symbol; pucks ignored it, so PuckFrame (PuckParts.tsx) now takes `symbol` and Range/Count pucks pass it. ChoicePuck/TogglePuck have no symbol.
Taylor: new fragment keys taylor_center_name / taylor_x_name / taylor_degree_name used by TaylorGraph.tsx:391-407; Orodja sliders keep the old keys.
Phase portrait: matrix pucks a..d use dynamics_matrix_{a..d}_name (Zgoraj levo ... Spodaj desno) + symbol. Orodja grid keeps the long labels.
Not changed: phase_graph_time_label "Cas t" (symbol t) is still not bare; its key is asserted in the lesson tests and in the Orodja slider.
No parity golden changed (matched by symbol/id; goldens hold old Orodja text). Tests updated: TaylorGraph.host.test.tsx, AnalysisFirstTask.test.tsx, phasePortraitsGuidedLessons.test.ts:597.
Checks: tsc 0; just unit (Taylor, analysis, dynamics, workspace, localization, declare, pp lessons) pass; just lint on changed files pass (no lint-changed recipe).
