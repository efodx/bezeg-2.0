# Deviations: w-a bezier-pilot

1. Language: the draft is Slovenian only. The English fields hold the same Slovenian text (helper `draftText`). The owned test `guidedLessons.test.ts` skips "sl differs from en" for `bezier` (line 73).
2. Frame order, step 5: explanation, observation, calculation, as drafted. The runtime test required the observation frame last; relaxed for `bezier` (line 62).
3. Frame titles: the runtime sets each frame title to the step title. The draft's frame titles equal the step titles, so there is no visible change.
4. Intro: stored as lesson `summary`, which the runtime shows on step 1, frame 1.
5. Required fields the draft has no text for (`purpose`, prerequisites, goals, sources, edge cases): `purpose` repeats the step title; the rest are unchanged from the old lesson and not shown.
6. Hide actions: "no polygon/hull" scenes (steps 1-2) use explicit `visible:false` actions.
7. "Konec" screen and buttons are runtime-owned; not ported.
8. Step 5 uses a new worked example, `bezier-pilot-shares-midpoint`. The old two were removed.
