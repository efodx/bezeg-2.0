# Slovenian and English localization

Status: implemented and committed. The [original implementation review](../reviews/localization.md) records the initial evidence and gaps; later [chapter verification](../reviews/standalone-learning/implementation.md) and [lesson experience verification](../reviews/lesson-experience-improvements/implementation.md) add bilingual browser coverage. These do not close every original export/dialog/device case or owner terminology approval. See the [2026-10-24 planning cleanup](../reviews/planning-cleanup-2026-10-24.md) for remaining decisions.

## Purpose

Provide a complete Slovenian and English experience for students and educators, within the [product direction](../product-direction.md) and [guardrails](../guardrails.md).

## Confirmed decisions

- Translate the entire app: navigation, all 26 active demonstrations, controls, tooltips, accessible labels, dialogs, errors, and explanatory text.
- Preserve mathematical notation, route paths, stored identifiers, and user-written preset names.
- Provide an explicit **Slovenščina / English** choice. Remember the choice in the browser; use Slovenian on the first visit. Browser-language detection and language-specific links are not yet settled.
- Switching languages immediately updates the current demonstration while preserving curves, selection, parameters, viewport, and unsaved work.
- Retain decimal points for displayed numbers, coordinate entry, and mathematical expressions in both languages. Decimal-comma support is outside this release.
- Keep language out of shared URLs. A recipient uses their saved browser preference, or Slovenian on their first visit. Do not detect browser language in this release.
- SVG and PNG figures use the currently selected interface language. Preset files remain language-neutral and user-written names are preserved.
- The implementation includes draft English translations and a Slovenian–English mathematical terminology table. The owner reviews translations before they are declared classroom-ready.
- Build a small shared localization module with typed message keys, separate Slovenian and English catalogs, and parameter substitution. Functional React controls, class-based graph controls, and validation services use the same messages; mathematical evaluation remains independent. No new localization dependency is selected for this scope.
- Verification rejects missing translations and mismatched message parameters. Unexpected runtime translation failures fall back to Slovenian.
- Language switching preserves open dialogs, coordinate drafts, preset-name drafts, and visible errors. Existing errors immediately display in the selected language.
- Disable language switching during single or batch figure export and explain the temporary restriction beside the control, so exported output uses one language consistently.
- Preserve existing Slovenian wording except where inconsistent, incorrect, or unclear. Record terminology corrections for owner review.
- Place the **Slovenščina / English** control in the shared app header. Keep it reachable on small screens and in presentation mode, keyboard-operable, and visibly indicate the current selection. Use language names rather than flags. Update the document language when the selection changes.
- If browser storage is unavailable, language switching still works for the session, with a brief localized notice that the choice cannot be remembered. Invalid or unsupported saved preferences fall back to Slovenian.
- Verify all 26 demonstrations, switching without scene changes, unfinished input and visible errors, preference persistence and failure handling, and SVG/PNG export in both languages. Include desktop, narrow-screen, presentation, and keyboard review, with route and preset compatibility checks.

## Source findings affecting the design

- No localization dependency or shared formatting infrastructure is present in the inspected source.
- Route/group labels and mathematical title markup live in `src/Routes.js`. Navigation groups and some editing controls currently use visible labels as identities; translation requires stable identities independent of text.
- `App` and the route refresher intentionally remount content for preset/refresh changes. Language must not become a remount key.
- Some graph `componentDidUpdate` methods (now `onStateChange`) regenerate constructions. Some command builders create preview objects during rendering. Preserving a scene requires guarding language-only updates and removing affected render side effects, rather than merely avoiding remounts.
- Class-based graphs already consume `SiteContext`; localization must work across that hierarchy, functional React controls, command builders, and plain validation services.
- Import errors are built and cached as Slovenian strings. Already-visible errors need to update when language changes.
- Sliders and several graph labels currently use decimal points and `toFixed`; coordinate entry uses native number inputs. Numeric formatting and input policy remain open. Preset JSON must remain numeric and language-neutral.
- Graph notation and labels are captured by figure export. Export language behavior remains open.
- `public/index.html` currently declares English although the UI is predominantly Slovenian. The initial document language and runtime language need to match the chosen interface.

## Module boundaries

The module owns language selection, message lookup and interpolation, and the browser preference. React integration exposes the same translation behavior to functional and class-based controls. Stable message identities are independent of translated text.

Validation services describe user-facing errors with message keys and parameters so dialogs can translate an existing error again after switching language. Technical identifiers supplied as parameters remain unchanged. Language changes affect UI text and applicable board labels, without modifying geometry, advancing mathematical cache revisions solely for translation, or replacing boards and constructions.

Language preference uses storage separate from preset collections. Contributor instructions for adding messages and translations belong in technical documentation; the project glossary remains domain vocabulary only. The bilingual mathematical terminology table belongs with localization documentation.

## Acceptance criteria

1. First visits use Slovenian. A valid saved English preference is restored on later visits. No browser-language detection or URL language parameter is introduced.
2. The header control exposes both language names and the current selection, works by keyboard, and remains reachable at desktop and narrow widths and in presentation mode. The initial HTML language is Slovenian and the runtime document language matches the selected language.
3. Navigation, home/error pages, all 26 active demonstrations, explanatory copy, controls, tooltips, accessible names, dialogs, and application-generated errors have complete Slovenian and English messages. Static entry-page text is included in the coverage inventory and reviewed for first-visit behavior.
4. Message keys and required interpolation parameters are checked across catalogs. A missing runtime translation falls back to its Slovenian message. Contributors have documented steps to add a message in both languages.
5. Switching language preserves curve data, selection, parameters, viewport, presentation/editing modes, unsaved work, open dialogs, and draft input. Existing visible errors update immediately. Language-only updates do not recreate the current board or its mathematical constructions.
6. Both languages retain the existing decimal-point convention and numeric precision. Mathematical notation and operations retain their meaning. Coordinates and presets remain numeric rather than translated strings.
7. Route paths, preset collection keys, serialized type identifiers, preset file structure, and user-written preset names remain unchanged. Language preference is neither exported as preset data nor overwritten by preset import.
8. SVG and PNG exports reflect the current language. Language switching is disabled with an explanation during single and batch exports and becomes available again after completion or failure.
9. Storage read/write failures do not prevent startup or session switching. Invalid saved languages use Slovenian. A failed preference write produces a localized, non-blocking notice.
10. Draft English translations and a bilingual mathematical terminology table are provided for owner review, including any corrected Slovenian wording. Technical verification and classroom translation approval are reported separately.

## Verification

- Inventory each active route's navigation, controls, explanations, board text, dialogs, and accessible labels against both catalogs. Include shared home/error screens and static entry content.
- Use focused behavioral checks for preference restoration/failure, invalid preferences, translation fallback, interpolation, live errors, and unfinished forms.
- Check every demonstration for language-only lifecycle side effects. Exercise switches with existing geometry and parameters; cover selected curves, constructions, spline controls, and the PH auxiliary editor. Compare state and board ownership before/after switching. If numerical paths are changed during implementation, add the relevant mathematical checks.
- Review both languages at desktop and 390 CSS pixels, through keyboard operation and presentation mode. Check longer English text for clipping and control reachability.
- Review SVG and PNG figures in both languages, including graph labels, and batch export consistency. Verify export failure releases the language restriction.
- Save/reopen and import/export representative existing presets; verify routes and preset contracts are unchanged. Run the existing production build and focused checks; report unrelated baseline test failures separately.

## Scope exclusions

No backend, accounts, build-tool or renderer migration, mathematical feature changes, route translation, preset migration, decimal-comma support, automatic browser-language detection, language-specific links, or automatic translation of user-authored content.

The design interview did not deploy the app or create external tickets. Following complete-design confirmation, implementation follows this bounded spec. Classroom readiness additionally requires browser verification and owner translation review.
