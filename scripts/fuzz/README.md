# Interaction fuzzer

Drives the workspace of a running dev server with random learner interactions and checks five invariants
(`docs/specs/parameter-writes.md`, acceptance 4). Run it against the **dev server**: the strict dev store throws
`UntaggedWriteError` for an untagged write, which I4 reports as a page error. The handler wires `just fuzz` to
`node scripts/fuzz/fuzz.cjs <args>`.

```
node scripts/fuzz/fuzz.cjs --base http://127.0.0.1:4482/bezeg-2.0/ --route analysis/taylor --route functions/transformations --seeds 5
node scripts/fuzz/fuzz.cjs --base <url> --lesson analysis/taylor --seeds 5      # opens "Spoznaj to demonstracijo" first
node scripts/fuzz/fuzz.cjs --base <url> --route analysis/taylor --seed 2 --steps 40
node scripts/fuzz/fuzz.cjs --base <url> --replay scripts/fuzz/cases --repeat 5   # a case file or a directory
node scripts/fuzz/fuzz.cjs --base <url> --route analysis/taylor --seeds 1 --inject-stale   # must fail I1
node scripts/fuzz/fuzz.cjs --selftest                                              # checker on synthetic series, no browser
```

Options: `--seeds N` runs seeds 1..N, `--seed S` one seed, `--steps K` (default 30), `--repeat R` (replay, default 5),
`--out <dir>` (default `.command-logs/fuzz/`). One summary line per route (`route seeds N passed P/N failed F`); exit 1
on any invariant failure or any replay case that did not pass every repeat. A failing seed writes
`fail-<route>-<seed>.json` (full trace) and a shrunk `min-<route>-<seed>.json` (replay with `--replay`) to the out dir.

Readiness: a route counts as mounted when `[data-navigation]`, an `input[type=range]`, or the shared `.workspace-board-stage`
is present (`MOUNTED` in `fuzz.cjs`). 2D routes match on navigation and sliders; surface routes such as `patches/coons` have
no navigation and can have no sliders, so they match on the board stage. A route that never mounts is reported `INVALID`
(launch timeout after 20 s), not `FAIL`.

## Actions

Inspector sliders (pointer drag, click on the track, arrow keys, typed entry in the slider's number field, typed
values aligned to the slider step so an integer-step parameter never gets a decimal), count setters (plus and minus),
playback Play/Pause where the graph has it, board point drags, board pan and wheel, lesson Back/Next, Esc, and rests.
Controls are keyed by position (`s<i>` is the i-th slider field of the inspector, `n<i>` the i-th standalone number
field) so a case file survives a reload; a key that no longer exists is skipped.

## Invariants

Observed per animation frame in the page from each slider's value and each number field's text, plus page and console errors.

| | |
|-|-|
| I1 | learner wins: after the learner's last change the value stays the learner's for 100 to 1000 ms |
| I2 | no A, B, A flicker within 300 ms (a playing sweep's turning point is exempt) |
| I3 | Esc stills everything: no value changes from 200 ms after Esc |
| I4 | no page error and no console error (no exception list) |
| I5 | a parameter the step did not touch does not change, except one that is playing |

A control counts as "playing" when a playback is running (the Pause button `Premor` shows) and its value moved meanwhile.
Board drags, playback toggles and lesson frames may rewrite several parameters, so they are exempt from I5.

`--inject-stale` schedules, 150 ms after each learner slider change, a write of the slider's previous value through
its DOM input; I1 must fail.
