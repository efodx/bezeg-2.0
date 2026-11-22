# triangle-solver (trig/TriangleSolverGraph) - DONE
Files: src/graphs/trig/TriangleSolverGraph.tsx, src/learning/content/trigSolveGuidedLessons.ts (legacy step ux pattern + `readouts`; the observation frame line was a one-line variant, wired too).
Declared: sides/circle modes: groups sides, angles, ratios, then circle (two-r,r-squared,centre,antipode,thales,apex-angle) or cosine (dot,correction,identity); solve mode: solution-1/2 (sides, angles, area) + height. Notes: status sentence. Legend drawn-only (circumcircle/antipode in circle mode, ssa-arc/height in ssa); rows r-squared, antipode, height link legend. valueTex: identity row.
Pucks: triangle.<field> (a,b,c,angleA,angleB) per data type in solve mode; none in sides/circle. paramKey on the data Slider.
Sections: vertices group -> ToolSection id triangle-vertices (untitled; PointListInput carries the title; help moved into section help); readout group -> ToolSection triangle-readout.
Removed under pick: bar caption "popravek = n" (row exists). Kept a2/b2/c2 bar names, side letters.
Frames with ux (tr5 lesson, trigSolveGuidedLessons): all 7 steps open readouts; tr5-ssa and tr5-cases explanations highlight height (given h=4); observations highlight nothing (read/compare prompts).
Inline strings: two puck helps ("Podana stranica/kot trikotnika; ...").
Gaps: vertices PointList not a puck; untitled section has no fold.
Checks: tsc clean in my files; just unit TriangleSolver* + trigSolveGuidedLessons passed; shots all1440/all1024/none (sides mode compared); TR5 walk 14 frames no page errors (needs ?learn=1&learnChapter=trigonometry&learnSection=solve-triangle; walk via night/tools/walk2.cjs with env EXTRA). Stale Vite blank page once: touch fixed it.
Not verified: circle/solve mode cards visually, pucks sweep widths.
