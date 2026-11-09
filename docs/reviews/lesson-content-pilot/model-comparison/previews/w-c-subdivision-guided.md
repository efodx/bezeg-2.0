# w-c subdivision-guided deviations

1. Step 4 Okvir 2 (Izračun) → the draft's single formula line is split: `calculationLatex` = `p_0^1=(1-t)\,p_0+t\,p_1=\tfrac12\bigl(...\bigr)`, `resultLatex` = `(-7/2, 0)` → the runtime example needs both fields and the draft has no separate result.
2. Steps 2, 4, 5 observation prompts tell the student to move the slider or press Subdiviziraj → the scene already has that state applied (the draft's own "Na grafu" description) → the runtime scene is set by actions, not by the student.
3. Draft's `formulaBlocks`, step `formulaIds`, and edge-case/prerequisite lists are not in the draft → the old blocks and lists stay in the file unchanged, steps reference no formula (`formulaIds: []`) → the draft shows no formula panel.
4. Step `purpose` field (not in draft) → set equal to the step title.
