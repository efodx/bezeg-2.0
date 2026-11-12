# Localization

Bezeg offers Slovenian and English through the shared header language selector. Slovenian is the first-visit default; an explicit browser-local preference is stored separately under `bezeg-language`. Unsupported preferences fall back to Slovenian. When preference storage is inaccessible, the selected language works for the session and a notice explains that it cannot be remembered.

## Contributor workflow

The [source spec](specs/localization.md) records the agreed behavior. `src/localization/sl.ts` defines the message keys and interpolation parameters; `en.ts` supplies the same keys. `src/localization/index.ts` owns selection, lookup, structured messages/errors, subscriptions, and export locking. `LanguageSelector.tsx` supplies the shared control.

1. Add a stable, descriptive key and Slovenian message to `sl.ts`, and the English translation to `en.ts`. Keep keys stable when revising wording. Existing extraction-generated suffixes distinguish messages that currently have different Slovenian wording.
2. Use `t('key')` for display text, or `t('key', {value0: value})` for a parameterized message. The parameter names come from the catalog and are type checked. Both catalogs must use identical placeholders. This is a known recurring TypeScript failure point: after adding or changing a key, TS2345 can report that a tuple such as `['guided_lesson_calculation']` is not assignable to `TranslationArguments` when the call shape no longer matches the Slovenian catalog. Inspect the `sl.ts` placeholders and correct the call; do not weaken the type or cast the call.
3. Functional components obtain `t` with `const t = useT()`, which subscribes them to language changes, including behind `React.memo`. Use `useLanguage()` only when a component reads `language`, `persistenceFailed`, `exporting` or `exportFailed`. Graph controllers and plain functions keep the module-level `t` and must not call hooks: `GraphHost` subscribes with `useT()` and re-renders the controller's panels on a switch, and board text that must re-translate registers `onLanguageChange`. Route titles use getters so their text is resolved when displayed rather than at module initialization.
4. Services return structured `message(...)` values or throw `LocalizedError`. Keep the error object in React state and read its message when displaying it; storing translated text would freeze its language. Nested messages allow validation details to translate while technical identifiers stay intact.
5. Keep component keys, route paths, option values, stored keys, curve DTO identifiers, mathematical symbols, and user-authored names independent of translated text. Never translate a user-written preset name.
6. Run the localization tests, applicable integration checks, `npx tsc --noEmit --pretty false`, and the production build. Treat a clean typecheck as a required checkpoint before continuing development after localization edits. `scripts/localization/inventory.cjs` is a source-inspection aid, not proof of coverage: it includes some technical strings and does not classify every one-word string.

## Switching and exports

Language-only React updates preserve mounted controls and boards. Graph update lifecycles that formerly regenerated constructions now skip updates when props and state are unchanged. Command rendering does not initialize polynomial preview points; previews are created when requested. A locale change must not advance the mathematical cache or recreate geometry solely to translate text.

Displayed numbers, including board text and axis tick labels, use a decimal comma in Slovenian and a point in English, with the same precision; a language switch redraws tick labels through a full board update, not by recreating geometry. Figure exports use the selected language; the mathematical board labels are predominantly notation and stay unchanged. Single and batch export hold an explicit language lock until completion or failure. Figure controls prevent overlapping captures. Batch capture awaits each PNG before building its ZIP; the existing preset-remount path uses a short settling delay, so scene timing and MathJax fidelity still require browser review.

The static document initially declares Slovenian, and runtime selection updates its language. The JavaScript-disabled notice includes both languages; it cannot use the runtime selector. Route paths and preset contracts are unchanged. No backend, language URL parameter, or automatic browser-language detection is introduced.

## Approved mathematical terminology

| Slovenian wording | English wording |
| --- | --- |
| Bézierjeva krivulja | Bézier curve |
| racionalna Bézierjeva krivulja | rational Bézier curve |
| Bernsteinovi polinomi | Bernstein polynomials |
| kontrolna točka | control point |
| kontrolni poligon | control polygon |
| konveksna ovojnica | convex hull |
| trk; zaznavanje trkov; kandidatni par | collision; collision detection; candidate pair (collision playground, [sources](specs/collision-playground.md#terms-settled-in-cp6-by-choosing-new-terms)) |
| pometanje in obrezovanje; groba faza; natančna faza | sweep and prune; broad phase; narrow phase |
| očrtani pravokotnik | bounding box (not *škatla*, which is the probability box) |
| subdivizija | subdivision |
| zaporedna subdivizija | repeated subdivision |
| ekstrapolacija | extrapolation |
| višanje stopnje / dvigni stopnjo | degree elevation / elevate degree |
| skrči | shorten |
| zlepek | spline |
| stopnja zveznosti | continuity order |
| parametrizacija | parametrization |
| utežena parametrizacija | weighted parametrization |
| enakomerna parametrizacija | uniform parametrization |
| hodograf | hodograph |
| odmik krivulje | curve offset (PH routes) |
| vzporednica, vzporedna krivulja | offset curve (the `curve-offset` Demonstration and its lesson) |
| ost | cusp |
| faktor hitrosti | speed factor (\(1+d\kappa\)) |
| prednastavitev | preset |
| Bézierjeve krpe | Bézier patches (family) |
| Bézierjeva krpa | Bézier patch |
| tenzorska Bézierjeva krpa | tensor-product Bézier patch |
| trikotna Bézierjeva krpa | triangular Bézier patch |
| kontrolna mreža | control net |
| robna krivulja | boundary curve |
| čajnik iz Utaha | Utah teapot |
| izoparametrična krivulja | isoparametric curve (iso-curve) |
| baricentrične koordinate | barycentric coordinates |
| Bernsteinova utež točke | Bernstein weight of a control point |
| polparameter ℓ | semi-latus rectum (conic focal view; standard in Slovenian conic teaching, "parameter" alone is the full latus rectum 2ℓ) |
| utež w₁ (Bézierjevega loka) | weight (matches the existing "utež" for rational Bézier weights) |
| teme / stransko teme | vertex / co-vertex (conic) |
| azimut / višinski kot | azimuth / elevation (camera) |
| mešani odvod | twist (mixed partial derivative) |
| točka / kotna točka / gladka točka | anchor point / corner point / smooth point (drawing playground) |
| ročica | handle (drawing playground) |
| odsek | segment of the drawing (one cubic Bézier piece; drawing playground) |
| stik | joint (where two segments meet; drawing playground) |
| Poglej pod površje | Look underneath (drawing playground mode) |
| oblika | shape (drawing playground) |
| konjugirano število | conjugate (complex numbers) |
| obratna vrednost | reciprocal \(1/z\) (complex numbers) |
| inverzija v krožnici | circle inversion |
| enotska krožnica | unit circle |
| radian | radian (unit of angle; the angle equals the arc length on the unit circle); TR1 |
| kotne funkcije | trigonometric functions (PIK §4.10.9 title); TR1 |
| adicijski izreki | addition formulas for sine and cosine (PIK §4.10.9); TR2 |
| lok | arc of the unit circle (PIK §4.6 "nad istim lokom"); TR1 |
| kvadrant | quadrant of the plane; TR1 readout |
| predznaka | signs of cosine and sine (dual form: two quantities); TR1 readout |
| lega | position of the point on the circle (quadrant or axis); TR1 readout |
| zrcalna slika čez izhodišče | reflection in the origin (central reflection; extends *zrcalna slika čez os*); TR2 |
| krožnica inverzije | circle of inversion |
| količnik | quotient \(w/z\) |
| linearna preslikava | linear map |
| matrika | matrix |
| slika baze | image of the basis |
| determinanta | determinant |
| predznačena ploščina | signed area |
| implicitna oblika | implicit form of the equation of a line \(ax+by=c\); L1 |
| eksplicitna oblika | explicit form \(y=kx+n\) (the graph of a function); L1 |
| odsekovna oblika | intercept form \(x/m+y/n=1\); L1 |
| dvotočkovna oblika | two-point form of the equation of a line; L1 |
| smerni koeficient | slope \(k\); L1 |
| normalni vektor | normal vector of a line, \((a,b)\) of \(ax+by=c\); L2 |
| smerni vektor | direction vector of a line; L2 |
| skalarni produkt | dot product, zero for perpendicular normals; L2 |
| lega premic | relative position of two lines (parallel, perpendicular, coincident, neither); L2 |
| izometrija | isometry, a map of the plane that keeps distances (isometries L1, L2) |
| togi premik | rigid motion, an orientation-keeping isometry, also the general word for any of the four kinds; L2 |
| vzporedni premik | translation; L1, L2 |
| zrcalo; zrcaljenje | mirror; reflection in a mirror; L1, L2 |
| vrtež | rotation about a centre; L1, L2 |
| zrcalni zdrs | glide reflection (reflection and translation along the axis); L2 |
| negibna točka | fixed point of a map; L2 |
| potenčna premica; potenčno središče | radical axis; radical centre (CG1, CG2). Built on the existing *potenca*; glossed on first use, unreviewed |
| Talesova krožnica | Thales circle, the circle over a diameter (CG1). From the existing *Talesov izrek* |
| tetiva dotikališč | chord of contact, the segment joining the two points of contact (CG1). Built on *tetiva* and *točka dotika* |
| krožnice z isto potenčno premico | coaxal circles (CG2). Handler 11 decision: a descriptive phrase used everywhere; *soosne krožnice* was rejected because it reads as "sharing an axis of symmetry", and no established Slovenian term was verified |
| sosrediščni krožnici | concentric circles, which have no radical axis (CG2); taken from the existing wording in `sl.ts` |
| orientacija ohranjena / obrnjena | orientation kept / reversed |
| pravilni n-kotnik; oglišče; stopnja n | regular n-gon; vertex; degree n (roots of z^n = w) |
| preizkusna točka | test point (roots graph) |
| n-ti koren; koren enote | nth root; root of unity (complex maps, F2b) |
| Geometrija ravnine | Plane geometry (family; triangle geometry, F2b) |
| znamenite točke trikotnika | notable points of a triangle (triangle geometry, F2b) |
| obodni kot | inscribed angle (triangle geometry, F2b) |
| Talesov izrek | Thales' theorem (triangle geometry, F2b) |
| Eulerjeva premica | Euler line (triangle geometry, F2b) |
| krožnica devetih točk | nine-point circle (triangle geometry, F2b) |
| Simsonova premica | Simson line (triangle geometry, 07 F2b) |
| inverzija | inversion (triangle geometry, 08 F2b) |
| središče inverzije | centre of inversion (triangle geometry, 08 F2b) |
| potenca točke na krožnico | power of a point with respect to a circle (triangle geometry, 08 F2b) |
| posplošena krožnica | generalised circle (circle or line) (triangle geometry, 08 F2b) |
| nožišče | foot of a perpendicular (pedal point) (triangle geometry, 07 F2b) |
| nožiščni trikotnik | pedal triangle (triangle geometry, 07 F2b) |
| nosilka stranice | side line (line carrying a side) (triangle geometry, 07 F2b) |
| geometrija trikotnika in inverzija | triangle geometry and inversion (chapter title; only notable points and inscribed angle are published so far) |
| težišče; višinska točka | centroid; orthocentre (triangle geometry chapter) |
| središče očrtane krožnice; središče včrtane krožnice | circumcentre; incentre (triangle geometry chapter; the PIK formula sheet says *očrtan krog*, the app keeps *krožnica*) |
| središčni kot | central angle (triangle geometry chapter) |
| ostrokotni / pravokotni / topokotni trikotnik | acute / right / obtuse triangle (triangle geometry chapter) |
| izrojen trikotnik | degenerate triangle, glossed as *oglišča ležijo na isti premici* (triangle geometry chapter) |
| glavni argument; glavni koren | principal argument in \((-\pi,\pi]\); principal root \(z_0\) (complex maps chapter) |
| obratna vrednost; inverzija v krožnici | reciprocal; circle inversion (complex maps chapter; involution that reverses orientation) |
| premonosna ploskev | ruled surface (Coons patch, D4; sl.wikipedia "Premonosna ploskev") |
| tangentna (Newtonova) metoda | Newton's (tangent) method (numerical methods N1, N2; FMF syllabus wording "tangentna metoda") |
| sekantna metoda | secant method (numerical methods N3; FMF syllabus wording) |
| približek | iterate (a member of an iteration; already used by the fixed-point lesson, "naslednji približek"; "iterat" is not used) |
| začetni približek | start of an iteration (x₀; the second secant start is "drugi začetni približek") |
| Fourierova vrsta; delna vsota Sₙ | Fourier series; partial sum (Fourier series F2a graph; "vrsta" as in the Taylor prompt, "delna vsota" is the standard FMF wording) |
| število harmonikov N | number of harmonics N (Fourier series F2a). Not "stopnja" (Taylor, a polynomial degree) and not "indeks" (uniform convergence, an index of a sequence): N counts the sine terms of the sum, so the count is named; a harmonic is "harmonik" (genitive plural "harmonikov") |
| pravokotni val; žagasti val | square wave; sawtooth wave (Fourier series F2a examples; "žagasti" is the established adjective for the saw shape) |
| Gibbsov pojav; vrh pri \(\pi/(N+1)\) | Gibbs phenomenon; the peak of the overshoot at \(\pi/(N+1)\) (Fourier series F2a; "vrh" is the board label for the maximum of the sum) |
| spekter koeficientov | spectrum of coefficients: the bars of \(a_k\) and \(b_k\) (Fourier series 05 F2a; FMF notes say "amplitudni spekter" for the amplitude sequence, which these bars are not). Sources in the Fourier spec terms table |
| Parsevalova identiteta; Parsevalova vsota | Parseval's identity; Parseval sum \(a_0^2/2+\sum_{k\le K}(a_k^2+b_k^2)\) (Fourier series 05 F2a; "identiteta" as in the FMF Analiza 4 problem book, not "enakost" or "enačba") |
| integral kvadrata \((1/\pi)\int f^2\) | integral of the square (Fourier series 05 F2a). Not "povprečje kvadrata" or "srednja kvadratna vrednost": over \([-\pi,\pi]\) it is twice the mean of \(f^2\) |
| premik (znotraj / zunaj) | shift (inside f: horizontal, c; outside f: vertical, d); school function graphs S1. "prenos" is not used |
| raztegnitev (znotraj / zunaj) | stretch (inside f: horizontal, b; outside f: vertical, a); S1 |
| zrcaljenje (čez os x / čez premico x = c) | reflection (negative a: about the x-axis; negative b: about the line x = c); S1 |
| osnovna funkcija | base function f of a transformation (S1); the faint copy of its graph is "osnovni graf" |
| označena točka | the marked (tracked) point (u, f(u)) of the base graph and its image (S1) |
| obnašanje v neskončnosti | end behaviour of a polynomial (limits at x → −∞ and x → +∞, from the sign of k and the parity of the degree); school function graphs S3. Built from the usual "obnašanje" (behaviour) with "v neskončnosti", the phrase used for limits at infinity |
| enojna / dvojna / trojna ničla | simple / double / triple zero (multiplicity 1 / 2 / 3); S3. Numerals "enojna, dvojna, trojna" are the standard Slovenian multiplicity adjectives; "večkratnost" is the noun for multiplicity |
| presečišče z osjo y | y-intercept, the point (0, p(0)); S3. Matches the existing "seka os y" (crosses the y-axis) |
| inverzna funkcija | inverse function (S2); its graph is the reflection of the graph in the line y = x ("zrcaljenje čez premico y = x"); the point P and its mirror P′ swap coordinates |
| logaritem z osnovo a | logarithm to base a (S2); \(\log_a\) inverts \(a^x\), "naravni logaritem" for \(\ln\). x² is offered only as a "zožitev" (restriction) to x ≥ 0, so that it is one-to-one ("povratno enolična") |
| Delaunayeva triangulacija | Delaunay triangulation (computational geometry, Delaunay flips graph; "Delaunayeva" as in Slovenian usage of the surname adjective, like *Bézierjeva*; no empty-circle wording in the panel title) |
| obalna črta / krožni dogodek / lažni alarm | beach line / circle event / false alarm (Fortune's algorithm; "obalna črta" is the beach line as a shoreline, "krožni dogodek" the event at a circle's lowest point, "lažni alarm" a scheduled circle event that is cancelled) |
| neustrezen rob; ustrezen rob | illegal edge; legal edge (Delaunay flips: the edge fails the empty circumcircle test and is flipped; "neustrezen" is a transparent plain-language gloss, the English term is shown in the lesson) |
| preizkus krožnice | incircle test (the sign of the incircle determinant: +, point inside the circle; −, outside; 0, on it) |
| kocirkularne točke | cocircular points (four points on one circle: determinant 0, both diagonals legal, the Delaunay triangulation is not unique) |
| števec; imenovalec | numerator; denominator (rational function graph, S4). The standard school words for the parts of a fraction, also used for the polynomials \(p\) and \(q\) of \(f=p/q\) |
| okrajšani ulomek | reduced fraction (S4): the fraction after the common factors are cancelled ("krajšanje ulomkov" is the school term) |
| ostanek (pri deljenju polinomov) | remainder \(r\) of the polynomial division \(p=s\,q+r\) (S4); the standard school word, the quotient is "količnik" |
| pol (racionalne funkcije) | pole of a rational function: a zero of the reduced denominator (S4). Standard school term (F0 term table in `docs/tasks/school-function-graphs/README.md`); the unrelated "pol in polara" of the conics chapter always carries "polara" |
| luknja (odpravljiva nezveznost) | hole (removable discontinuity) at a cancelled common zero (S4). "luknja" is the plain-language gloss, shown with the textbook term "odpravljiva nezveznost" |
| navpična / vodoravna / poševna asimptota | vertical / horizontal / oblique asymptote (S4); the usual school adjectives ("poševna" as for "poševna asimptota" in gimnazija textbooks) |
| kombinatorika; kombinatorično drevo | combinatorics; counting tree (CB1, CB2). PIK §4.15, as decided in the combinatorics task table; the chapter and CB2 use both |
| osnovni izrek kombinatorike | product rule (CB2). PIK §4.15; the pravilo vsote (sum rule) is not used until Batch B |
| permutacija; variacija; kombinacija | permutation; variation; combination (CB2). PIK §4.15; "permutacije s ponavljanjem" (MISSISSIPPI, CB2) and "variacije s ponavljanjem" are the same words with *s ponavljanjem*; "kombinacije s ponavljanjem" only named as the graph's fourth kind, not derived |
| binomski simbol; Pascalov trikotnik | binomial coefficient \(\binom nk\), read "n nad k" (CB1, CB2); Pascal's triangle (CB1). PIK §4.15; the readout writes "(n nad k)" |
| pot po mreži | lattice path, a route of right (D) and up (G) steps (CB1). Transparent wording, no source shows *monotona pot*; CB1 step 1 glosses it as "eno polje desno (D) ali gor (G)". Route letters D and G in sl, R and U in en |
| hitrost; velikost hitrosti; pospešek (kinematika) | velocity (vector); speed; acceleration (KN1, KN2). Existing words from the kinematics term table (`docs/tasks/kinematics/README.md`); the readout writes the vector as (x; y) m/s and the length as \(|v|\) |
| tangentni, normalni pospešek | tangential, normal acceleration \(a_T\), \(a_N\) (KN2). Standard; the graph draws them dotted and with long dashes (*dolge črtice*, distinct from the dashed *črtkano* acceleration) |
| primerjalna točka | reference point (KN2): the uniformly circling comparison point, drawn as a square; plain description |
| enakomerno kroženje; kotna hitrost; poševni met | uniform circular motion; angular velocity; projectile motion (KN1 step 6 names the motions of the Motion list; KN2 uses the first two). Standard school-physics words |
| špica (cikloide) | cusp of the cycloid (KN1 step 5), the point of velocity 0; the graph status says *Hitrost je 0 ali skoraj 0* |
| tir; kroglica; čas spusta | track (the curve the bead slides on); bead; descent time (MC1, MC2). Chosen in `docs/tasks/mechanical-curves/README.md`: *pot* is too general and clashes with the path of a point; *tir* is glossed once in MC1 step 1 as "krivulja, po kateri teče"; the experiments are named *Tekma* and *Tir* in the graph |
| val; seštevanje valov (superpozicija); razlika faz | wave; superposition; phase difference (WV1, WV2). Standard school physics, decided in `docs/tasks/waves/README.md`; *superpozicija* appears once in the chapter intro as the gloss of *seštevanje valov* |
| kazalec (vala); ovojnica | phasor (the rotating arrow whose horizontal projection is the wave, WV1); envelope (the curve bounding the sum, WV2). Standard |
| utripanje; izničenje | beats (WV2); cancellation (WV1, equal amplitudes in opposite phase). Standard |
| cikloida; brahistohrona (krivulja najhitrejšega spusta) | cycloid; brachistochrone (MC1, MC2). *Cikloida* existing; *brahistohrona* is the standard Greek-derived term, glossed by the descriptive phrase at its first use (MC2 formula block) |
| kroglica ne zdrsne | the bead does not start sliding (MC2 step 6, the graph status for a horizontal start). The text reads it physically: there is no force along a horizontal tangent, so the bead stays where it is |
| zaporedje; člen zaporedja; rekurzivna formula; aritmetično, geometrijsko zaporedje | sequence; term; recursive formula; arithmetic, geometric sequence (RG1). PIK §4.12; the table in `docs/tasks/recursion/README.md` holds the full recursion term list |
| zaprta oblika; limita vsote | closed form (a formula for the \(n\)-th term, in contrast to the recursive rule); limit of the sum \(a_1/(1-q)\) (RG1, the graph readouts say *zaprta oblika*). Transparent standard wording |
| navadno, obrestno obrestovanje; relativna, konformna obrestna mera; čas podvojitve; zvezno obrestovanje; Eulerjevo število \(e\) | simple, compound interest; relative, conformal interest rate; doubling time; continuous compounding; Euler's number (RG3). PIK §4.12 and standard school finance wording; *zvezno obrestovanje* is transparent next to the first two and the exponential lessons use the same *Eulerjevo število* |

Playground terms: reasoning in the [drawing playground spec](specs/bezier-drawing-playground.md#terms).

Complex-map terms: sources and reasoning are in the [complex maps term table](tasks/complex-maps/README.md); *krožnica* (circle) versus *krog* (disc) follows the rest of the app.

Triangle-geometry terms: sources and reasoning are in the [triangle geometry term table](tasks/triangle-geometry/README.md#slovenian-terms-f0-decision).

Patch terms: sources and reasoning are in the [Bézier patches spec](specs/bezier-patches.md#localization).

Projective conic terms (*dvorazmerje*, *harmonična četverka*, *točka v neskončnosti*, *središčna projekcija*, and later *pol in polara*, *šop premic*): sources and reasoning are in the [projective conics term table](tasks/projective-conics/README.md#slovenian-terms-f0-decision).

The owner approved the existing Slovenian terminology and English wording on 2026-10-24. Separate owner language sign-off is no longer a standing gate; see the [release policy](guardrails.md#release-policy--owner-decision-2026-10-24). Keep catalog counterparts and mathematical meaning consistent, and fix concrete wording issues when identified. Existing spelling/capitalization variants may be refined through ordinary changes.

## Choosing new terms

When a change needs a Slovenian term that the table lacks, the agent settles it. The owner delegated this on 2026-10-26. Owner choices already recorded in the table, or in a spec's owner decisions, stand unless the owner reopens them.

1. **Reuse.** Search `src/localization/sl.ts` and `src/learning/content/` for the concept and its neighbours. Match existing spelling and word families, for example *Bézierjev-* rather than *Bézierov-*, and *kontrolni poligon* → *kontrolna mreža*.
2. **Research.** Look for established usage. Prefer University of Ljubljana mathematics teaching: FMF/FRI course pages and syllabi, and theses in the RUL repository (repozitorij.uni-lj.si). Then try Slovenian textbooks, and after that general sources (sl.wikipedia, Termania). Note what each source actually shows.
3. **Decide.** Prefer the term used in UL mathematics teaching. When sources conflict or are absent, choose the most transparent standard mathematical wording, and give the English term as a gloss on first mention in prose.
4. **Record.** In the same change, add the term to the table above. Put its sources and reasoning in the feature's spec, or in the commit message for a one-off term.

Done when every new Slovenian term in the change is in the table with a recorded basis.

See [verification evidence and remaining checks](reviews/localization.md).

Type errors come from `npx tsc --noEmit`; the Vite build does not type-check. Do not weaken the message types or disable type checking to accommodate diagnostics.
