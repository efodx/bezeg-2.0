# Smoke H2 record (graphs typography, epicycles outlines, envelope colours)

Target http://127.0.0.1:4333/bezeg-2.0/ (production preview, build 53ad11b6; checkout HEAD 8ba93334). Chromium via Playwright, one browser at a time. Artefacts in `.command-logs/h2-smoke/`.

## 1. Typography (desktop 1440x900 and 390x844)
Plain text = `#jgbox .JXGtext` / svg `text` whose family is not MathJax (`MJXZERO, MJXTEX`, axis ticks and p-labels). Literata stack seen: `Literata, Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif`. `document.fonts.check('16px Literata')` true on all 22 loads. Console errors: none on any load. Same values at both viewports.

| route | plain texts | family | samples |
|---|---|---|---|
| bezier/decasteljau | 0 | (only MathJax labels, 15 mjx) | |
| rational/base | 0 | (only MathJax labels) | |
| ph/cubic | 1 | Literata | "Dolzina loka: 10,333" |
| curve-geometry/envelope | 2 | Literata | "Stevilo premic: 16.", "t = 0,5." |
| functions/derivative | 1 | Literata | "f(x) = x2 naklon seka" |
| analysis/epicycles | 0 | (only MathJax tick labels) | |
| probability/correlation | 3 | Literata | "regresijska premica za y" x2, scatter caption |
| inscribed-angle | 6 | Literata | angle readout, P1, P2 |
| compgeo/delaunay | 5 | Literata | P1, P2, P3 |
| projective/three-views | 9 | Literata | "Izvirna ravnina", "Slika: elipsa", "L: y = 2" |
| patches/tensor | 3 | **Arial, Helvetica, Geneva, sans-serif** | "az = 0.00", "el = 0.00", "bank = 0.00" (3D view angle readouts; also use a decimal point in the Slovenian UI) |

Layout: no text outside the board box by bounding-box test except correlation at 390 (label "regresijska premica za y" measured wider than the board). In the 390 screenshot that label is large, sits across the y axis tick "3" and the regression line. Desktop screenshots of envelope and three-views viewed: no overlap or clipping; three-views labels sit inside their boxes. Other 390 screenshots were not opened (bbox test only).

## 2. Epicycles outlines
Options: Krozica, Romb, Neenakomerna krivulja, Obris Slovenije, Macka, Bezgov cvet (en: Circle, Diamond, Uneven curve, Outline of Slovenia, Cat, Elderflower blossom). Each outline draws a green outline, blue N=5 approximation, grey circles and red chain; no dashed polygon, vertices or handles visible. Legend for outlines: "Veriga ..., Vrteci se krogi, Sled delne vsote, Prvotna sklenjena krivulja" only. Inspector note: "Obris je dolocen vnaprej in ga ni mogoce urejati; spremenis lahko stevilo krogov N." Switching back to index 0 restores legend entries "Kontrolni poligon kubicnih lokov", "Krajisca: krogci", "Kontrolne tocke: kvadrati" and the editing hint. Slovenia outline is rough-edged but recognisable; cat and blossom recognisable.
English: Outline of Slovenia screenshot `epicycles-slovenia-en.png` (the brief asked for one outline; the file is not named cat).

## 3. Inspector (element screenshot)
`.workspace-inspector` width 310 px, clientWidth 308 = scrollWidth 308, no child extends beyond the right edge. Screenshot covers the first ~730 px (page height cuts the element capture at the outline note). No clipped or badly wrapped controls seen in sl or en.

## 4. Preset round trip
Cat selected, N set to 8, saved as `smoke-h2-cat` (Shrani tab), exported: `preset-export-cat.json` (browser filename `presets.txt`; graphState has `outline: "cat"`, `N: 8`, `parametrization: "equal"`). Fresh context: Uvozi prednastavitve -> `#preset-import-file` -> confirm; `smoke-h2-cat` listed; opening it gives Example=Macka, N=8. Passed.

## 5. Export
`envelope-export.svg`: 17 `<text>`; 2 plain texts carry Literata stack; 15 tick/p-label texts use `MJXZERO, MJXTEX`. `envelope-export.png` (998x595) renders text in a serif matching the page; observed a stray space in "Stevilo premic: 16 ." (page shows "16.").

## 6. Envelope colours
Line family strokes run `#6175ad` (blue) through `#6b8a90` to `#6f9285` (teal-green) at 1px; curve `#587445` 2px green; current line stroke `#bf8542` 4px amber; touching point and p-points amber fill (`#bd8040`/`#bf8542`). Screenshot `envelope-desktop.png`.
