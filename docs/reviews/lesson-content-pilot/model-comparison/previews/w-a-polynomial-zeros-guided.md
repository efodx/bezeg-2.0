# Deviations: w-a polynomial-zeros-guided

1. Frame titles/texts → the runtime has one title per step and no per-frame title or text; frames reuse the step title, and the Razlaga text is the step `explanation`. Why: runtime model.
2. Step `purpose` (not in draft) → set to the step title. Why: required field.
3. Step 6 two `[formula/oznake]` paragraphs → one explanation, formula as inline `\\[...\\]` display, paragraphs joined by a space (a newline fails the notation test); no formula block. Why: no multi-paragraph/formula frame; `\n` rejected.
4. Step 4 "Učenec sam združi ničli", step 3 "drag" → default scene, derivative hidden; the learner performs the merge. Why: scenes cannot pre-merge.
5. Konec screen text → runtime default end screen, not ported.
6. Lesson-level prerequisites, learningGoals, edgeCases, sources → left as the old lesson's (draft has none); learningGoals mention the removed y-intercept topic.
7. English `scene.expectedState` uses the Slovenian "Na grafu" text, `.` decimals.
