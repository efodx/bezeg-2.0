# 08 layout: Fourier Orodja/Odčitki overlap

Done
- Route: /bezeg-2.0/analysis/fourier-series (FourierSeriesGraph). Dev server 4483, scripts `.command-logs/f1-*.cjs`.
- Not reproduced as a settled state. Scan of 8 viewports (1440x900, 1280x720, 1920x1080, 1600x900, 1366x768, 1536x864, 1280x800, 1024x768), plain and `?learn=1`, 3.5 s settle: no card overlap (`f1-scan.cjs`). Examples: 1440x900 plain Odčitki 951,210,426x470 / Orodja 951,688 (gap 8); 1280x720 plain Odčitki 853,209,394x309 / Orodja y526.
- Only overlap seen: the very first cold dev load at 1440x900 plain: Orodja at 749,578 (inside Odčitki's x 951-1377 / y 210-680) after 4 s. Repeat loads (5 fresh contexts): Orodja flies in from a start position and at 1 s is mid-flight (e.g. 619,506), settled at 951,688 by 4 s. So the first reading was a slow cold compile, not a persisting layout.
- Odčitki "Več vsebine" click, Orodja click, minus/plus on N: rects stay consistent (Orodja follows Odčitki 309 -> 290 at 1280x720).
- Smoke of the strip fix: `just build` passed (`f1-build.log`); `just smoke-lesson sequence|prob-density|mechanics-descent --port 4391 --workers=1` all passed (`f1-smoke-<id>.log`).

Unverified
- No code change, no unit test (nothing red to fix). The N slider could not be driven by script (control not found), so Odčitki growth to 3+ "Členi vrste" lines was not exercised; only the production build (not served) could differ in KaTeX/font load timing.
- Need the owner's exact viewport/state (stored placements, preset, N) to reproduce.
