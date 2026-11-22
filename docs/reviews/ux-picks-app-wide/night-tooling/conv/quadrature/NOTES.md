# quadrature (done)
Files: src/graphs/functions/QuadratureGraph.tsx; src/learning/content/numericalQuadratureGuidedLesson.ts (legacy step pattern: frame(id,kind,ux?), readouts(), StepContent.ux).
Declared: formula f(x)=latex; groups setup(n), values(approximation, exact, error), halving(half-error, ratio); notes = statuses (rule, no-half/exact, adjusted warning); readoutHelp quadrature_note; legend function/bound/rule area (rule entry per current rule); approximation row links the rule's area entry.
Pucks: quadrature.a, .b, .n (n help depends on rule). Sections: quadrature-choices, quadrature-bounds (help = bounds note), quadrature-count.
Removed under pick: board caption (formula, values, ratio), inspector readout/status/legend.
Frames with ux: all 6 explanations (rows quoted in prose: n/approximation/error/ratio; simpson-parabolas also legend); all 6 observations open readouts, no highlight (predict/read prompts).
Inline strings: group titles "Delitev", "Vrednosti", "Razpolovitev n".
Gaps: none new.
Checks: tsc clean in my files (DensityAreaGraph errors belong to another worker); just unit Quadrature, numericalQuadrature, lessonMathNotation pass; shots picks/1024/none; walk 16 frames, no page errors.
Known: Odčitki card scrolls internally at 900 px.
