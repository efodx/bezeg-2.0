# OI smoke: point-set status regions and Voronoi construction reason

## Failures and repro

None observed. Every selected check passed on the coverage below.

## Run details

- Target: production preview at `http://localhost:4327/bezeg-2.0/` (started and owned outside this run; not started or stopped here).
- Revision: the brief names `051d75de`, which exists and has the same subject as the worktree HEAD `8818b1ac`. The two commits differ (193 files changed between them), and the worktree also has uncommitted changes. This run did not verify which revision the preview serves. Treat the results as verifying the preview as observed, not the working tree.
- Browser: Chromium only (Playwright, headless). No Firefox or WebKit coverage.
- Language: set per fresh context via `localStorage` (`bezeg-2.0:bezeg-language`); the English switch on check 1 used the in-app language select.
- Viewports: 390x844 with touch and mobile emulation; 1280x800 desktop.
- Data: no presets saved or deleted; fresh contexts only, nothing to clean up.
- Scripts and captures: `.command-logs/oi-smoke/` (`check1.cjs`, `check23.cjs`, `check3.cjs`, `check3shot.cjs`, logs, PNGs).
- Processes: each script closed its browser in `finally`, with a 120 s deadline. No server was started.

## Check table

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 1a | Voronoi `/compgeo/voronoi` 390x844 touch, SL, before site choice: Next/Play unavailable, reason in title/description/status | Passed | Predvajaj, Pokaži simetralo, Ponastavi gradnjo all `aria-disabled="true"`, `title` and `aria-describedby` text = "Najprej izberi mesto v seznamu mest." Tapping Predvajaj added a visible status "Najprej izberi mesto v seznamu mest." (`check1.log`, `m_sl_afterPress`). |
| 1b | Same screen switched to English | Passed | Language select used. Play, Show bisector `title`/description = "Choose a site in the site list first."; after tapping Play, status shows the same sentence. |
| 1c | Choose site P1 in inspector: Play works, reason gone | Passed | P1 selected; Play `aria-disabled` removed; reason text absent from page body; Play label Play -> Pause after tap; no console or page errors. Screenshot `c1-mobile-after-p1.png` (not viewed). |
| 1d | Same reason at 1280x800 | Partly passed | Title/description of Predvajaj, Pokaži simetralo, Ponastavi gradnjo = reason; pressing Predvajaj shows the reason in the visible status; after P1 the reason is gone from status. Not verified: that these buttons sit in the inspector container (selector did not confirm), and Play enabled state after P1 at desktop size. |
| 2a | `/compgeo/delaunay` at mount: `[data-readout-live]` count and `[data-pointset-announce]` text | Passed | Readout-live count 2 (allowed for Delaunay). Announce count 1, text empty. |
| 2b | Bezier clipping `/bezier/clipping` at mount | Passed | Readout-live count 1; announce count 1, text empty. |
| 2c | Polygon route `/compgeo/polygon-area` at mount | Passed | Readout-live count 1; announce empty. Visible status "Ploščina: 21." is a separate element. |
| 2d | Polygon route made self-intersecting via inspector fields (P4 moved from (5,3) to (1,-2)) | Passed | Visible status `p.pointset-status` changed from "Večkotnik je enostaven." to "Večkotnik ni enostaven: stranici 2 in 4 se stikata ali sekata." The announce region then holds exactly that sentence. The live readout (separate, visually hidden) reads "Večkotnik ni enostaven, zato ta vsota ni ploščina in Pickov izrek ne velja.", which is a different sentence, so it is not the same text. |
| 2e | Mouse drag of a vertex on canvas | Skipped | Inspector fields used instead, as the brief allowed. |
| 2f | No console errors | Passed for covered flows | Errors captured for the check 1 and check 2/3 contexts: none. |
| 3 | Visible status line appearance unchanged | Passed with limits | Screenshot `c3-polygon-visible-status-after.png` (viewed) shows the self-intersection sentence rendering normally. Computed style of `p.pointset-status`: 13.12px, rgb(91,103,90), block, same as the pre-edit "Večkotnik je enostaven." line. No pre-change build was available, so no pixel comparison was made. |

## Coverage gaps

- Browser: Chromium only.
- Revision: preview revision not verified against the worktree (see above).
- Check 1d: inspector container and desktop Play state not confirmed.
- Check 2e: canvas drag not exercised.
- Check 3: appearance compared to computed styles, not to an earlier screenshot.
- Not tested: physical devices, keyboard-only paths, screen reader output, other point-set routes beyond the three listed.
