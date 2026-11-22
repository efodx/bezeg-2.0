# prob-density (DensityAreaGraph.tsx, probabilityGuidedLessons.ts density steps)
Done. Declared: formula (normal density), readouts groups setup (mu, sigma, a, b), areas (area-percent, area), standard (za, zb); notes: status (when interval is empty/point/thin), note; legend curve, area (only when a<b); area rows link legend "area" only when drawn; mu/sigma link "curve".
Pucks: density.mu, density.sigma (Slider paramKey). Inline help strings for both pucks (no catalog key). Group titles "Porazdelitev", "Ploščina", "Standardizirani meji" inline.
Sections: density-bounds (help moved from p), density-normal, density-example.
Removed under pick: 3 board caption lines, inspector readout/legend.
Frames (explanation only, readouts open): total/bounds -> area-percent; one-sigma/shape -> area-percent,za,zb; iq -> za,zb (share is predicted, not highlighted). Observation/explore none. Legacy frame() gained optional ux (no step builder in this file).
Checks: tsc clean for my files; just unit (DensityAreaGraph.host, probabilityGuidedLessons) pass; page errors none; walk 12 frames highlights as above.
Known: old percent value shown without "%" (label says v %), same as old panel. Not checked: toggling a>b legend visually; 1024 shot taken only.
