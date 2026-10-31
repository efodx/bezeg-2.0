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
| premonosna ploskev | ruled surface (Coons patch, D4; sl.wikipedia "Premonosna ploskev") |

Playground terms: reasoning in the [drawing playground spec](specs/bezier-drawing-playground.md#terms).

Complex-map terms: sources and reasoning are in the [complex maps term table](tasks/complex-maps/README.md); *krožnica* (circle) versus *krog* (disc) follows the rest of the app.

Patch terms: sources and reasoning are in the [Bézier patches spec](specs/bezier-patches.md#localization).

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
