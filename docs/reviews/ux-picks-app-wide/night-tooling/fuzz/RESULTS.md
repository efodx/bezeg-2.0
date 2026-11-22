# Fuzz results (snapshot 12:40; runs in `final/*.txt` may have advanced since, same format)

Tool: `fuzz.cjs <route> [--seed N|--seeds A-B] [--steps 40] [--lesson] [--replay f.json] [--selftest]`, invariants in `inv.cjs`.
Shrink: greedy single-action removal, cap 15 replays, saved as `min-<route>-<seed>.json`; screenshots `fail-<route>-<seed>.png`.

## Selftest (acceptance 3)
`node fuzz.cjs --selftest` (`selftest.txt`): pre-fix sample "−1,4 1,1 1,1 −1,2 1,1 1,1 −1 1,1 ..." FAILS I2 (1,1 -> −1,2 -> 1,1), post-fix sample "1,1 1,1 1,2 ... 2 2 1,9 1,8" PASSES. The turning-point exemption needs the step to be <=15 % of the swing, so a jump across the whole range is never exempt.

## Seeds run (time box hit: shrinking up to 15 replays per failure dominates; not the full 20 x 40)
| route | seeds finished | pass | fail |
|---|---|---|---|
| analysis/taylor | 2 | 1 | 1 (I4) |
| functions/transformations | 5 | 1 | 4 |
| functions/waves | 6 | 0 | 6 |
| analysis/phase-portrait | 12 | 11 | 1 (I4) |
| analysis/taylor --lesson (30 steps) | 9 | 8 | 1 (I4) |

## Distinct failures

### F1 (I2, real): a second ∿ start shows probe values interleaved with the start value
Pattern: window `0,5 1 0,5 2 0,5`, `7 9 7 11 7 13 7`, `−55 −180 −55 −160`, `0 70 0 90 0` on the freshly started sweep's own puck (∿ pressed).
Minimal (4 actions, transformations, seed 2): `rest, osc:transform.u, undo, osc:transform.b` -> transform.b shows 0,5/2/0,5/3/0,5/4 (min-functions_transformations-2.json, fail-functions_transformations-2.png). Waves 7 actions (seed 2): `drag:waves.time, rest, osc:waves.time, hoverTrack:waves.time, osc:waves.f1, click:waves.p2, arrow:waves.a1` -> waves.f1 `7 9 7 11 7 13 7` (min-functions_waves-2.json). Also seeds waves-1, transformations-1 (min files).
Guess: `probeInterval` in `src/uxPicks/a3/oscillators.ts` (~l.161-190) writes probe values with `setRaw(value)` then `setRaw(start)` and the puck's value box publishes each write; the value box shows the probe values although only a "pause up to 1.5 s" is the known behaviour. It happens when a second sweep starts while one runs (the first's `probing`/`osc.last` bookkeeping, l.108), or after a view refit.

### F2 (I1, real, 1 seed): after a learner write, a sweep-like value overrides it
transformations seed 4 (19 actions, min-functions_transformations-4.json): after `drag:transform.d` the value alternates `−5,5 −5,5 −2 −5,5 −5,5 2 −5,5 −5,5 6 −5,5 −5,5 10` (learner value interleaved with probe-like steps of 4); seed 5 `typed 4,5 shows 17,4` (transform.d, ∿ not pressed, stays at 17,4 for 1 s; not minimised, fail-functions_transformations-5.png). Same writer as F1: a probe's `setRaw(value)` / `setRaw(start)` landing after the learner's write (a stale `start` restore overwrites learner input) -- worth checking first that the probe aborts when `isOwnValue`-style input arrives.

### F3 (I4, real, 4 seeds, all routes with a graph): `Cannot read properties of undefined (reading 'handler')`
Stack: `Board.trigger <- Board.update <- Point.moveTo <- TaylorGraph.syncSceneToModel <- BaseFunctionGraph.commitModel` (JSXGraph jsxgraph.js:3941). Seen: taylor seed 2 step 39, phase-portrait seed 12, waves seed 6, taylor --lesson seed 8 (min 20 actions: `...osc:taylor.n osc:taylor.x drag:taylor.x ... back osc:taylor.c arrow:taylor.c`, min-analysis_taylor-lesson-8.json). Guess: a scene write (`moveTo`) reaching a board that is disposed/re-mounted (a sweep or probe still writing after `stopAllOscillators`/view change; `graphLocked()` in tick l.102 covers only the tick, not `probeInterval`'s awaited `settle` calls, or the sweep's `entry.set`).

### Checker artifacts, not app bugs (excluded)
`typed 39.9 shows 40`, `typed 110.1 shows 110`, `typed 2.6 shows 2,5`, `phase.zoom typed 4,4 shows 0`: step-snapping/integer-step sliders reject or snap typed decimals. The I1 typed tolerance (0.06) should be one step; the generator was changed by another worker to round to the step. Typing a non-integer on an integer-step puck is silently ignored (phase.zoom) without feedback: minor UX note, not a flicker.

## Not verified
Full 20 seeds x 40 steps per route; whether F1 is the "known" re-measure pause (the value box shows the probe values, which the brief's known-list only excuses as a pause); no I3 failure and no I5 failure were observed in the seeds run; I2 turning-point exemption could hide a real flicker whose step is <=15 % of the swing.
