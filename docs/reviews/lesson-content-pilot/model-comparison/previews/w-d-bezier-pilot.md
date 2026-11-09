# w-d bezier-pilot deviations

1. Frame titles → the runtime has no frame title field; step title is shown, frame titles equal it.
2. Intro ("Uvod") → stored as lesson `summary` (shown on step 1, frame 1).
3. Step 4/5 calculation frames: "Za tiste, ki želijo videti račun..." prose → dropped; the worked example holds only formula (`calculationLatex`), result and check (no prose field).
4. Draft [formula/oznake] blocks → inlined in step `explanation` as `\[...\]`; `formulaIds` set to `[]` (existing formula blocks no longer shown).
5. No English in draft → `en` mirrors Slovenian.
6. Step 1 scene → explicit polygon and hull hidden; step 3 hull hidden.
7. Draft's "Na grafu" text → used as scene `expectedState`.
8. Step 5 calculation frame shows the draft's result `(3/8,3/4)` via `\tfrac` form.
