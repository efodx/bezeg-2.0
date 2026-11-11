# f2a-mech-02 final evidence (descent state model and graph)

Files (uncommitted): `src/mechanics/trackModel.ts` and `.test.ts` (60 tests), `src/graphs/mechanics/DescentGraph.tsx` and `.test.tsx` (37 tests), one `descent_graph_*` block (97 keys, identical key sets) after the last `waves_graph_*` key in `sl.ts` and `en.ts`, status lines in `docs/tasks/mechanical-curves/README.md` and `02-descent-graph.md` (in review). No route, no commit.

Model: state, strict `checkField` (no rounding), `snapDrag` (drag only), `beadParameter`, derivations; independent oracles in the model test (closed forms, Simpson, AGM pendulum period, 3000 seeded tracks).
Graph: three modes (race, track, tautochrone), host-held time with time Slider and Play/Pause/shared Reset, fake-clock-testable scheduler, pause on any stored-field change (also direct `setState`), time capture/restore refusing an invalid time, muted LiveReadout while playing, draggable handles (touch radius 26) with number fields for every coordinate, owned objects and listeners disposed to the pre-mount count.

## Checks (observed)
- `just unit src/mechanics src/graphs/mechanics`: exit 0, 5 files, 129 tests passed (includes the accepted kernel tests).
- `npx tsc --noEmit --pretty false`: 1 error, `src/graphs/dynamics/PhasePortraitGraph.test.tsx(131,23)` (another worker's file); none in owned files.
- `just lint src/mechanics src/graphs/mechanics`: exit 0. `just build`: exit 0 (run before the last test-only type fixes; the tests are not in the bundle).
- Trailing-space and control-character greps on the owned source, test, both locale files and the two task docs: empty. `git diff -U0 -- src/localization | grep -E '^-[^-]'`: empty.
- Logs: `.command-logs/mech02b-*.log`.

## Mutations (graph source; each restored, `cmp` against `.command-logs/mech02b-graph.bak` identical; output `.command-logs/mech02b-mutations.log`)
- drag `snapDrag` removed: the drag snapping test failed.
- typed refusal returns true: the refusal test failed.
- pause on stored-field change removed: the every-edit-pauses test failed.
- saved-time upper bound removed: the "beyond the run" restore test failed.
- derived cache key reuse disabled: the derivation reuse test failed.
- listeners not removed on dispose: 3 tests failed (unmount, StrictMode, disposal).
- frame delta clamp removed: the playback test failed.
- `HANDLE_TOUCH_RADIUS` 26 -> 10: the touch zone test failed.
- LiveReadout not muted: the live region test failed.
- theta handle placed unflipped: 2 tests failed (tautochrone, theta drag).

## Drag recompute measurement
JSDOM PLACEHOLDER, not a performance result (`.command-logs/mech02b-redraw.log`): race (radius edit) median 15.07 ms, p95 22.12 ms; track (P1 drag) median 10.49 ms, p95 18.64 ms; tautochrone (theta drag) median 7.96 ms, p95 12.73 ms; n=40 each. A browser measurement per docs/performance-plan.md is owed when the graph gets a route.

## Decisions and doubts for review
- Typed off-grid values are refused, never rounded; a drag snaps to the nearest grid value and clamps into the range; stepping a theta field snaps. theta = pi is the one stored off-grid value (the bottom), reached by drag or the up-arrow after 3,1; typed 3,14 is refused.
- Tautochrone arc is the osculating circle (radius 4r) through the shared lowest point. Beads of the race stay at the end of their track after arriving; slider end is the slowest time rounded up to 0,01 s. Times show four decimals, trailing zeros dropped (`1,003 s`).
- Mode label is "Poskus" / "Experiment": "Prikaz" collides with the app shell's display group label (multiple-label match found by the test).
- The depth is entered positive downward; the vertical axis shows the negative depth (stated in the hint). Control-point fields are labelled "globina", the sentence says the second number is the depth.
- Track-mode frame is fixed so dragging never moves the view. `derivedKey` of track mode includes `showCycloid`, so toggling it re-derives (cheap, conservative).
- Hand check fixed during testing: a line falling h takes L / sqrt(g h / 2); my first expectation (without the 1/2) was wrong, the kernel was right.
- Slovenian text is mine and not native-reviewed: "tir", "kroglica", "tavtohrona (krivulja enakih časov)", "Poskus", "Zaprta formula", "Težni pospešek g" (README terms used; the new words "Poskus", "Razlika do cikloide", "Zaprta formula" are not in the table). "Najhitrejša je Cikloida" capitalises the track name mid-sentence in both languages.
- `bead` fill uses a function attribute cast `as JXG.Point` (same pattern as PointSetGraph).
- Not verified: no browser view or smoke test (no route), on-board label placement and caption stack versus content overlap, real touch behaviour, screen reader output, the term table rows entering `docs/localization.md` (only when shipped).

## Review repairs (mech02c)
Logs `.command-logs/mech02c-*.log`. Final: `just unit src/mechanics src/graphs/mechanics` exit 0; `tsc` 0 errors; `just lint` 0; `just build` 0; whitespace, control-character and `git diff -U0 -- src/localization | grep -E '^-[^-]'` greps empty. Mutations (`mech02c-mutations.log`; ready forced true, guide caption hidden, theta tag back to the bare number, track `tEnd` back to the cycloid time) failed 4 tests (model slider-end, graph no-run, graph tautochrone guide caption, graph wording); restored, `cmp` against `mech02c-graph.bak` and `mech02c-model.bak` identical. Tests were written after the fixes, so "failed before" is shown by the mutations, not by a pre-fix run. Not mutated: the string checks for repairs 2, 3, 5, 6 (they compare literal text), and the tautochrone arrival test (passed on first run: all three beads, including the cusp theta = 0, give 1,003033 to 5 decimals).
1. No bead, no run: `trackModel.ts:309` gives `tEnd` 0 (inadmissible, cycloid hidden); `DescentGraph.tsx` `play()` refuses when `tEnd` is 0, `DescentPlayback` passes `ready: false` with the new `descent_graph_no_run` reason (Play, Reset) and gives the time slider `unavailableReason` (range 0..0). Tests: `trackModel.test.ts` slider-end test; `DescentGraph.test.tsx` "an inadmissible track with the cycloid hidden has no bead".
2. `descent_graph_status_above_start` reworded to "Kontrolna točka leži nad začetkom A; čas računamo le, ko nobena ne leži nad njim. Čas ni izračunan." / English equivalent (existing status test still matches).
3. `descent_graph_cap_units` is "g = {value0} m/s²"; test asserts the caption `g = 9,81 m/s²`.
4. Guide arc caption: a second `descent_graph_name_arc` tag on the guide (`DescentGraph.tsx` after the race arc tag), visible in tautochrone while `showArc`; test counts it once and not after the switch is off.
5. Theta help now "od 0 do π (3,1416; najnižja točka), korak 0,05 ... Korak naprej po 3,1 pride na π"; the rejection hint names the step after 3,1 and the drag. Typed 3,1416 stays refused (it is above π): the field shows "Vnesi vrednost med 0 in 3,14." (the shared range hint, which rounds π), the help beside it says why. Tests: help text, typed 3,1416 refused, ArrowUp from 3,1 stores π. Doubt: the range hint reads 3,14 for the maximum π; fixing it needs a NumberInput change (out of scope).
6. The bead row `θ = … rad: …` is the catalog key `descent_graph_value_bead_row`; test compares against it.
7. Theta handle tags read "Kroglica 1" (`descent_graph_cap_bead_tag`); test checks the three tags and the Slovenian text. The moving-bead number tags stay bare numbers.
8. Tautochrone arrival test: theta 0, 1,5, 3,1 (typed) all give 1,003033 (5 decimals), readouts show `1,003 s`, status says equal times.
