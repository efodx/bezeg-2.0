# circle-construction (compgeo/CircleConstructionGraph) - DONE
Files: src/graphs/compgeo/CircleConstructionGraph.tsx, src/learning/content/circleGeometryGuidedLessons.ts (legacy step ux pattern + `readouts`).
Declared: per mode groups. tangents: values(power,length,count), contacts, construction(chord,thales); radical: powers, axes, centre; apollonius: probe(ratio,on-locus), locus; common: values, centres. Notes: status sentence, approx note. Legend = legendItems() drawn-only; rows chord/thales/axis-*/centre/orthogonal/locus/external-centre/internal-centre link legend ids. valueTex for line equations (chord, axes, locus).
Pucks: circle.r1-3 (radius sliders per mode), circle.k (ratio). paramKey added on both Sliders.
Sections: readout group -> ToolSection id circle-readout (h3.inspector-reveals-title heading, same as old ReadoutHeading).
Removed under pick: ratio caption "PA : PB" on board (row exists). Point-name/N/Z/T1/T2 captions kept (labels of drawn points).
Frames with ux: all 27 CG1-CG4 steps open readouts; highlights only for given values (e.g. cg1-count power,count; cg2-line axis-12; cg4-external external-centre); observation prompts that read/predict/find highlight nothing (cg1-right-angle highlights contact points to check; cg2-predict/probe powers).
Inline strings: puck helps "Polmer krožnice; ..." and "Razmerje k: ...".
Gaps: PointListInput rows (centres, P) are not pucks; group titles have no catalog keys so groups untitled.
Checks: tsc clean in my files (others' errors: InterpolationGraph); just unit CircleConstruction* + circleGeometryGuidedLessons passed; shots all1440/all1024/none; CG1 walk 13 frames no page errors.
Not verified: radical/apollonius/common modes visually, CG2-CG4 lesson walks, 1024 card contents (cards folded).
