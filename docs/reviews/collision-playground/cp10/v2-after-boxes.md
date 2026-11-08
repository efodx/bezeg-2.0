Page: `/bezeg-2.0/learn/convexity-hulls` | commit 692a50a1 (src dirty) | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 0 (playground-attributable: no; longest 0 ms) | 52 (playground-attributable: yes; longest 70.9 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 36.3 ms (24.7 / 38.6; n=20, wheel) | 85.6 ms (29.7 / 202.5; n=40, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 18 >= 16 ms) | 32 ms (n=20, 20 >= 16 ms) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 26.5 / 39.7 ms (first frame 34.5 / 39.9) | 79.2 / 86.7 ms (first frame 118.9 / 124.9) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 6.4 ms (9.2, n=600; all rAF 6.4) | 32.8 ms (38.5, n=171; all rAF 32.8) |
| snapshots in 2 s, playing (control) | > 0 | 120 | 125 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 0 | 0 |
| snapshots in 2 s, hidden tab | 0 | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 |
