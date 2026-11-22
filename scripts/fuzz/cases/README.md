# Replay cases

Run with `node scripts/fuzz/fuzz.cjs --base <url> --replay scripts/fuzz/cases --repeat 5`. Keys `s<i>` are the inspector's
slider fields in order, `n<i>` standalone number fields. The origin cases are the prototype's `min-*.json` files under
`docs/reviews/ux-picks-app-wide/night-tooling/fuzz/` (pucks, cards and sweep buttons), rewritten for master's inspector;
see `docs/specs/parameter-writes.md` (F1 to F3).

| Case | From | Mapping |
|-|-|-|
| `f1-transformations-flicker.json` | `min-functions_transformations-1.json` (I2) | arrow a (`s2`); hover and sweep of u and d become a slider drag plus rest, since master's transformations graph has no sweep buttons; `dockdrag` becomes a board point drag |
| `f1-transformations-probe-undo.json` | `min-functions_transformations-2.json` (I2) | `rest, osc u, undo, osc b` becomes `rest, drag u, Esc, drag b` (no sweeps or undo on master) |
| `f2-transformations-typed-during-probe.json` | `min-functions_transformations-4.json` (I1) | pucks become sliders (c `s0`, d `s1`, a `s2`, b `s3`, u `s4`); sweeps and undo dropped; typed values kept |
| `f3-taylor-seed2.json` | prototype seed matrix, Taylor seed 2, 40 steps (I4) | full seed: regenerated from master's controls, so the actions differ from the prototype's |
| `f3-taylor-lesson-seed8.json` | `min-analysis_taylor-lesson-8.json`, Taylor lesson seed 8, 30 steps (I4) | full seed, lesson opened first |
| `waves-two-sweeps-board-drag.json` | `min-functions_waves-1.json` (I2) | the two sweeps map to the `Predvajaj` playback (play, pause, play); waves sliders `s0` time, `s1` a1, `s2` p1, `s3` a2, `s4` p2; the card (`dockdrag`) drag maps to a board point drag |

Not ported: `min-analysis_phase-portrait-1.json` (a typed decimal on an integer-step slider; the prototype fuzzer's own generator artefact, excluded by design) and `min-waves-nodock.json` (needs the prototype's dock).
A full-seed case holds only route, seed, steps and lesson, with no `actions` list.
