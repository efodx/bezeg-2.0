# Curriculum inventory handoff

Completed against baseline `2c3df6a`, with only `bezierChapter.ts` and `familyChapters.ts` loaded from that commit during Vite SSR. The exporter called `getChapterGuidedExamples` for all chapter sections and resolved every returned path with `resolveGuidedExample`. It produced 175 source rows and 56 retained homes in [baseline-examples.json](baseline-examples.json). All rows have an explicit source ID, owner, launch path, demonstration, lesson ID, first actions, bilingual title and goal, retained key, and disposition: 56 retained, 40 merged into a retained card, and 79 aliases.

The audit rechecked the prompt/scene overlaps that needed editorial correction:

- The Foundations short card compares degree-two and degree-three Bernstein weights. Its initial scene should show degree two with stacked area off; the \((2,1)\) weighted-point arithmetic stays in prose and needs no new graph construction.

- The baseline PH family prompts are separate source text and have distinct goals for the hodograph generator, singularity checks, and degree comparison. Preserve those. The cubic offset prompts in `arc-length-problem` and `worked-length` use the same prepared scene/actions and both vary offsets while observing the source-length readout. Merge the former into the worked-length card, which explicitly distinguishes source and offset length. Long PH lessons are shared by demonstration ID; cubic lesson links alias to `arc-length-problem.ph-cubic-speed`, and quintic lesson links alias to `offsets.ph-quintic-offsets`.
- The `weighted-knot` and `worked-timing` graph entries share the same spline demonstration, prepared actions, and long lesson frames. Merge the α=0.7/12-point comparison prompt into the retained weighted-knot graph card; keep the worked chord-share calculation in section prose. The separate weighted-vs-uniform lesson remains.
- The rational quarter-circle derivation remains in prose. Keep the existing full-circle card and its different scene; no additional graph scene is needed for the proof.

The manifest's `retainedHomes` array is the authoritative complete destination list. The audit repeats that list by chapter and identifies the placements and legacy mappings. The temporary Vite exporter and mapping script are in the ignored `.command-logs` directory for reproducibility; they are not project source files.

