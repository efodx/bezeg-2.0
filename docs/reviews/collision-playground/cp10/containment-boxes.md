Page: `/bezeg-2.0/learn/convexity-hulls` | commit 692a50a1 | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 103 (playground-attributable: yes; longest 85.4 ms) | 88 (playground-attributable: yes; longest 364.2 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 309.1 ms (283 / 310.7; n=20, wheel) | 152.5 ms (111.2 / 1179.9; n=40, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 19 >= 16 ms) | 32 ms (n=20, 20 >= 16 ms) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 77.5 / 82.5 ms (first frame 146.3 / 154.5) | 411 / 413.3 ms (first frame 715.9 / 809.1) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 85 ms (88.2, n=104; all rAF 85) | 365.1 ms (386.3, n=21; all rAF 365.1) |
| snapshots in 2 s, playing (control) | > 0 | 127 | 147 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 0 | 65 |
| snapshots in 2 s, hidden tab | 0 | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | locator.tap: Timeout 3000ms exceeded. |
