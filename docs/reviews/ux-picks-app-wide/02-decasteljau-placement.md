# De Casteljau placement reasoning (input to the conversion guide)

`DecasteljauGraph.declaration()` follows Taylor's rule: what the learner changes while watching goes on the board, everything else in Orodja.

- **Parameter `t` (`decasteljau-t`, board range 0 to 1, step 0.01).** The whole lesson is moving `t` and watching the interpolation rows and the final point follow, so the control and the reading belong next to the board. Its readout row `t` reproduces the panel's "t = 0,50" (the panel's `<output>`), and the arbiter key is the one task 01 bound.
- **Play (`play`, board action, `pressed` while running).** Playback is the same watch-while-changing moment as the parameter: the learner starts it and keeps their eyes on the construction. One toggle action with `pressed` mirrors the single Play/Pause button; the lesson commands play and pause both map to it.
- **Reset (`reset`, board action, enabled when not already at t = 0 and stopped).** It is the run's undo (`stop`), pressed while watching, and the present button is disabled at the start exactly as `enabled` says.
- **Full curve (`full-curve`, Orodja action in section `construction`, `pressed` follows the switch).** It is a display setting chosen once, not changed while watching, and has no arbiter key, so it is a toggle-like action; a frame that uses it opens `tools`. The lesson's `curve-visibility` action `decasteljau-full-curve` is unchanged.
- **Animation speed (not declared).** It has no arbiter binding, so it cannot be a declared parameter (the contract requires bound keys); it stays in the present panel until it is bound. By the rule it would be an Orodja range: a setting changed before a run, not while watching.
