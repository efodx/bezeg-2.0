Page: `/bezeg-2.0/learn/convexity-hulls` | commit 692a50a1 (src dirty) | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 0 (playground-attributable: no; longest 0 ms) | 12 (playground-attributable: yes; longest 58.1 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 29.4 ms (18.6 / 39.6; n=20, wheel) | 68.9 ms (30.6 / 97.5; n=40, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 19 >= 16 ms) | 32 ms (n=20, 20 >= 16 ms) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 24.4 / 38.9 ms (first frame 33.6 / 39.1) | 82.1 / 92.1 ms (first frame 121 / 149.8) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 6.1 ms (8.9, n=596; all rAF 6.1) | 34.7 ms (46.3, n=155; all rAF 34.7) |
| snapshots in 2 s, playing (control) | > 0 | 121 | 120 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 0 | 0 |
| snapshots in 2 s, hidden tab | 0 | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) | not measured: document.hidden stayed false (headless keeps every page visible; tried second tab bringToFront + window minimised; minimise had no effect) |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 |
