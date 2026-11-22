# RESULTS2 (worker 2; current code, R26-R29 in)
Selftest: pass (3/3 as expected). Replays (3 each, same json, dev server 4460):
- F1 min-functions_transformations-2.json: FAIL 1/3 (I2 transform.b 0,5 1 0,5 2 0,5 3) -> still reproduces, intermittent.
- F2 min-functions_transformations-4.json: FAIL 1/3 (I2 transform.d -19,9 -20 -19,9) -> still reproduces, intermittent.
- F3 min-analysis_taylor-lesson-8.json: PASS 3/3 (min list does not reproduce the page error; the full seeds did: taylor seed 2 step 39 and lesson seed 8 in final/*.txt, both on current code).
F3 stack (frames 1-6 as captured): Board.trigger (jsxgraph.js:3941) <- Board.update <- Point.moveTo <- TaylorGraph.syncSceneToModel (TaylorGraph.tsx:~370) <- BaseFunctionGraph.commitModel (:158). fuzz.cjs now records 25 frames for later runs.
Suspected writer: src/uxPicks/a19/ghost.ts:37-46 (settle adds/removes board 'update' handlers `mark`/`done`; removing one while the board's trigger loop runs yields an undefined handler entry). Unverified guess.
Artefacts: phase.zoom typed 4,4 (integer-step slider rejects decimals; generator fixed at fuzz.cjs:69).
Other flicker seen in final runs (waves p1 0/70/90, transformations a/d, two sweeps at once plus dock drag): `min-functions_waves-1.json` needs the final dockdrag; without it PASS. Guess: oscillators.ts tick (l.100-138) sets several params in one frame; a stale-closure set resets the other param.
Seed matrix (partial, killed for budget; final/*.txt): see counts below.
final/analysis_phase-portrait.txt pass=11 fail=1
final/analysis_taylor.txt pass=1 fail=1
final/functions_transformations.txt pass=1 fail=4
final/functions_waves.txt pass=0 fail=6
final/taylor-lesson.txt pass=9 fail=1
