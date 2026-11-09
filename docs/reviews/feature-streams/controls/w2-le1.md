# W2 LE1: collision playground evidence

Files: `CollisionPlayground.tsx`, `.css`, `.test.tsx` (CollisionInspect.tsx untouched: 0 raw inputs; it has its own `role="status"` div with class `collision-playground__live`, so I kept that CSS rule).

Changes: method and overlay radio groups -> `ChoiceSelect` (overlay legend text is its `help`); bounce -> `OnOffSwitch`; the live div -> `LiveReadout` over a `SettledReadout` (`replace()` publishes at once), `muted={playing}`. Removed `__methods`, `__choice` CSS and the nbsp-toggle ref. Raw `<input|<select` count: 0.

Step once (`disabled={playing}`) is in the C12 playback row with Play and New arrangement: left as is.

Behaviour change: a second action with an identical announcement text is no longer re-spoken (the nbsp toggle trick cannot survive `SettledReadout` normalisation). Test renamed accordingly.

Checks: `just unit src/learning/playground/collisions` passed (101 tests); `just typecheck` passed; lint of tsx and test clean.
Mutation (setMethod send removed, setBounce send removed, muted forced false): 4 tests failed (method select, real-worker announce, mute/pause, keyboard path incl. method/bounce).
Test time: ~6s whole folder, no before baseline recorded.

## Inventory row
| Control | Capability | Before | After |
|---|---|---|---|
| Collision playground: method, overlay stage, bounce, live status | C9 mode choice, C4 switch, C26 live readout | radio fieldsets, checkbox, own role=status div | `ChoiceSelect` x2, `OnOffSwitch`, `LiveReadout` muted while playing; Play/Step/New left (C12), readouts dl left (C27) |
