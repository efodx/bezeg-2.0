# Deviations: w-e bezier-pilot

1. Intro paragraph -> shown as the lesson `summary` (first step, first frame only), the closest runtime field.
2. Frame titles -> runtime frames have no own title or text; every frame shows the step title and the step `explanation`, `observationPrompt` and hidden `expectedObservations`. Draft frame titles equal step titles, so no visible loss.
3. Draft has no English text -> English strings are my translations (needed by the content type).
4. Draft step 2 -> reuses id `bezier-endpoints` (polygon-only scene); step 3 reuses `bezier-control-polygon`; step 5 reuses `bezier-influence`. Old steps `bezier-free-exploration` and worked example `bezier-asymmetric-midpoint` removed (not in draft).
5. "Stikalo ... je vklopljeno" scenes -> expressed as `curve-visibility` actions; the scene description in the draft is stored as `expectedState`.
6. Prerequisites, learning goals, formula blocks, sources, edge cases, unresolved questions -> kept unchanged from the old lesson (draft has none).
7. Dragging prompts rely on the existing draggable control points; no scripted dragging.
