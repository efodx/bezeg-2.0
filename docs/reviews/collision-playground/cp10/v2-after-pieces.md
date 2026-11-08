Page: `/bezeg-2.0/learn/convexity-hulls` | commit 692a50a1 (src dirty) | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 0 (playground-attributable: no; longest 0 ms) | 34 (playground-attributable: yes; longest 71.1 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 35.9 ms (24.3 / 36.7; n=20, wheel) | 75.9 ms (30.7 / 151.1; n=40, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 20 >= 16 ms) | 32 ms (n=20, 20 >= 16 ms) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 17 / 30.4 ms (first frame 32.1 / 38.3) | 79 / 94.7 ms (first frame 117.3 / 129.2) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 6 ms (8.4, n=600; all rAF 6) | 33 ms (38.4, n=167; all rAF 33) |
| snapshots in 2 s, playing (control) | > 0 | 121 | 123 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 0 | 0 |
| snapshots in 2 s, hidden tab | 0 | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 |
