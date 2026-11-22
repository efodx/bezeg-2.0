# contour-map (ContourMapGraph.tsx, ContourPanels.tsx, levelSetsContourGuidedLessons.ts)
Done. workspaceUx: readouts = every row of readoutRows() (same label/value strings) in groups setup / probe / descent / lagrange (ids = row ids); legend = legend() rows except "scale" (kind line/dashed/point from id, colour from the row); rows link legend: level->levels, probe, gradient, tangent, start, iterate->current, constraint, point, grad-f, grad-g, tangency (only when the entry exists). Note: statusText().
Pucks: contour.level, contour.count, contour.steps (Playback slider), contour.step (paramKey on Sliders/CountSetter in graph/ContourPanels). Puck help reuses catalog keys (level puck reuses mode_help_level_sets, steps puck mode_help_descent: imprecise).
Sections: ToolSection id contour-playback (plain group; command area is the shared getGraphCommandsArea, surface panel left untouched).
Removed under pick: board legend texts (and legendBand = 0, so the window is framed without the strip), readout panel (LiveReadout kept), BoardReadout unwrapped.
Frames (legacy step gained ux): ls1-probe, ls1-explore -> readouts(probe-f); ls2-numeric -> readouts(gradient). Others name no values or predict them.
Inline strings: group titles "Funkcija in nivoji", "Označena točka", "Spust", "Vezani ekstrem".
Checks: tsc clean; just unit src/graphs/levelsets + lesson passes; page errors none; walk 12 frames ok.
Known: readout card is long in gradient/lagrange modes (scrolls); no formula; modes other than level-sets not shot.
