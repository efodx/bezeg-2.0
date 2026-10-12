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

## Mathematical terminology for owner review

| Slovenian wording | English draft |
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

Existing Slovenian wording is retained, including its mixed capitalization and Bézier spelling variants. The route error now provides an actionable Slovenian message and English equivalent. The generic parametrization selector accessible label is translated. No mathematical terminology correction has been declared approved; owner review is required before classroom readiness.

See [verification evidence and remaining checks](reviews/localization.md).

If CRA reports missing locale modules while a fresh `npx tsc --noEmit` succeeds, check `node_modules/.cache/tsconfig.tsbuildinfo`. During this rollout that file retained failed resolutions from initial module creation. A fresh incremental checker passed while the cached checker failed. Remove only that generated build-info file and rerun the existing build script; do not weaken the message types or disable type checking to accommodate stale diagnostics.
