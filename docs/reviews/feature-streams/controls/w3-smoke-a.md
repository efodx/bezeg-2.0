# Wave 3 smoke, Group A (playback), commit d0a72a48, production preview :4327

Chromium (Playwright), 1280x800; mobile 390x844 touch on decasteljau, arc-length, parametric. Scripts and logs: `.command-logs/w3a-*.cjs`, `.command-logs/w3-smoke-a/`.

| Route | 1 load | 2 controls | 3 unavailable | 4 keyboard | 5 SL/EN/SL |
| --- | --- | --- | --- | --- | --- |
| bezier/decasteljau | pass | pass | pass (Reset aria-disabled at t=0) | pass | pass |
| bezier/decasteljau2 | pass | pass | pass | pass | pass |
| rational/rational-decasteljau | pass | pass | pass | pass | pass |
| bezier/arc-length | pass | pass | pass (reduced motion) | pass | pass |
| curve-geometry/parametric | pass | pass | pass (reduced motion) | pass | pass |

Observed: t readout `t = 0,50` SL, `t = 0.09` EN; moves during play (0.50, 0.69, 0.90); `[data-readout-live]` is empty while playing, announces on pause. Pause on t slider, board press, point drag, point-panel typing; display switch keeps playing. Reset gives t=0 and aria-disabled. Reduced motion: Play focusable, aria-disabled, reason announced once (live region, repeated presses do not repeat it; describedby text is visually hidden). Parametric: "Predvajaj"/"Premor", parameter and radius sliders pause. Mobile: buttons 166x44, tap starts play. Console errors: none.

Gaps: arc-length Play at end not reached (run did not finish in 35 s); Decasteljau Play at end restarts from 0 rather than being unavailable (check 3 used Reset at start). Parametric reduced-motion not repeated in EN beyond reason text. No physical touch device.
