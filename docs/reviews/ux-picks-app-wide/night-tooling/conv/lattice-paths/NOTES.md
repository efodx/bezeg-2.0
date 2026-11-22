# lattice-paths (combinatorics/lattice-paths) - DONE
Files: src/graphs/combinatorics/LatticePathGraph.tsx, src/learning/content/combinatoricsGuidedLessons.ts (legacy step ux pattern + `readouts` helper).
Declared (per view): paths: target(target,count,formula), route(accent), last(last-right,last-up,last-sum); triangle: entry, parents, row; expansion: expansion, coefficients; notes cap/notice/off; legend drawn-only; readoutHelp for expansion.
Pucks: lattice.route, lattice.page (paths, enumerable), lattice.n, lattice.c (expansion); paramKeys on the 4 controls. No puck `help` text (none declared by previous worker; a catalog text would need inspection - not added).
ToolSections: lattice-readout, lattice-routes.
Removed under pick: target/route/split/cap/triangle/expansion captions. Kept: "start" caption.
Frames with ux (cb1/cb3 lattice scenes only): cb1-predict obs route; cb1-list obs formula; cb1-choose obs formula; cb1-drag/counts/cap obs open only (prediction/find); cb3-predict, identity, rows, symmetry open only; cb3-partition explanation opens readouts+legend, highlights last-right,last-up.
Inline strings: "Starša" (group), "starša" (legend).
Gaps: target PointListInput not a puck.
Checks: tsc clean; just unit src/graphs/combinatorics + combinatoricsGuidedLessons/RowGuidedLessons tests passed; shots all1440/all1024/none; walk (cb1) 15 frames, no page errors, highlights route/formula/formula as intended. Not walked: cb3 lesson, expansion/triangle views visually.
