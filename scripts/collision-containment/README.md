# Collision containment measurements

CP7 evidence for [collision playground](../../docs/specs/collision-playground.md) acceptance criteria 2, 3, 4 and 6 and the Containment section, per [task 07](../../docs/tasks/collision-playground/07-batch-b-acceptance.md) items 2 to 4. It changes nothing under `src/`.

```powershell
just build
just collision-containment /bezeg-2.0/learn/sweep-algorithms [results.json] [results.md]
```

The script copies `build/` to `%TEMP%/collision-cp7-build-<pid>` (so a concurrent `just build` cannot disturb a run), serves the copy under `/bezeg-2.0/` with SPA fallback (`serve.cjs`) and drives headless Chromium through Playwright. It finds controls by Slovenian role and name (radios "Preizkus vseh parov" / "Pometanje in obrezovanje", the slider, "Predvajaj" / "Premor"), sets the method through the UI and the count with End on the slider (the method's limit). It uses no test slot. Keep the machine idle.

Profiles: desktop 1440x900 unthrottled; 390x844 mobile (touch, device scale factor 2) with `Emulation.setCPUThrottlingRate` 4 on the page. CDP throttling does not reach the dedicated simulation worker (CP3 finding), so the throttled profile loads only the main thread; the worker runs at full speed.

## Methods

- **Containment.** Naive at its limit plays for 10 s. A `long-animation-frame` observer (buffered) lists frames over 50 ms in that window with script attributions; any script whose `sourceURL` contains `Collision` counts as playground code. Scroll: 20 `wheel` inputs (desktop, `page.mouse.wheel`) or touch scroll gestures (`Input.synthesizeScrollGesture`, mobile); latency is event timestamp to the first task after the next animation frame (rAF, then a MessageChannel task), a stand-in for next paint. Link clicks: 20 real clicks on the first header/nav link; a capture handler cancels the navigation so the page stays, and the Event Timing API (`durationThreshold` 16) gives each click's input-to-next-paint duration. Clicks with no entry were under 16 ms and are counted as 16 ms, so the p95 is an upper bound.
- **Switch latency.** Naive at its limit playing; click sweep; time until the live region announces the sweep snapshot (MutationObserver), and to the next frame. Five repeats.
- **Smoothness.** Sweep at its limit for 10 s under a Chromium trace (`devtools.timeline`). The draw callback is the `FireAnimationFrame` event that contains a `FunctionCall` from a `Collision*` chunk; LoAF would list only frames over 50 ms, so it cannot give a median. Other rAF callbacks on the page are reported separately as "all".
- **Lifecycle.** Messages from every `Worker` are counted by a listener installed through an init script (nothing in `src/`). Snapshots over 2 s while playing (control), with the canvas scrolled off-screen, and with the page hidden. Hiding uses a second tab brought to the front, accepted only if `document.hidden` reads true afterwards; headless Chromium may keep every page visible, in which case the cell reads "not measured" rather than faking `visibilitychange`. Navigation away: click the first header link (client-side, checked by a window marker), then `Target.getTargets` on a browser session lists no worker target from the server, and no messages arrive for 2 s.

Targets: no LoAF over 50 ms in playground code; scroll and click p95 at most 100 ms; switch at most 250 ms throttled; draw median at most 16.7 ms desktop and 33.3 ms throttled; zero snapshots in the 2 s idle cases.
