# Controls stream, task 0 item 8: runtime observations

## Setup

- Preview: production build at `http://127.0.0.1:4327/bezeg-2.0` (handler-owned, not started or stopped by this run). Routes checked: `/compgeo/monotone-partition`, `/compgeo/monotone-triangulation`, `/compgeo/delaunay` (comparison), `/analysis/sequence`, `/bspline/deboor`.
- Checkout: worktree `stream-controls`, HEAD `8442fd6f`, working tree clean for application code (untracked `docs/reviews/feature-streams/controls/` only).
- Browser: Playwright Chromium (headless) from the worktree `node_modules/playwright`, run through local Node scripts kept outside the repository. Viewport 1440 x 900, locale sl-SI, `reducedMotion: reduce`. Document language `sl`.
- Page errors (`pageerror`) during the runs: none on any route.
- Scripts and raw JSON are in `%LOCALAPPDATA%\Temp\item8-scratch\` (outside the repository).
- Limit: DOM observation only. Live-region text was read from the DOM; this does not show what a screen reader would announce.

## Question 1: step counter at start and after one Next

| Route | Initial counter | After one Next |
|---|---|---|
| monotone-partition | `Korak 0 od 14` | `Korak 1 od 14` |
| monotone-triangulation | `Korak 0 od 43` | `Korak 1 od 43` |
| delaunay (comparison) | `Korak 1 od 5` | `Korak 2 od 5` |

The monotone routes start at 0; delaunay starts at 1. Confirmed by observation.

## Question 2: live regions during Play

Sampling was every ~250 ms for 3 s after pressing Play (`Predvajaj` changed to `Premor`).

### sequence (has Play; no step counter)

- Play advanced the graph: the visible text changed from `prikazani členi: 1, v pasu: 0` / `Zadnji prikazani člen (n = 1)` to `prikazani členi: 6, v pasu: 0` / `Zadnji prikazani člen (n = 6)` at 3 s.
- Live regions (2 non-off status elements with text, plus one empty) did not change during play:
  - `Izberi širino pasu ε in prag N ter napovej, ali od člena N naprej vsi členi zapo...` (static)
  - `Certifikat je skrit. Izberi N in napovej, ali za vsak n ≥ N velja |aₙ − L| < ε; ...` (static, same at 3 s and after Pause)
- Result: no live-region text change while playing.

### bspline-deboor (has Play)

- Play advanced the graph: `Prikazane ravni: 0 od 2` changed to `Prikazane ravni: 2 od 2` at 3 s.
- Sample (ms: live text of the readout status):
  - 256: `Prikazane ravni: 0 od 2`
  - 1041: `Prikazane ravni: 1 od 2`
  - 1848: `Prikazane ravni: 2 od 2` (button shows `Predvajaj`, text `Ni več korakov.`)
  - 3159: `Prikazane ravni: 2 od 2`
- After Pause the readout showed `Prikazane ravni: 0 od 2` again.
- Result: live-region text changes during play (one announcement per level).

### monotone-partition (silent route expected; has Play)

- Play advanced the graph: step counter went `Korak 0 od 14` → `Korak 5 od 14` by 3 s.
- Live status elements with text before Play (`Korak 0 od 14. Večkotnik in pometalna premica...`, `Korak 0 od 14...`) were empty from the first sample (260 ms) to 3 s.
- The static element `Večkotnik je enostaven.` and the first `Pritiskaj Naslednji korak...` element stayed unchanged.
- After Pause the emptied status returned: `Korak 5 od 14. Obdelamo oglišče v5 (zlivno).`
- Result: the step-announcement live region was cleared during Play (no step text), and refilled on Pause. The DOM changed, but no step text was announced during play.

### monotone-triangulation (has Play)

- Same pattern as monotone-partition: the status with `Korak 0 od 43. Faza: razdelitev...` was empty from 255 ms through the samples; counter advanced `Korak 0` → `Korak 6 od 43` by 3 s.

### delaunay (comparison, has Play)

- Status texts (`Korak 1 od 5. Začetna triangulacija...`) were empty during play samples (258 ms to 2.9 s); the end-of-play text `Korak 5 od 5. Vsi robovi so ustrezni...` appeared at the end (2.6 s, `Ni več korakov.`).
- Result: the same clear-during-play pattern as monotone, with the text restored at the end.

## Observed gaps

- Not observed: how a real screen reader would speak these regions.
- Not checked: the other two blank/empty regions in each route beyond the text listed; keyboard-only Play; other viewport sizes.
- Monotone and delaunay did not show per-step announcements during play in this run; that matches the empty live status, but it was not confirmed with a screen reader.
