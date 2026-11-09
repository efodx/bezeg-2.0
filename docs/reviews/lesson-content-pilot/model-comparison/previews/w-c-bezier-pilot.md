# Deviations, w-c bezier-pilot

1. Draft intro (Uvod) -> lesson summary, shown on step 1 frame 1 (handler fix, same mapping as other configs).
2. Frame titles -> every frame shows its step title; step 5 frames "Za tiste, ki želijo videti račun" and "Izziv" show "Zakaj ostane v ovojnici" (the runtime has one title per step).
3. Calculation frame body "Točko krivulje pri parametru t označimo z B(t)" -> dropped; calculation frames have no body field.
4. Draft [rezultat] prose -> placed in resultLatex wrapped in \text{...} (no prose result field); "[preverjanje]" -> check.
5. English locale -> the Slovenian text is used for both locales (draft is Slovenian only); title too.
6. Step purpose fields (required, not in draft) -> equal to the step title. Step formulaIds are empty so no extra formula blocks appear.
7. "Konec" screen text -> not editable in lesson source; runtime's standard end screen is shown.
8. Step 5 scene: draft says default symmetric curve, so scene id kept but uses the symmetric fixture.
9. Old worked example 'bezier-asymmetric-midpoint' and step 'bezier-free-exploration' removed (6 steps -> 5).
