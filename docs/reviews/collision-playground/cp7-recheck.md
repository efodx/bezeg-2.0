# CP7 recheck: paused and playing method switch, first-load count

Target: http://127.0.0.1:4320/bezeg-2.0/learn/sweep-algorithms (production preview of commit 50d8a23b). Playwright Chromium, headless, fresh context per run. Script: `%LOCALAPPDATA%\Temp\pw\cp7r.cjs` (outside the repo). Logs: `%LOCALAPPDATA%\Temp\pw\sl1440-r.log`, `en390-r.log`.

Runs: Slovenian at 1440x900 with mouse clicks; English at 390x844 touch (`hasTouch`, `isMobile`, tap on the method labels). Both runs used the same script.

## Results

1. Paused method switch: PASS (both runs).
   - SL 1440, Pause (`Premor`) then 6 switches (3 each way). Every switch: the live region named the new method within 60 to 80 ms. Example: `300 objektov, Preizkus vseh parov: 44.850 preizkusov pravokotnikov na korak, hitrost 100 %`. Naive readout box tests = 44.850 = 300*299/2. Sweep readout box tests = 496. The readout matched its method within 17 to 77 ms.
   - EN 390 touch, Play label after Pause. 6 tap switches. The region named the new method within 60 to 71 ms, e.g. `300 objects, Test every pair: 44,850 box tests per step, speed 100 %`. Naive box tests = 44,850 = n(n-1)/2. Sweep box tests = 512. Readout matched within 65 to 75 ms.
2. Switch while playing: PARTIAL FAIL on the literal wording.
   - Per run, 2 switches, each sampled every 100 ms for 3 s (28 samples each).
   - The old method's name appeared in exactly 1 sample per switch, the first one taken at the click instant, before the new announcement. Observed first samples: SL naive switch `300 objektov, Pometanje in obrezovanje: 496 ...` (old sweep name); EN sweep switch `300 objects, Test every pair: ...` (old name). The new name appeared at 105 to 122 ms and remained for the rest of the 3 s window.
   - After the first about 100 ms, the region never named the old method. The stale text is the previous announcement, which is replaced about 100 ms after the click. Whether that counts as a fail depends on whether the handler accepts a sub-100 ms stale window.
3. First-load count: PASS. Slider output `300` and readout Objects `300` at first load (before and after the language change), SL 1440 and EN 390. The earlier 299 vs 300 did not reproduce in 4 loads.
4. Console errors: PASS. Zero `console.error` and zero `pageerror` events in both runs.

## Coverage gaps
Headless emulation only, no physical touch device. No screen reader. One fresh load per configuration. Playing-state switches were measured for 2 switches per run, not 3 each way. Reduced motion not tested.

**Handler reading (2026-11-07):** item 2 passes. The sample at the click instant is the previous announcement still in the region; the live region changes only when the matching snapshot arrives (105–122 ms), and the old method's name is never written after the switch, so a screen reader never hears it.
