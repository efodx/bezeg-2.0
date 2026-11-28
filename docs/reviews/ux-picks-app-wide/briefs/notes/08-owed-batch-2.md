# Owed batch 2 (worker notes)

1. exponential Orodja empty Uredi: not reproducible. Browser shot of /functions/exponential shows Orodja opening on Prikaz (the mirror switch);
   `useToolsSectionsWithContent` (src/workspace/cards/toolsContent.ts) already skips an empty Uredi tab, covered by toolsContent.test.tsx. No change.
2. inversion board chip repeats the first Odcitki note: reproduced in the browser (board text and first card row both "Slika X' = (6/5, 2/5)").
   Tried dropping the `chip` note from `pointSetNotes()`: red test passed, but `declarationContract` "inversion: every frame" failed, because
   the inversion lessons highlight the note id `chip` (triangleGeometryChapterLessons.ts:365 etc.; same pattern in euler, inscribed, notable, simson).
   Reverted fully (no diff in the inversion files). Needs a decision: either the board chip is not drawn when the card declares the same
   sentence (contradicts "board captions stay board-drawn"), or lessons highlight something else. Left for the handler.
3. bspline-basis highlights: not reproducible; `declarationContract -t bspline-basis` runs 1 test, passes (ids head, sum, fn0..fn4 resolve
   in each lesson scene). No change.
4. phase portrait matrix entries `phase-a..d`: added `help: message("dynamics_matrix_entry_help")` (PhasePortraitGraph.tsx ~1306-1309), sl + en in
   src/localization/fragments/dynamics.ts ("Clen matrike A ..." term "clen matrike" already used in sl.ts). Test added in
   PhasePortraitGraph.declaration.test.tsx; red observed: "phase-a: expected undefined to be defined".

Checks: tsc 0 lines; lint on the three changed files passed; `just unit src/graphs/dynamics src/localization` passed;
`just graph-check phase-portrait --route /dynamics/phase-portrait` PASS (contract, parity, declaration; browser skipped).
A mid-run `declarationContract` full run failed only on the reverted inversion attempt.
Mishap: a stale /tmp backup overwrote PhasePortraitGraph.tsx once; restored from git and re-applied the four help lines (diff verified: 8 lines).
