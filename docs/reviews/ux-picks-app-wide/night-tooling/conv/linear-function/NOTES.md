# linear-function (functions/linear) - DONE
Files: src/graphs/functions/LinearFunctionGraph.tsx, src/learning/content/functionGuidedLessons.ts (frame(id,kind,ux?) + readouts helper; linear steps only).
Declared: formula = lineEquation (decimal comma -> {,}); readouts groups line(k,n; comparison tone), triangle(dx,dy; accent); note (vertical/degenerate reason, warning); readoutHelp linear_kn_help; legend line / triangle (only with a leg) / points.
Pucks: none (k, n and points are NumberInput/PointListInput, no Slider; contract gap).
ToolSection: linear-kn (element div, pickTitle inline "Naklon in začetna vrednost", help linear_kn_help; PointListInput already converted).
Removed under pick: board equation caption, inspector readout.
Frames: through-points obs open; slope-triangle expl open+legend hl dx,dy, obs open only (asks to read/divide); intercept expl open, obs hl n; slope-sign hl k both; parallel-vertical expl hl dx,k, obs open only.
Inline: "Naklon in začetna vrednost", "Trikotnik naklona". Legend label for line reuses linear_function.
Checks: tsc clean; just unit LinearFunctionGraph(.host).test + functionGuidedLessons.test passed; shots all1440/all1024/none; walk 12 frames no page errors, highlights as above (dx,dy / n / k / k / k,dx).
Not verified: pick-off markup byte-for-byte; vertical-line state visually.
