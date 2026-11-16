# F3 randomness Batch B, slice 1: set-run fields and opening probe

## Written
- `src/learning/model.ts` (random union, comment): `set-run` gains optional `walkSteps`, `areaShape` ('quarter' | 'disc'), `markovA`, `markovB`, `markovStart` (0 | 1), `sampleSize`.
- `src/graphs/random/SimulationGraph.tsx` `applyRandomAction` set-run: the fields join the allowed list and the merged state; `parseRandomState` validates it whole, as before. Doc comment updated.
- The controls write only the field (`edit({walkSteps})` etc.), so the playback position `shown` stays: the action does the same (only `n` also sets `shown`). A field of another mode is written too.
- `SimulationLessonActions.host.test.tsx`: three tests (action equals control for area/walk/markov/interval on state, readouts, status, drawing; the area-walk synchronous sequence with checkpoint restore; 12 invalid payloads change nothing, message `random set-run: ...`).
- Red: `set-run` allowed list reverted to the old four fields: 3 of 11 fail ("no such field", `host-red.log`). Green: `host.log`. Unit `s1-unit.log`, typecheck `s1-tsc.log`, lint `s1-lint.log` all passed. Probe test deleted. LF verified.

## Observed (probe: `.command-logs/rand-b/probe.txt`, sl and en, every opening)
Board in the host test is 600 x 400 (shim), not 1366 x 768; window per opening is in the probe. All texts lie inside the window.
- Area quarter seed 42: inside 76/779/7833 of 100/1000/10000; estimate 3,04/3,116/3,1332; error -0,1016/-0,0256/-0,0084; typical +-0,1642/0,0519/0,0164. All match the spec. n = 1: inside 1, estimate 4, +-1,6422. n = 0 not allowed (N_MIN 1); Replay gives shown 0 (readouts "0 od 0", all 0).
- Drawn: square, arc, pi/4 dashed line, error bar (vertical line plus caps) and the points; only the first 300 points (caption "Prvih 300 točk" / "First 300 points"; inside crosses 407 pts, outside 1391 pts at n >= 300). Captions: "Četrtina kroga", "Delež točk v krogu (ocena števila π/4)", "Prava vrednost π/4", "Navpična črta: običajno odstopanje ocene", "Velik križec: točka v krogu", "Majhen križec: točka zunaj kroga". Controls: Poskus, Seme, Število točk, Oblika; buttons Naslednji korak, Predvajaj, Ponovi.
- Disc: identical readouts; caption "Cel krog: ista vzorčna četrtina, zrcaljena v štiri četrtine" (en in probe); window [-1,1] square.
- Seed 43: n 100 inside 76 (same as seed 42, estimate 3,04), n 10000 inside 7741, 3,0964, error -0,0452. Seed 7: 77 (3,08, -0,0616) and 7858 (3,1432, +0,0016). The error bar is +-0,0164 for all seeds at 10000. RS3 step 5 at n = 100 shows seed 43 equal to seed 42: use n 10000 or seed 7.
- Walk 100 steps: n 1: rms 10, mean 10, zeros 0 (expected 0,1); walk 1 (seed 42) ends at +10 (curve s_e, last y 10). n 10: rms 10,68, mean 9,4, zeros 0. n 1000: rms 10,31 (by law 10), mean 8,218 (7,9589), zeros 68 (expected 79,6); all match the spec. Drawn: dashed +-sqrt(n) funnel, first 10 walks, running width curve, histogram of end positions and the exact law (dashed) at the right (x 106 to 146). Captions "Prvih N sprehodov", "Običajna širina sprehodov", "Kje se sprehodi končajo", "Pričakovano po zakonu". Window x [-10, 155] (50-wide plot at 100 steps).
- Walk n 1000: 200 steps rms 13,78 (law 14,14), mean 11,086 (11,2697), zeros 56 (56,3); 400 steps rms 19,31 (20), mean 15,52 (15,9477), zeros 34 (39,9); 99 steps rms 10,15 (9,95), mean 8,19, zeros row reads "0 (pri lihem številu korakov se ne morejo končati v izhodišču)". Doubling steps: 10,31 -> 13,78 (x1,34, law x1,41).

## Which readouts reveal the predictions at once
- RS3 step 1 (share inside): the first frame of the area opening at n >= 100 shows "Delež točk v krogu" 0,76/0,779 and the estimate: it answers at once. Open at n = 0 or via Replay (shown 0) to hide it; n = 1 shows share 1.
- RS3 step 4 (shrink factor): "Običajno odstopanje ocene" +-0,1642 and +-0,0164 are both in the readout row: the factor 10 is visible when n is changed, not before.
- RS4 step 1 (end of one walk): n = 1 shows mean distance 10 and rms 10 ("10, po zakonu 7,9589"), so |end| = 10 is stated (the sign is only the drawn curve); the zero row states 0.
- RS4 step 5 (spread after doubling): the rms and mean rows at 200 states the answer with the law value next to it ("po zakonu 14,14"); a prediction before the change is hidden only if the learner has not yet seen 200.

## Doubts
- Captions "Prvih 1 točk" (area n 1) and "Prvih 1 sprehodov" (walk n 1) are ungrammatical in Slovenian (a count form is needed); not changed (outside owned paths, copy decision).
- Probe board is the shim's 600 x 400, so the 1366 x 768 fit is not measured.
- The probe prints board curve layers by name only (s_c ... s_i); the layer-to-caption mapping above is inferred from caption order and ranges, not read from the scene.
- Not smoke-tested in a browser.
