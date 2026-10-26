# Illustrated chapter examples — final browser acceptance

Status: **passed**. The production preview on port `4397` served the integrated build at `93066f43c9edf0cd145473fd62317f7397934b09`. The handler confirmed the served HTML and JavaScript/CSS bundles match the local production build. Browser work was limited to the assigned worktree and an isolated Chromium context.

## Execution record

| Field | Value |
|---|---|
| Checkout | `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.worktrees\consolidated-learning` |
| Branch / revision | `codex/consolidated-learning` / `93066f43c9edf0cd145473fd62317f7397934b09` |
| Target | `http://127.0.0.1:4397/bezeg-2.0` |
| Reachability | HTTP 200; page title `Bezeg` |
| Browser | Chromium `156.0.8078.4`; reduced motion enabled |
| Full custom run | `node .command-logs/illustrated-final-browser.cjs` — 2026-10-26 15:47:28–15:52:00 UTC; 271.7 seconds; 131 of 132 checks passed |
| Focused rerun | `$env:BEZEG_SMOKE_FOCUSED = 'fallback-observation'; node .command-logs/illustrated-final-browser.cjs` — 2026-10-26 15:54:22–15:54:29 UTC; 6.2 seconds; fallback and observation/restore checks passed |
| Combined result | **133 distinct acceptance checks passed.** The focused run also repeated the 56-image inventory-size check. |
| JSON evidence | `.command-logs/browser-smoke-results/illustrated-final-custom-report.json` and `.command-logs/browser-smoke-results/illustrated-final-focused-report.json` |

The first run’s single failure was a harness locator race: after the intentionally failed image request, React removed the image before the harness could scroll that stale image locator. The harness now waits for the fallback class on the live card itself. The focused rerun confirmed the fallback prompt and action work and open the lesson graph; this was not a product failure.

## Acceptance results

| Criterion | Status | Observed evidence |
|---|---|---|
| A6 — entry and return continuity | Passed | All eight chapter routes opened. Canonical example, legacy activity, legacy family-explore, and catalog learn routes survived refresh with the expected owner link. Browser Back/Forward restored the lesson, selected English, and reading position. Bézier control-points and Splines worked-join returned at midway and completion with invoking-link focus restored and zero scroll/section displacement. |
| A7 — readable and accessible chapters | Passed | All 64 chapter × language × viewport checks passed at 1440×950, 1920×1080, 390×844, and 390×844 with 200% root text size. Each had no document horizontal overflow, prompt weight 400, an accessible localized launch name, and launch targets at least 44×44 CSS pixels. Keyboard language change and Enter launch passed; a 390px touch tap opened the selected lesson. The missing-image fallback retained title, prompt, and launch action and opened a usable graph. |
| A8 — bilingual inventory and media | Passed | All eight routes reconciled every card ID, order, canonical href, localized title, prompt, alt text, and caption against the 56-item inventory in both languages. All 56 images decoded in Slovenian and all 56 decoded in English. |
| Representative curve interactions | Passed | Bézier control-point drag changed point coordinates and curve path. De Casteljau changed (t) from 0.50 to 1.00 and updated construction points and curves. Increasing rational weight changed the rendered path. PH generating-point drag changed the editor value and curve while its auxiliary board was open. Two polynomial↔PH navigation cycles disposed of the auxiliary board on return; a subsequent polynomial edit changed the curve. |
| Edited entry scene and observation flow | Passed | Taylor’s entry degree was set to 7 and its bound revealed. At the Step 3 observation, the graph unlocked; degree 8 was editable. Enter on the compact reopen tab returned to the same frame with degree 8 intact. Next advanced exactly one frame to Step 4. Exit restored degree 7, the revealed bound, and the original board ID, view, size, and 50 objects. |
| Runtime and cleanup | Passed | Zero uncaught runtime errors. The only console error was the intentional 404 from the intercepted fallback PNG request. Each isolated browser context and Chromium process was closed. No user presets were written. |

### Return-flow details

| Chapter section | Stage | Keyboard launch | Invoking link focus | `scrollY` / section delta | Language |
|---|---|---:|---|---:|---|
| Bézier `control-points` | Midway | Yes | Restored to the same dotted-ID card link | 0 px / 0 px | `en` |
| Bézier `control-points` | Completion | No | Restored to the same dotted-ID card link | 0 px / 0 px | `en` |
| Splines `worked-join` | Midway | No | Restored to the same dotted-ID card link | 0 px / 0 px | `en` |
| Splines `worked-join` | Completion | No | Restored to the same dotted-ID card link | 0 px / 0 px | `en` |

### Screenshot review

All screenshots were captured after `document.fonts.ready` and MathJax startup/typesetting settled, then inspected visually. Desktop and projection cards remain balanced; at 390px the image, caption, copy, and action stack within the viewport width; at 200% text the page scrolls vertically without horizontal overflow. The fallback screenshot shows the card’s title, prompt, and usable launch action after its image request fails.

| View | Screenshot |
|---|---|
| 1440×950 | `.command-logs/browser-smoke-results/responsive-desktop-1440.png` |
| 1920×1080 projection | `.command-logs/browser-smoke-results/responsive-projection-1920.png` |
| 390×844 | `.command-logs/browser-smoke-results/responsive-narrow-390.png` |
| 390×844 with 200% text | `.command-logs/browser-smoke-results/responsive-narrow-390-text-200.png` |
| Failed-media fallback | `.command-logs/browser-smoke-results/missing-media-fallback-success.png` |

## Gaps and limits

No assigned browser checks remain incomplete. Evidence is from headless Chromium against the local production preview; it does not cover a physical device, classroom projector, screen-reader behavior, GitHub Pages hosting, or separate mathematical and performance validation.
