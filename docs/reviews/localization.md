# Localization implementation verification

Date: 2026-10-08. Source spec: [Slovenian and English localization](../specs/localization.md).

## Implemented

Typed bilingual catalogs cover navigation, shared controls, demonstration text, dialogs, validation errors, tooltips, and accessible labels. The shared selector remembers an explicit preference, defaults to Slovenian, updates the document language, and handles unavailable preference storage. Stable navigation/editing identities prevent text changes from becoming remount keys.

Structured validation errors and preserved form state allow live switching. Graph lifecycle guards avoid mathematical regeneration on context-only updates. Preview creation was moved out of polynomial command rendering. Figure exports lock language switching and overlapping capture controls, release on failure, and await captures before ZIP generation.

## Evidence

- Standalone TypeScript check passed.
- The final production build passed after removing a stale TypeScript incremental cache outside the Windows sandbox. An independent reproduction found 250 cached diagnostics versus zero with fresh build info. Existing CRA/dependency and cached lint warnings remain; no build-tool migration was introduced. A fresh targeted ESLint run on the module, error page, image store, and extrapolation control passed.
- Seven focused suites passed: **54 checks** for localization, persistent workspace controls, preset import/dialog behavior, point coordinates, and mathematical evaluation. The localization suites cover catalog/placeholder completeness, preference persistence and failures, initial unsupported preferences, nested live errors, file-read/native storage failures, draft/section preservation, fallback, and nested export locking.
- Seven production assets exist under the expected `/bezeg/` base. Local HTTP checks returned the application shell for the home page and all 26 demonstration routes (27 checks). These verify served shells rather than browser execution or real GitHub Pages hosting.
- An earlier broad test run also reached the unrelated starter `App.test.tsx`, which still expects the removed Learn React link and lacks router context. The focused run excludes it.
- Source inventory reviewed all 26 active route definitions and shared controls. Remaining inventory matches are mathematical notation, axis identity strings translated at their display boundary, diagnostic console strings, and an internal capture exception replaced by an actionable UI message.
- Continuation browser review in English traversed all 26 active routes. Each route showed a translated title, graph, and shared inspector. Switching languages with a Bézier curve selected retained the selected control and the same JSXGraph SVG board IDs; the browser preference was restored to Slovenian afterward. A fresh TypeScript check and production build passed after removing the stale generated TypeScript build-info cache. A separate fresh development compile reported no TypeScript issues.
- Independent engineering and mathematical source reviews found file-read localization, overlapping batch capture, render-time preview creation, and missing spline-title spacing issues. Those were corrected. No localization-attributable numerical change was found; unrelated concurrent evaluator changes were excluded.
- Whitespace checks passed.

## Remaining evidence

An earlier browser attempt against port 3001 was blocked. The follow-up route traversal used the running preview at port 3002. It was an accessibility-tree smoke check, not a visual comparison, and it does not compare edited board state across every route.

Review longer English text at desktop and 390 CSS pixels; test language access in presentation mode and by keyboard. Switch with a broader set of edited states, open dialogs, drafts, visible errors, and the PH auxiliary board. Review SVG/PNG output in both languages and batch scene timing, including failure recovery. Recheck existing preset save/reopen and file exchange through the real browser UI. Approve the [translation terminology](../localization.md) before declaring classroom readiness.

The working tree already contained unrelated workspace and performance work, with additional changes made concurrently. The standalone module and separate page/control changes are committed independently. Shell, workspace, persistence, some demonstration integrations, and the integration test remain uncommitted where they overlap that work or depend on its uncommitted files. Documentation-index, architecture, UI, product-direction, and roadmap additions likewise remain alongside the existing uncommitted planning documents. No unrelated evaluator or workspace changes were included in localization commits.
