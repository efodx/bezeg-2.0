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

Numbers retain decimal points and existing precision in both languages. Figure exports use the selected language; the mathematical board labels are predominantly notation and stay unchanged. Single and batch export hold an explicit language lock until completion or failure. Figure controls prevent overlapping captures. Batch capture awaits each PNG before building its ZIP; the existing preset-remount path uses a short settling delay, so scene timing and MathJax fidelity still require browser review.

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
| odmik krivulje | curve offset |
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
| krožnica inverzije | circle of inversion |
| količnik | quotient \(w/z\) |
| linearna preslikava | linear map |
| matrika | matrix |
| slika baze | image of the basis |
| determinanta | determinant |
| predznačena ploščina | signed area |
| orientacija ohranjena / obrnjena | orientation kept / reversed |
| pravilni n-kotnik; oglišče; stopnja n | regular n-gon; vertex; degree n (roots of z^n = w) |
| preizkusna točka | test point (roots graph) |
| n-ti koren; koren enote | nth root; root of unity (complex maps, F2b) |
| Geometrija ravnine | Plane geometry (family; triangle geometry, F2b) |
| znamenite točke trikotnika | notable points of a triangle (triangle geometry, F2b) |
| obodni kot | inscribed angle (triangle geometry, F2b) |
| Talesov izrek | Thales' theorem (triangle geometry, F2b) |
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
| premik (znotraj / zunaj) | shift (inside f: horizontal, c; outside f: vertical, d); school function graphs S1. "prenos" is not used |
| raztegnitev (znotraj / zunaj) | stretch (inside f: horizontal, b; outside f: vertical, a); S1 |
| zrcaljenje (čez os x / čez premico x = c) | reflection (negative a: about the x-axis; negative b: about the line x = c); S1 |
| osnovna funkcija | base function f of a transformation (S1); the faint copy of its graph is "osnovni graf" |
| označena točka | the marked (tracked) point (u, f(u)) of the base graph and its image (S1) |
| inverzna funkcija | inverse function (S2); its graph is the reflection of the graph in the line y = x ("zrcaljenje čez premico y = x"); the point P and its mirror P′ swap coordinates |
| logaritem z osnovo a | logarithm to base a (S2); \(\log_a\) inverts \(a^x\), "naravni logaritem" for \(\ln\). x² is offered only as a "zožitev" (restriction) to x ≥ 0, so that it is one-to-one ("povratno enolična") |

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
