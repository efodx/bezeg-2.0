# w-c polynomial-zeros-guided deviations

1. Frame titles (every step) -> runtime derives each frame title from the step title; the draft's frame titles equal the step titles except step 5 frame 2 ("Izziv"), which shows "Zato in izziv" instead -> no per-frame title field in the guided format.
2. Step `purpose` (not in draft) -> filled with the step title -> field is required; assumed not shown to learners.
3. Draft's `Konec` block -> not ported; the app's fixed "guided_lesson_complete" text appears -> end text is a localization string, not lesson data.
4. "Na grafu" scenes -> mapped to the existing `default` and `degree-five` examples; steps 2 and 3 leave zeros free for dragging (no preset moves), derivative hidden everywhere.
5. Lesson metadata not in the draft (prerequisites, learning goals, formula blocks, sources, edge cases) was left as before; steps reference no formulas (`formulaIds: []`).
6. English fields copy the Slovenian text (decimals as `0.2`), per the brief.
