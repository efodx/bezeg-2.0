# Blocker triage of the catalog captures (batch T, G02 G03 G04 G06)

Read-only assessment, 2026-11-14. Spec: [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md) (capture-text policy, per-capture table, G06, batches). No recipe was changed and nothing was recaptured.

**Method.** For each of the 118 manifest ids a fresh Chromium context opened the route on the production preview (port 4333), ran the recipe's own actions (`applyRecipe`), waited for MathJax, then listed every JSXGraph `text` and `smartlabel` object that is not an axis tick or a point name (scratch script `.command-logs/h2-triage/scrape.cjs`; `presentBoard` was then run to see today's length rule). `0,0` is the origin tick label and is left out; objects repeated in a pool (for example the unused `x = 0`, `(0; 0)`, `×1` copies of `rational-function`) are listed once, and a pooled object is not always visible in the poster, so the cell is what the board holds, not what the 720×440 frame shows. A multi-line object is written `[line / line]`. Not read: the 7 surface captures (`patch-*`, spec/poster only) and `voronoi-degenerate`, `epicycles` (recipe action fails on the 4333 build, see blockers). Motion data comes from the manifest and `scripts/demonstration-clip-rows/`; clip checks were searched for board-text reads in `demonstration-preview-motion.cjs`, `-analysis-`, `-curve-`, `-concept-motion.cjs` and `demonstration-clip-rows/_driver.cjs`.

**What the policy does to a clip check.** The row pixel check masks board text (`_driver.cjs:35`), so hiding text cannot break it. `applyCaptureText` only sets `display:none` on non-kept lines (`capture-demonstration-previews.cjs:234-236`), which keeps `textContent`; only a `strip` rewrites it (`:227-229`). Strip is therefore unsafe on a line a check reads, and safe on plain single-line text (no child elements). MathJax text and smartlabels cannot be stripped.

**Frame loses** uses: nothing; a value the motion shows (display only, no check reads it); only distinguisher.


### P pilot, done (3)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `prob-correlation` | DONE. Keep in part | `regresijska premica za y` ; `regresijska premica za x` ; `[Razsevni diagram, točk: 4 / Korelacijski koeficient r = 0,8468]` | nothing (words, or carried by shape) | row: parameter-sweep (number: Točka 4, y) | none |
| `curve-envelope` | DONE. Remove | `Število premic: 16.` ; `t = 0,5.` ; `` | a value the motion shows (display only) | row: parameter-sweep (slider: Parameter t) | none |
| `interp-subdivision` | DONE. Remove | `Chaikinovo pravilo, korak 1 od 6, 8 oglišč` | nothing (words, or carried by shape) | row: pointer-drag (point) | none |

### C5, done (1)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `convexity` | DONE. Remove | `` ; `[f(x) = x² / a = −1, b = 1,5, t = 0,5 / sklep: skrit / polna črta: tetiva; črtkana črta: tangenta]` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Točka dotika tangente t) | same code (capture-demonstration-previews.cjs:508-516); done, now a row clip (C5) |

### B1 (4)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `prob-density` | Keep in part: keep `^X ∼ N\(` | `[X ∼ N(0; 1²) / Ploščina pod gostoto med a in b: 68,27 % / ]` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Povprečje μ) | none |
| `prob-binomial-normal` | Keep in part: keep `^X ∼ B\(` | `[X ∼ B(20; 0,5) / Povprečje 10, σ = 2,24 / P(X ≤ 8) = 0,25172]` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Verjetnost uspeha p) | none |
| `prob-clt` | Remove | `[Standardizirana vsota n = 3 neodvisnih kopij / Kolmogorova razdalja K_n = 0,02492 (le za to obliko in ta n)]` | a value the motion shows (display only) | row: parameter-sweep (slider: Višina 1 (pri x = 0)) | none |
| `prob-summary` | Remove | `sredina` ; `mediana` ; `Število vrednosti: 7` | only distinguisher (mean vs median markers) | row: parameter-sweep (number: Vrednost 7) | none |

### B2 (4)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `interp-lagrange` | Remove | `Lagrange: t = 1,5 (na [0, 3]), uteži −0,0625; 0,5625; 0,5625; −0,0625, točka (2, 2,8125)
Bézier: t = 0,5 (na [0, 1]), uteži 0,125; 0,375; 0,375; 0,…` | a value the motion shows (display only) | row: pointer-drag (point) | none |
| `interp-hermite` | Remove | `Catmull-Romov zlepek, napetost 1` | a value the motion shows (display only) | row: parameter-sweep (number: Točka 2, y) | none |
| `interp-runge` | Remove | `[Interpolacija, stopnja n = 10, Enakomerno razporejene točke / f: Rungejeva funkcija 1/(1 + 25x²) / Največja napaka na mreži: 1,916 pri x = 0,9402 …` | a value the motion shows (display only) | row: discrete-exact-steps (stepper: Povečaj stopnjo n za 1) | none |
| `interp-least-squares` | Remove | `[Prileganje: polinom stopnje 1 / y = 0,9x + 0,9 / Vsota kvadratov ostankov: 0,7 /  /  / Pike so podatki, navpične črte so ostanki, ploščina kvadrat…` | a value the motion shows (display only) | row: parameter-sweep (number: Točka 4, y) | none |

### B3 (5)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `bezier` | No text | none | nothing | legacy: pointer-drag; drag, already continuous | none |
| `affine` | No text | none | nothing | legacy: supported-rotation-steps; rotation steps, control not examined | none |
| `repeated-subdivision` | No text | none | nothing | legacy: discrete-exact-steps; button Subdiviziraj: round count, discrete | none |
| `extrapolation` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `reduction` | Remove | `Točno nižljiva (toleranca 10⁻⁹)` ; `Največja napaka (vzorčena): 0.` | nothing (words, or carried by shape) | row: pointer-drag (point) | none |

### B4 (6)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `ph-cubic` | Remove (the piece names L1 to L3 are MathJax: add keep `^L\d$` or lose them) | `Dolžina loka: 10,333` ; `L1` ; `L2` ; `L3` | a value the motion shows (display only) | legacy: parameter-sweep; sweep, already continuous | none |
| `ph-quintic` | Remove | `Dolžina loka: 9,233` | a value the motion shows (display only) | legacy: parameter-sweep; sweep, already continuous | none |
| `spline-parameterization` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `weighted-parameterization` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `uniform-parameterization` | Remove | `Dolžina loka: 16,717` | a value the motion shows (display only) | legacy: discrete-exact-steps; select Izberi parametrizacijo: categorical, discrete | none |
| `arc-length-param` | Remove | `t = 0, s(t) = 0` ; `L = 6,390976` ; `` | a value the motion shows (display only) | row: parameter-sweep (slider: Lega točke) | none |

### B5 (5)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `curve-parametric` | Remove | `Hitrost r′ = (1, 1), velikost 1,4142
Dolžina loka: 8
Ploščina: 9,4248` | a value the motion shows (display only) | row: parameter-sweep (slider: Polmer kotalečega se kroga) | none |
| `curve-curvature` | Keep in part: keep `^[TN]$` | `T` ; `N` ; `Ukrivljenost κ = 2Krivinski polmer R = 0,5Smerni kot tangente φ = 0°` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Parameter t) | none |
| `curve-comb` | Remove | `Stik 1: ukrivljenost κ levo 1,3333, desno 0,6667, skok −0,6667` | a value the motion shows (display only) | row: parameter-sweep (slider: Ojačitev glavnika) | none |
| `curve-evolute` | Keep in part: keep `^[TNE]$` | `T` ; `N` ; `Ukrivljenost κ = 0,5247Krivinski polmer R = 1,9057Smerni kot tangente φ = 50,1944°Točka evolute E = (−0,864, 1,58)` ; `E` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Parameter t) | none |
| `curve-offset` | Remove | `Razdalja d = −1.` ; `Osti vzporednice: 2.` ; `Črtkana vzporednica je vzorčena, zato približna.` ; `` | a value the motion shows (display only) | row: parameter-sweep (slider: Razdalja d) | none |

### B6 (2)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `projective-three-views` | Remove | `Izvirna ravnina` ; `Slika: elipsa` ; `` ; `L: y = 2` | only distinguisher (which panel is the original, which the image) | row: parameter-sweep (slider: Višina premice L (c, v desetinkah)) | none |
| `conic-focal` | Remove | `[\|PF\| = ε·\|Pd\| / ε = 0,8, ℓ = 1,8: elipsa / \|PF\| = 5, \|Pd\| = 6,25, razmerje 0,8 / \|PF\| + \|PF₂\| = 10]` | a value the motion shows (display only) | row: parameter-sweep (slider: Numerična ekscentričnost ε) | none |

### B7 (3)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `rational-extrapolation` | Remove | `[smartlabel] w0=1.00` ; `[smartlabel] w1=2.00` ; `[smartlabel] w2=1.00` ; `[smartlabel] w3=1.00` | nothing (words, or carried by shape) | legacy: parameter-sweep; sweep, already continuous | weights are smartlabels (MathJax); the policy filter is elType text only (capture-demonstration-previews.cjs:290), so Remove cannot reach them |
| `rational-subdivision` | Remove | `[smartlabel] w0=1.00` ; `[smartlabel] w1=2.00` ; `[smartlabel] w2=1.00` ; `[smartlabel] w3=1.00` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; button Subdiviziraj + toggles: count, discrete | clip check demands a VISIBLE weight label: demonstration-preview-curve-motion.cjs:129 (weightLabels, filtered by display at :169-171, dependency noted at :327); smartlabels are also outside the policy (capture-demonstration-previews.cjs:290) |
| `farin` | Remove | `0.67` ; `0.33` ; `0.50` ; `[smartlabel] w0=1.00` ; `[smartlabel] w1=2.00` ; `[smartlabel] w2=1.00` ; `[smartlabel] w3=1.00` | a value the motion shows (display only) | legacy: pointer-drag; drag, already continuous | weights are smartlabels outside the policy filter (capture-demonstration-previews.cjs:290); the clip check reads weights from plaintext (demonstration-preview-motion.cjs:709-711,759), so hiding them is safe |

### B8 (38)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `complex-reciprocal` | Keep in part: keep `^(?:Re\|Im)$` | `Re` ; `Im` ; `[z = 0,5 + 0,5i, w = 2 + i / z̄ = 0,5 − 0,5i / 1/z = 1 − i / krog: z; kvadrat: w; plus: z̄; romb: 1/z; trikotnik: w/z; križec: z']` | nothing (words, or carried by shape) | row: parameter-sweep (number: Re z) | none |
| `complex-roots` | Keep in part: keep `^(?:Re\|Im)$` | `Re` ; `Im` ; `[w = 2i, n = 3 / z₀ = 1,0911 + 0,63i / z₁ = −1,0911 + 0,63i / z₂ = −1,2599i / kvadrat: w; krog: koren z_k; romb: preizkusna točka z]` | nothing (words, or carried by shape) | row: parameter-sweep (number: Re w) | none |
| `triangle-centres` | Remove | `Vrsta trikotnika: ostrokotni` | nothing (words, or carried by shape) | row: pointer-drag (point) | none |
| `inscribed-angle` | Keep in part: keep `°`; strip `∠[A-Z]{3} = ` , `središčni kot = ` | `∠APB = 66,8°; ∠ACB = 66,8°; središčni kot = 133,6°` | nothing (words, or carried by shape) | row: parameter-sweep (number: Lega točke P (t, stopinje)) | none |
| `euler-line` | Remove | `Eulerjeva premica: O, G in H so kolinearne` | nothing (words, or carried by shape) | row: pointer-drag (point) | none |
| `simson-line` | Remove | `Nožišča D, E, F: kolinearna` | nothing (words, or carried by shape) | row: parameter-sweep (number: Lega točke P (t, stopinje)) | none |
| `inversion` | Remove | `Krožnica mimo središča C → krožnica` | nothing (words, or carried by shape) | row: discrete-exact-steps (number-field: Polmer inverzije r) | none |
| `orientation` | Keep in part: keep `^[+−]\d+`; strip `: levi zavoj$` | `+8: levi zavoj` | nothing (words, or carried by shape) | row: pointer-drag (point) | none |
| `delaunay` | Remove | `neustrezen rob` | nothing (words, or carried by shape) | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `monotone-partition` | Keep in part: keep `^v\d+`; strip `(?<=^v\d+)\s.*$` | `v6 začetno` ; `v4 začetno` ; `v5 zlivno` ; `v2 razcepno` | nothing (words, or carried by shape) | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `monotone-triangulation` | Keep in part: keep `^v\d+`; strip `(?<=^v\d+)\s.*$` | `v4 zgornje oglišče` ; `v5 leva veriga` ; `v2 leva veriga` ; `v3 spodnje oglišče` | nothing (words, or carried by shape) | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `projective-cross-ratio` | Keep in part: keep `\(A′?, B′?; C′?, D′?\) = `; strip `^Dvorazmerje (?:izvirnih točk\|slik) ` , `, decimalno \S+$` | `` ; `Dvorazmerje izvirnih točk (A, B; C, D) = 9/8, decimalno 1,125` ; `Dvorazmerje slik (A′, B′; C′, D′) = 9/8, decimalno 1,125` | nothing (words, or carried by shape) | row: parameter-sweep (number: Točka O: x) | none |
| `bisection` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² − 2 / korak 1, širina 0,5]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; button Naslednji korak (steps 1-4): step count, stays discrete | none |
| `root-finding` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² − 2 / korak 1, napaka 0,085786437627]` | nothing (words, or carried by shape) | row: discrete-exact-steps (trace-step: Naslednji korak) | none if hidden only: the driver reads "korak N, napaka E" from the page DOM (demonstration-clip-rows/_driver.cjs:221,233-236); a strip on that line would break the row |
| `quadrature` | Remove | `[f(x) = sin x / n = 2, približek 1,5708, napaka 0,4292 / napaka(n/2) / napaka(n) = 4,66]` | a value the motion shows (display only) | row: parameter-sweep (number: Spodnja meja a) | none |
| `euler-method` | Remove | `[y' = y / h = 0,5, y(1) ≈ 2,25, napaka 0,4683 / napaka(2h) / napaka(h) = 1,53]` | a value the motion shows (display only) | row: parameter-sweep (number: Začetni y₀) | none |
| `mean-value` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² / naklon sekante 2, tangente 1]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; number Točka dotika c: CONTINUOUS, sweep candidate (drops the staged reveal button "Pokaži ujemajočo točko") | none |
| `accumulation` | Keep in part: keep `^\+$` | `+` ; `[f(x) = sin x / f: polna črta / A: črtkana črta / A(x) = 1,4161 (s predznakom) / naklon tangente na A v točki x: 0,9093]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; number Točka x: CONTINUOUS, sweep candidate (concept override, concept-motion.cjs:127) | none |
| `darboux` | Remove | `[f(x) = x² / n = 4, integral = 2,6667 / L = 1,75, U = 3,75 / poln: spodnja vsota L; črtkan: zgornja vsota U]` | a value the motion shows (display only) | legacy: discrete-exact-steps; button n→2n: count, discrete (no control lowers n) | none |
| `extrema` | Keep in part: keep `^[−+]$` , `^f\(−?\d+\) = −?\d+$` | `−` ; `+` ; `` ; `[f(−1) = 1 / krajišče / lokalni maksimum]` ; `[f(2) = 4 / krajišče / lokalni maksimum, globalni maksimum]` ; `[f(0) = 0 / f′ = 0 / lokalni minimum, globalni minimum]` ; `[f(x) = x² / a = −1, b = 2 / globalni min 0 pri x = 0; globalni maks 4 pri x = 2 / kvadrat: krajišče; romb: stacionarna točka; trikotnik: ostri vog…` | nothing for the clip; the poster loses its Slovenian conclusion sentence (deliberate today) | legacy: parameter-sweep; sweep, already continuous | capture-demonstration-previews.cjs:508-516 forces the Slovenian conclusion row visible and moves it, :568 collects it, :749 asserts it is visible; the policy hides that row, so the assertion fails |
| `taylor` | Remove | `konvergenčni interval: 0 < x < 0` ; `[f(x) = eˣ / c = 0, n = 2, x = 1 / Tₙ(x) = 2,5, f(x) = 2,7183 / napaka \|f(x) − Tₙ(x)\| = 0,2183 / ocena napake: skrita / polna črta: f; črtkana črta…` | a value the motion shows (display only) | legacy: discrete-exact-steps; number Stopnja n: integer degree, discrete | none |
| `sequence` | Keep in part: keep `^N = \d+$` | `N = 5` ; `[aₙ = 1/n / ε = 0,3, L = 0, N = 5 / prikazani členi: 16, v pasu: 13 / certifikat: N deluje / krogec: člen v pasu; križec: člen izven pasu]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; ε continuous + N integer: ε sweep candidate, N step discrete | none |
| `uniform-convergence` | Remove | `[fₙ(x) = xⁿ na [0; 0,8] / n = 5, x = 0,5, ε = 0,1 / pri x: napaka 0,03125, N(x) = 4 / sup \|fₙ − f\| = 0,32768, dosežen pri x = 0,8 / skupni N = 11 /…` | a value the motion shows (display only) | legacy: discrete-exact-steps; number Indeks n: integer index, discrete | none |
| `fourier-series` | Remove | `[Fourierova vrsta: f(x) = sgn x, x ∈ (−π, π) / N = 11, x = 0,5, ε = 0,1 / Sₙ(x) = 0,90241, f(x) = 1, napaka 0,097589 / Vrh: x = 0,2618, Sₙ = 1,1813…` | a value the motion shows (display only) | row: parameter-sweep (number: Točka x) | none |
| `fourier-coefficients` | Remove | `[Produkt f · cos x / a₁ = −1,27324 / Integral kvadrata 6,57974; Parsevalova vsota 6,57967 / polna črta: f; pikčasta: harmonik; črtkana: S_K; osenče…` | a value the motion shows (display only) | row: parameter-sweep (number: Vrednost f pri x = 0) | none |
| `fixed-point` | Keep in part: keep `^x1$` | `x1` ; `[T(x) = (x + 1) / 2 / korak k = 1, xₖ = 0,5 / ocena napake: skrita / krogec: približek; križec: negibna točka]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; button Naslednji korak: iterate count, discrete | none |
| `function-inverse` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² (x ≥ 0), f⁻¹(x) = √x / P = (2; 4) → P′ = (4; 2) / naklon v P: 4; naklon v P′: 0,25]` | today the whole caption is hidden (over 65 characters); the policy ADDS the formula line | row: parameter-sweep (number: Točka P: abscisa x₀) | none |
| `polynomial-zeros` | Keep in part: keep `^×[2-9]$` , `^p\(x\) = ` | `×1` ; `×2` ; `[p(x) = (x + 2)(x − 1)² / stopnja 3]` | nothing (words, or carried by shape) | row: parameter-sweep (number: Ničla 1: položaj x) | none |
| `rational-function` | Keep in part: keep `^f\(x\) = ` , `^[xy] = ` | `x = 2` ; `x = 0` ; `y = x + 2` ; `r(x)/q(x) = 0,375` ; `(0; 0)` ; `×1` ; `[f(x) = (x + 1)(x − 1) / (x − 2) / stopnja števca 2, imenovalca 1]` | nothing (words, or carried by shape) | row: parameter-sweep (number: Števec: Ničla 2: položaj x) | none |
| `geometric-series` | Remove | `[Sₙ = a(1 − qⁿ)/(1 − q) / a = 1, q = 0,5, n = 1 / delna vsota Sₙ = 1 / limita a/(1 − q) = 2 / napaka \|L − Sₙ\| = 1 / levi stolpec: člen; desni stolp…` | a value the motion shows (display only) | row: parameter-sweep (slider: Količnik q) | none |
| `continuity` | Remove | `[skok 1 pri x = 1 / limita z leve 1, z desne 2]` | a value the motion shows (display only) | legacy: parameter-sweep; sweep, already continuous | none |
| `derivative` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² / naklon sekante 3, f′(x₀) = 2]` | nothing (words, or carried by shape) | legacy: parameter-sweep; sweep, already continuous | none |
| `definite-integral` | Keep in part: keep `^f\(x\) = ` | `[f(x) = x² / vsota 2,037, integral 2,6667]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; range Število podintervalov n: integer count, discrete | none |
| `area-between-curves` | Keep in part: keep `^[fg]$` | `f` ; `g` ; `[∫(g − f) dx = 4,8975 / ploščina = 4,8975 / f(x) = (x − 2)² / g(x) = 3 − (x − 2)²]` | nothing (words, or carried by shape) | legacy: parameter-sweep; sweep, already continuous | none |
| `arc-length` | Keep in part: keep `^f\(x\) = ` | `[f(x) = sin x / lomljenka 3,7242, lok 3,8202]` | nothing (words, or carried by shape) | legacy: discrete-exact-steps; range Število daljic n: integer count, discrete | none |
| `bspline-basis` | Keep in part: keep `^\d(?: \(×3\))?$` | `0 (×3)` ; `1` ; `2 (×3)` ; `t = 0,5: neničelne bazne funkcije stopnje 2N0,2 = 0,25   N1,2 = 0,625   N2,2 = 0,125vsota = 1` ; `definicijsko območje [0, 2]` | nothing (words, or carried by shape) | row: parameter-sweep (slider: Parameter t) | none |
| `bspline-deboor` | Remove | `t = 0,5, vozelni razpon [u2, u3) = [0, 1)raven 0: P0 = (0; 0)   P1 = (1; 2)   P2 = (3; 2)raven 1: P11 = (0,5; 1)   P21 = (1,5; 2)razmerja α11 = 0,5…` | a value the motion shows (display only) | row: parameter-sweep (slider: Parameter t) | none |
| `complex-multiplication` | Keep in part: keep `^(?:Re\|Im)$` | `Re` ; `Im` ; `[z = 1 + i, w = i / zw = −1 + i / arg: π/4 + π/2 = 3π/4 / krog: z; kvadrat: w; romb: zw]` | nothing (words, or carried by shape) | legacy: pointer-drag; drag, already continuous | none if hidden only: the legacy check reads board textContent (demonstration-preview-motion.cjs:1072,1119), which display:none keeps; a strip would break it |

### B9 (1)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `epicycles` | No text | NOT READ: Unsupported or ambiguous button control: Povečaj N za 1 | nothing | row: parameter-sweep (slider: Čas t (del obhoda)) | recipe action fails on the 4333 build: no button "Povečaj N za 1" (demonstration-preview-recipes.cjs:121; G07 changed the controls), so no recapture until the recipe is updated |

### No batch (verdict No text or Keep: nothing to apply) (46)

| id | text verdict and patterns | board text today (recipe scene) | frame loses | motion path | blocker |
| --- | --- | --- | --- | --- | --- |
| `linear-map` | Keep (reclassify: keep `^a₁ = `, `^[τδ]$`, `^Δ = 0$`; hide the two phrases) | `trikotnik stabilnosti` ; `stabilen tok: τ < 0, δ > 0` ; `Δ = 0` ; `τ` ; `δ` ; `a₁ = (2, 1),  a₂ = (−1, 1)` | nothing | row: parameter-sweep (number: a₁: x) | spec verdict Keep is wrong: the scene also has Slovenian "trikotnik stabilnosti" and "stabilen tok: τ < 0, δ > 0" (scene text, same list); needs Keep in part; not blocking |
| `polygon-area` | Keep | `+12` ; `+18` | nothing | row: pointer-drag (point) | none |
| `convex-hull` | No text | none | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `point-in-polygon` | Keep | `1` | nothing | row: discrete-exact-steps (number-field: Točka q, y) | none |
| `hull-robustness` | No text | none | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `bezier-hulls` | No text | none | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `ear-clipping` | No text | none | nothing | no clip in the manifest | none |
| `point-set-triangulation` | No text | none | nothing | row: pointer-drag (point) | none |
| `voronoi` | Keep | `↓` ; `←` ; `→` ; `↑` | nothing | row: pointer-drag (point) | none |
| `voronoi-degenerate` | Keep | NOT READ: Unsupported or ambiguous button control: Trapez | nothing | row: pointer-drag (point) | recipe action fails on the 4333 build: no button "Trapez" (demonstration-preview-recipes.cjs:170); board text not read, verdict by spec only |
| `interval-sweep` | Keep | `a` ; `b` ; `c` ; `d` ; `e` | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `segment-intersections` | Keep | `s1` ; `s2` ; `s3` ; `s4` | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `fortune` | No text | none | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `projective-pascal` | Keep | none | nothing | no clip in the manifest | none; the scene shows no board text and the manifest has no clip for it, so the spec verdict Keep should be No text |
| `projective-pole-polar` | Keep | `P = ∞` | nothing | row: parameter-sweep (number: Točka P: y) | none |
| `projective-five-point` | Keep | `w² = 1/2, w ≈ 0,7071` | nothing | row: parameter-sweep (number: Točka E: x) | none |
| `linear-function` | Keep | ` Δx = 2 ` ; ` Δy = 4 ` ; `y = 2x + 1` | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `exponential-function` | Keep | `f(x) = 2^x` | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `trigonometric-functions` | Keep | `f(x) = sin(x)` | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `function-transformation` | Keep | `[y = −2 f(0,5(x − 3)) + 1 / (u, f(u)) = (2; 4) → (7; −7)]` | nothing | row: parameter-sweep (number: Vodoravni premik c) | none |
| `patch-tensor` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-decasteljau` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-derivatives` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-subdivision` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-joins` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-triangular` | Keep | surface view, not scraped (spec/poster only) | nothing | legacy: surface-orbit; sweep, already continuous | none |
| `patch-coons` | No text | surface view, not scraped (spec/poster only) | nothing | row: pointer-drag (surface-point) | none |
| `bspline-insertion` | No text | none | nothing | row: discrete-exact-steps (button-count: Vstavi vozel) | none |
| `bspline-extraction` | No text | none | nothing | row: parameter-sweep (number: Vozel u3) | none |
| `bspline-nurbs` | No text | none | nothing | row: parameter-sweep (number: Utež 3) | none |
| `bspline-blossom` | Keep | `f(0; 0,5)` | nothing | row: parameter-sweep (slider: Argument b) | none |
| `bernstein` | Keep | `B03(t)` ; `B13(t)` ; `B23(t)` ; `B33(t)` | nothing | legacy: discrete-exact-steps; button Povečaj število: degree count, discrete | none |
| `decasteljau` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `decasteljau-alternative` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `subdivision` | No text | none | nothing | legacy: discrete-exact-steps; button Subdiviziraj: exact count, discrete | none |
| `elevation` | No text | none | nothing | legacy: exact-degree-elevation; degree-elevation count, discrete | none |
| `bezier-clipping` | No text | none | nothing | row: discrete-exact-steps (trace-step: Naslednji korak) | none |
| `rational` | Keep | `[smartlabel] w0=1.00` ; `[smartlabel] w1=2.00` ; `[smartlabel] w2=1.00` ; `[smartlabel] w3=1.00` | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `rational-decasteljau` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `rational-elevation` | Keep | `[smartlabel] w0=1.00` ; `[smartlabel] w1=2.00` ; `[smartlabel] w2=1.00` ; `[smartlabel] w3=1.00` | nothing | legacy: exact-degree-elevation; degree-elevation count, discrete | none |
| `circle` | No text | none | nothing | legacy: discrete-exact-steps; button Povečaj število: count, discrete | none |
| `spline-cn` | No text | none | nothing | legacy: discrete-exact-steps; button Zmanjšaj število (Stopnja zveznosti): count, discrete | none |
| `spline-c1` | No text | none | nothing | legacy: pointer-drag; drag, already continuous | none |
| `spline-c2` | No text | none | nothing | legacy: pointer-drag; drag, already continuous | none |
| `spline-g1` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |
| `spline-g1-symmetric` | No text | none | nothing | legacy: parameter-sweep; sweep, already continuous | none |

## Summary

**Verdicts** (spec table, confirmed to total 118): No text 29, Keep 24, Remove 37, Keep in part 28. Of these, 3 pilot ids and `convexity` are done.

**Blockers per class** (ids):

| Class | Count | Ids |
| --- | --- | --- |
| none | 107 | all others |
| per-id override in `presentBoard` contradicts the policy | 2 | `extrema` (:508-516, :568, :749); `convexity` (same code, done) |
| smartlabel weights outside the C1 filter (`capture-demonstration-previews.cjs:290`, `elType === 'text'` only) | 3 | `rational-extrapolation`, `farin`, `rational-subdivision` |
| clip check requires a visible text | 1 | `rational-subdivision` (`demonstration-preview-curve-motion.cjs:129,169-171`) |
| hide-only constraint (a `strip` would break the check; hiding is safe) | 2 | `complex-multiplication`, `root-finding` |
| recipe action fails on the 4333 build | 2 | `epicycles`, `voronoi-degenerate` |
| spec verdict wrong for the scene | 2 | `linear-map` (Keep, but the scene has Slovenian phrases), `projective-pascal` (Keep, but no board text) |

**Ids sharing one blocker (fix the capability before the batch).**

1. Smartlabels outside C1: `rational-extrapolation`, `farin`, `rational-subdivision`. C1's text filter must also take `smartlabel` objects (or a CSS hide of `.smart-label-point2`, which the typography rule at `:302` already addresses), before B7.
2. `presentBoard` per-id override for `extrema` (and `convexity`): drop the conclusion row relocation and the assertion at `:749` in the same commit that applies the policy to `extrema` (B8).
3. `rational-subdivision`: change the check at `curve-motion.cjs:129` to read the model (`declaredWeightLabels`) instead of the visible labels before B7 hides weights.
4. Epicycles and `voronoi-degenerate` recipes need an update against the current controls before any recapture (B9 for epicycles).

**G06, remaining legacy held-state clips (17 `discrete-exact-steps`, plus affine and the two elevation clips).** Continuous control, candidates for a smooth sweep: `mean-value` (Točka dotika c; the staged reveal button would be dropped, as for `convexity`), `accumulation` (Točka x), and `sequence` (ε sweep, N stays discrete). Count or step, stay discrete: `bisection`, `fixed-point` (Naslednji korak), `darboux` (n→2n), `taylor`, `uniform-convergence`, `definite-integral`, `arc-length` (integer n), `bernstein`, `circle` (Povečaj število), `subdivision`, `repeated-subdivision`, `rational-subdivision` (Subdiviziraj), `spline-cn` (continuity degree), `uniform-parameterization` (select). The 3 candidates are an observation about the control, not a decision on the staged reveals each clip uses.

**Proposed regrouping.**

- The spec's note "fix the overlap in the patches batch" (`patch-subdivision`, `patch-joins`) has no batch in the batch table, and surface captures do not pass `presentBoard` (`captureSurface`, `capture-demonstration-previews.cjs:150-170`) so C1 never reaches them: add **B10 Patches** (overlap fix, surface text left as is).
- Split B8 (38 ids) by files and by blocker: **B8a** functions and analysis with `extrema` last (after its override is dropped); **B8b** maps and plane geometry (`complex-*`, `linear-map`, triangle ids, `inversion`, `orientation`); **B8c** compgeo (`delaunay`, `monotone-*`); **B8d** B-splines and `projective-cross-ratio`.
- Move `rational-subdivision` after the check change above, inside B7.
- B3 lists `bezier`, `affine`, `extrapolation`, `repeated-subdivision` (all No text): their work is graph or clip, not text; no text blocker.

**Notes from the scene that the spec does not state.** `bernstein` shows MathJax labels `B03(t)` to `B33(t)` (reason says axis numbers only; they are symbols, so Keep stands). `ph-cubic` also draws `L1` to `L3` (MathJax). `function-inverse` shows no board text today (caption over 65 characters), so Keep in part adds the formula. `fixed-point` text is `x1`, not `x₁`.

**Ids not fully classified.** `voronoi-degenerate`, `epicycles` (scene not readable on the 4333 build; verdict by spec only); the 7 surface captures `patch-*` (not scraped). `affine` control kind not examined. A "frame loses" entry is judged from the readout text and the spec reason, not from the lesson quote of each row.

## Evidence

Set diff of ids (table versus `manifest.json` captures): table 118 ids, manifest 118 ids, in table not in manifest: none, in manifest not in table: none (checked on this file: 118 distinct ids, both differences empty).

Board-text lines read, five families (spot-check against the live routes):

- `/functions/derivative` (`derivative`): `f(x) = x²` / `naklon sekante 3, f′(x₀) = 2`
- `/probability/binomial-normal`: `X ∼ B(20; 0,5)` / `Povprečje 10, σ = 2,24` / `P(X ≤ 8) = 0,25172`
- `/compgeo/monotone-partition`: `v6 začetno`, `v4 začetno`, `v5 zlivno`, `v2 razcepno`
- `/bspline/basis`: `0 (×3)` (three times), `1`, `2 (×3)` (three times), `t = 0,5: neničelne bazne funkcije stopnje 2 …`, `definicijsko območje [0, 2]`
- `/rational/rational-subdivision`: smartlabels `w0=1.00`, `w1=2.00`, `w2=1.00`, `w3=1.00`
