# Compact chapter exploration browser smoke

Status: bounded browser smoke completed. Content and launch checks passed for all eight chapter routes in Slovenian and English. The required screenshots and desktop/narrow measurements are saved alongside this report. One early Rational curves width reading was not reproducible on a fresh, settled page; see layout notes below.

Target: `http://127.0.0.1:4391/bezeg-2.0` (handler-owned production preview, HTTP 200). Checkout: `C:\Users\NonFriedMotherBoard\.codex\worktrees\compact-chapter-exploration\bezeg`, HEAD `f2f628e61e51412901245b206e2009ab3d688d24`, isolated compact-reader changes. Chromium `156.0.8078.4`. The preview build passed at 08:58:17Z (`.command-logs/2026-10-26T08-58-17-207Z-748-05233740.log`).

## Required size comparison

The same English “Move a control point” card at 1440×900 and 16px text measured 780×729.109px before and 780×248.438px after: a 480.672px (65.93%) height reduction. The preview is 240×146.656px with `object-fit: contain`, natural image size 720×440, nonempty alt text and caption. At 390×844, normal text, the card measured 358×528.891px; at 200% root text it grew to 358×1315.266px while the document stayed 390px wide.

Artifacts: [after-desktop.png](after-desktop.png), [after-shape-control.png](after-shape-control.png), [after-narrow.png](after-narrow.png), and [after-dimensions.json](after-dimensions.json).

## Route and layout evidence

Each route loaded in both languages. The page heading translated, every card had a title, an accessible landmark name including that title, and a launch action; reader pages did not mount the live graph. Counts below are cards and unique launch destinations per language.

| Route | SL and EN cards / destinations | Content result |
|---|---:|---|
| Foundations | 6 / 6 | Passed |
| Bézier curves | 6 / 6 | Passed; prepared activity actions and preview alt/captions verified |
| Rational curves | 15 / 15 | Passed |
| Splines | 11 / 11 | Passed |
| PH curves | 7 / 7 | Passed |
| Parametrization | 7 / 7 | Passed |
| Functions and calculus | 11 / 11 | Passed |
| Analysis | 21 / 21 | Passed |

All 16 route/language pairs were probed at 1440×900 and 390×844 with root text at 100% and 200%. Foundations and Bézier passed all four combinations in both languages. Rational curves in Slovenian passed all four; English passed desktop at both sizes and narrow at 100%. One earlier immediate English Rational curves measurement at 390×844/200% read 398px document width. A fresh targeted reproduction measured 390px document and body width immediately and after font/layout settling; another fresh 1200ms-settled reproduction also measured 390px. Long MathJax glyph bounds extend beyond the viewport inside their intended horizontally scrollable formula containers, but the page itself remained 390px wide. The 398px reading is therefore unconfirmed and was not attributed to the compact cards.

The other five routes completed their four layout probes in both languages. The harness recorded any overflows in an aggregate, but its final JSON was interrupted by a later guided-context assertion, so I cannot claim the aggregate was empty for those routes. No layout probe threw; the only retained anomalous width was the unconfirmed Rational reading above.

## Interaction evidence

- The prepared “Move a control point” card showed visible keyboard focus (3px solid outline), launched with Enter to `activity=shape-control`, and displayed the board and “Continue reading” action in view. Enter on that action restored focus to the same card and its prior scroll position (922px); browser Forward restored the activity return control in view.
- The existing standalone-learning smoke selected six Bézier activity “launch and authored scene” cases; all six passed, including board/scene checks. The sampled curve-parameter and Bernstein cases also exercised reading return, Forward, reset, and fresh refresh. Log: `.command-logs/2026-10-26T09-17-31-128Z-103572-f9e1e46c.log` (6 passed; only `NO_COLOR`/`FORCE_COLOR` environment warnings).
- Foundations ordinary Bernstein exploration launched with `?explore=foundations.why-weights.bernstein`, showed the board without prepared activity query/context, and returned to `#why-weights`. The guided link launched with `?learn=1&explore=foundations.why-weights.bernstein`, showed its family investigation prompt, and browser Back returned to the same reader section. Both links had visible keyboard focus. No browser console or page errors were observed in these sampled interactions.

## Harness notes and limits

The first pass compared inventory authored-block counts with rendered per-demonstration cards; corrected assertions use the chapter’s unique destination counts. Another harness assertion initially counted the expected `.family-investigation-context` as a prepared activity context; after targeting prepared contexts specifically, ordinary and guided family workflows passed. These were harness setup errors, not product failures.

The run covers the eight reader routes, representative keyboard and launch/return workflows, and six existing Bézier activity smoke cases. It is not a physical-device check, exhaustive accessibility audit, or full test suite. Browser contexts were closed; the `just smoke-built` runner disposed of its temporary server on port 4392. The handler-owned preview on port 4391 remains running.

## Final supplemental layout verification — handler, 09:20 UTC

The handler closed the aggregate logging gap with a separate layout-only Chromium run on the same isolated production build. All 48 saved probes passed: Rational curves plus the five remaining chapters, both languages, 1440px/390px viewports, and 100%/200% root text. Every page had populated exploration cards, document width stayed within the viewport, and all card bounds fit. See [layout-verification.json](layout-verification.json). Together with the worker's 16 passing Foundations/Bézier probes, this completes all eight chapters' requested language/viewport/text-size combinations. Rational's earlier 398px reading did not reproduce. The selected final browser coverage is accepted with the historical observation retained above.
