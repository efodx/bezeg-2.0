# OI smoke: De Casteljau run stop and readout heading styling

## Result summary

- Check 1 (De Casteljau run stops on a curve command, continues after a display switch): passed on `decasteljau` and `decasteljau2`.
- Check 2 (readout heading styling and empty `ul` count): passed for font-size, font-weight and empty `ul` count. The margin-bottom check did not match: the heading margin differs between headings (8px and 10px), see the table.
- Check 3 (no console errors): passed on every route visited. Only `console.error` and uncaught page errors were captured.

## Run details

- Target: production preview at `http://127.0.0.1:4327/bezeg-2.0` (started and owned outside this run; not started or stopped here). The preview served HTTP 200 at the base path; the root `/` returned 404.
- Revision: the worktree HEAD is `cbb2b2a1` (`docs/reviews/feature-streams/controls`). The brief names `4f72c86c`, which exists in the repository, but I did not verify which revision the preview build serves. Results describe the preview as served, not a verified build of either commit.
- Browser: Chromium, headless, Playwright, viewport 1280x800, language Slovenian (`localStorage` key `bezeg-2.0:bezeg-language` set to `sl` per fresh context).
- Scripts and captures: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\agent-a18d8a9709fec93af\.command-logs\oi-smoke\` (`run.cjs`, `run2.cjs`, `run3.cjs`, `run4.cjs`, `run5.cjs`; results `oi-results*.json`; `oi-decasteljau.png`, `oi-decasteljau2.png`, `oi3-*.png`).
- Cleanup: each script closed its browser; no processes started by this run remain.

## Check 1: De Casteljau run stop and resume

Route ids come from `src/demonstrations.ts`: `bezier/decasteljau` and `bezier/decasteljau2` (the brief's `decasteljau-alternative` is the catalog id, not the route).

Steps, run in `run3.cjs` (the final run):
1. Open the route, read the play button (`.decasteljau-animation-actions`), press Predvajaj.
2. About 150 ms after Play, at t = 0.53 and status "Predvajanje", open the Uredi tab and enter `1.5` in the `p₀, x` field (was `-4`), then press Enter.
3. Sample the play button, slider `t`, status and rAF count over 1.6 s.
4. Press Predvajaj again, open Prikaz and toggle the first enabled checkbox ("Oznake točk").
5. Sample over 0.8 s.

| Route | Before | After curve command | Stopped? | Play again | After display toggle |
| --- | --- | --- | --- | --- | --- |
| `decasteljau` | Predvajaj, t 0.50 | Predvajaj, status "Na premoru", t 0.56 frozen, rAF frozen | Yes | Premor, t 0.72 | Premor, t 0.91, rAF advancing; keeps playing |
| `decasteljau2` | Predvajaj, t 0.50 | Predvajaj, status "Na premoru", t 0.55 frozen, rAF frozen | Yes | Premor, t 0.71 | Premor, t 0.93, rAF advancing; keeps playing |

- The play button label changed from Premor to Predvajaj when the run stopped, and the status changed to "Na premoru" (paused).
- Earlier runs (`run.cjs`, `run2.cjs`) had the edit landing after the run had already reached t = 1, so they did not prove a stop. Those results were discarded.
- Note on `decasteljau2`: with no user action, `t` wraps from about 0.96 to 0.02 and playback continues ("Predvajanje"), so the route loops. `decasteljau` ends at t = 1 with status "Končano". This loop is the route's own behavior (observed in `run4.cjs` with no curve command); it is not caused by the display toggle.
- `aria-pressed` is not used on this button. State is shown by the label (Predvajaj / Premor) and the status text.

## Check 2: readout heading styling and empty lists

`.inspector-reveals-title` is the `ReadoutHeading` class (`src/graphs/base/controls/ReadoutParts.tsx`). The CSS rule (`ReadoutParts.css`) sets `margin: 0 0 8px; font-size: .93rem; font-weight: 750`.

| Route | Heading text | font-size | font-weight | margin-top | margin-bottom | margin-left |
| --- | --- | --- | --- | --- | --- | --- |
| `/analysis/taylor` (function) | Razkritja | 14.88px | 750 | 0px | 8px | 0px |
| `/analysis/taylor` (function) | Odčitki | 14.88px | 750 | 0px | 10px | 0px |
| `/analysis/sequence` (function) | Razkritja | 14.88px | 750 | 0px | 8px | 0px |
| `/analysis/sequence` (function) | Odčitki | 14.88px | 750 | 0px | 10px | 0px |
| `/compgeo/voronoi-degenerate` | Izrojena mesta | 14.88px | 750 | 0px | 10px | 0px |
| `/compgeo/interval-sweep` | Seznam intervalov | 14.88px | 750 | 0px | 10px | 0px |

- font-size and font-weight are identical across all routes.
- margin-bottom is not identical. The rule sets 8px; headings on the function pages render 10px in some cases and 8px in others. The compgeo headings render 10px. Margin is therefore not uniform across the readout headings checked.
- The brief named `/compgeo/voronoi` and `/compgeo/point-set-triangulation`. Neither route has an `.inspector-reveals-title` element in its default state (0 found after 2 s). The compgeo routes with `ReadoutHeading` in the default state are `voronoi-degenerate` and `interval-sweep`, so these were used instead.
- Empty lists: `document.querySelectorAll('.workspace-inspector ul:empty')` returned 0 on all four routes, and `ul:empty` on the whole page returned 0. Each route has a `.workspace-inspector` element (1 each), so the zero count is not trivial.

## Check 3: console errors

- No `console.error` messages and no uncaught page errors were recorded on `decasteljau`, `decasteljau2`, `analysis/taylor`, `analysis/sequence`, `compgeo/voronoi-degenerate` or `compgeo/interval-sweep`.
- Coverage limit: only errors and uncaught exceptions were captured. Console warnings were not recorded.

## Gaps and limits

- Preview revision was not verified; see Run details.
- Browser coverage is Chromium only, headless. No Firefox or WebKit.
- Check 1 used a single edit (one `p₀, x` coordinate) and a single display checkbox. Other curve commands and checkboxes were not tested.
- Check 2 compared the heading margin only as computed style. No visual comparison was made.
- No screenshots were opened or inspected in this run.
