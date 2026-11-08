Page: `/bezeg-2.0/learn/convexity-hulls` | commit 692a50a1 | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 47 (playground-attributable: yes; longest 415.1 ms) | 52 (playground-attributable: yes; longest 1791.5 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 983.1 ms (933.4 / 992.1; n=20, wheel) | 1718.7 ms (1678.8 / 1918.1; n=20, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 19 >= 16 ms) | null ms (n=0, 0 >= 16 ms; link not clickable: locator.tap: Timeout 3000ms exceeded.) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 407.9 / 417 ms (first frame 807.3 / 1221.6) | 1992.2 / 2013.1 ms (first frame 3783.5 / 3793.2) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 496 ms (507.2, n=19; all rAF 496) | 2144 ms (2197.2, n=4; all rAF 2144) |
| snapshots in 2 s, playing (control) | > 0 | 121 | 121 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 49 | 221 |
| snapshots in 2 s, hidden tab | 0 | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | locator.tap: Timeout 3000ms exceeded. |
