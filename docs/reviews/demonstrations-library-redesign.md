# Demonstrations library implementation

Source: [bounded specification](../specs/demonstrations-library-redesign.md). Owner implementation request: 2026-10-15. Checkout: `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg`, baseline `f4f2ed81a3a06c4fb55e8d328999a4eae7e1b841` plus this feature. Unrelated `.prototype-refresh/` and `docs/specs/demonstrations-visual-hierarchy.md` were preserved.

## Changes

The catalogue and native modal picker share one collection, metadata order, preview map, localized search, topic filtering, and lesson availability. URL filters retain unrelated parameters and fragments. Visit-scoped router state carries the catalogue location, card, scroll, and focus through graph switches. The workspace removes its permanent topic tree and provides collection/family/current breadcrumbs and a labeled switcher.

The modal keeps the host, board, inspector drafts, and lesson mounted. Native modal behavior isolates the underlying document and contains focus. Graph-owned pause hooks retain the current parameter/frame; cancelling leaves playback paused. Same-graph selection closes without navigation, and its lesson action uses the existing lesson capture/restore path. Export and scene-replacement owners expose temporary picker unavailability.

No mathematical evaluation algorithm, route suffix, preview asset, stored Preset, or file format changed. The deliberate navigation presentation change requires no data migration.

## Review and repairs

Parallel read-only reviews covered engineering/mathematical ownership and UI/accessibility. Findings were closed by omitting whitespace-only `q` while retaining draft text, exposing a visible described busy reason on a focusable guarded switcher, and adding real playback browser coverage. Handler review additionally corrected scroll capture at link activation, cancelled pending restoration callbacks at unmount, preserved return context when exiting deep-linked lessons, and avoided overriding lesson-entry focus with cancellation focus restoration.

Real Chromium testing exposed Tab reaching `BODY` after the last dialog control; explicit forward/reverse Tab boundary wrapping now supplements native modal isolation. The broad lesson run exposed a stale three-column rule in `GuidedLessonLayout.css`; the corrected two-column rule keeps the board width stable when a lesson opens. Catalogue copy for rational circle segments was revised to investigate control points and weights, avoiding an implication that the exact circle is an approximation.

Escape is handled before the native search input can consume it merely to clear the query. The original inspector disclosure styling was preserved when removing the combined topic-tree selectors, and workspace titles can wrap under text enlargement. The lesson lifetime helper now excludes the default-axis/tick/axis-label object closure from its graph-owned total: the existing 40-object linear-scene bound, curve/point checks, and exact Exit/re-entry totals remain intact.

## Verification

- `npx tsc --noEmit --pretty false`: passed after localization and final application edits.
- `npx vitest run`: 111 files, 1,614 tests passed at the first integrated checkpoint.
- Affected rerun: `npx vitest run src/DemonstrationsPage.test.tsx src/graphs/base/DemonstrationWorkspace.test.tsx`: 17 tests passed, including whitespace draft/URL behavior. A subsequent catalogue-only rerun passed 7 tests, including a deliberately lesson-unavailable entry.
- Graph owner checks: GraphHost, real-graph host, and alternative De Casteljau tests: 37 passed. The numeric pause check retained the live parameter `0.73`, published it over stale state `0.71`, and resumed from `0.73`.
- Final workspace/localization rerun: 3 files, 29 tests passed; final TypeScript check passed.
- `npm run build`: final production build passed on 2026-10-15 around 19:22 Europe/Ljubljana after the final inspector-style preservation. Bootstrap Sass deprecation and existing JSXGraph eval warnings remain. Restricted execution intermittently failed to resolve installed Sass; the same established build passed with scoped escalation, without dependency changes.
- `git diff --check`: passed.

Final build entry assets: `/bezeg-2.0/assets/index-BwFp8fOl.js` and `/bezeg-2.0/assets/index-BGnyFXCI.css`. Browser servers were started and disposed by the Playwright harness. The handler's unreachable standalone preview was stopped; temporary diagnostic result directories were removed after recording their failures and repair evidence.

The complete browser run on the stable two-column lesson build exercised 167 cases: 165 passed and two linear-function cases hit the old axis-inclusive count of 42 against 40. After the helper correction, all 3 linear lesson rows and 21 other affected function lesson rows passed. The initial broader diagnostic run was interrupted after discovering the obsolete lesson grid; it is not counted as acceptance. Local preview evidence does not establish hosted GitHub Pages deployment success.

The delegated smoke-tester used Chromium at 1280×720 on its own production preview at port 4177. It observed actual Bézier point dragging, a De Casteljau keyboard slider change, a rational weight change, and PH generating-point editing change their rendered curves/constructions. No console or page errors were observed. The existing workflow file passed 3/3: language retained edited geometry and selection, temporary preset save/change/reopen restored the scene, and fit-to-points framed the points. The temporary preset context and browser were isolated; temporary worker scripts/results were removed. The worker's presentation probe stopped on an incorrect test label; persistent presentation/picker tests cover that flow separately. Preset deletion was not exercised by this worker.

Before the final lesson-grid correction, 55 focused production browser checks passed across catalogue, picker, and curve ownership. They covered card order/previews/destinations, filters and URLs, history/breadcrumb return, real graph identity and edited-state preservation, current-graph continuation, lesson entry/Exit restoration, running playback pause, focus containment and background isolation, both languages, responsive layouts, and PH board disposal. The corrected layout was exercised in the subsequent stable-build runs.

On the final 19:22 build, the three focused browser files exercised 57 cases: 56 passed, and the catalogue overview finished its assertions but failed while Playwright closed its context and wrote a Windows trace artifact (`UNKNOWN: unknown error, open ...trace`). Its isolated rerun with tracing disabled passed 1/1. All selected application assertions therefore passed after reruns; the runner artifact failure is recorded separately. The current-graph lesson case includes edited entry coordinates, filtering a different family, Escape with a nonempty query, current-graph continuation with unchanged progress/board state, and numeric edited-state restoration on Exit. Presentation cancellation and switching to PH retain Presentation mode. Refreshed final workspace screenshots were reviewed at 390 and 1440 pixels after the inspector-style preservation.

The complete final focused rerun with `--trace=off` passed **57/57** in 1.2 minutes. Tracing was disabled only for this local rerun; repository/CI trace settings remain unchanged.

Eighteen captured views cover catalogue, normal workspace, and picker in Slovenian and English at 390, 724, and 1440 CSS pixels in [the evidence directory](demonstrations-library-redesign/). Handler visual inspection confirmed readable previews/copy, reachable labeled actions, and the intended collection/workspace distinction. Automated checks additionally exercise 125% root text size, reduced motion, and reduced viewport height; this is not a comprehensive text-only enlargement audit.

## Remaining device coverage

Physical touch hardware, mobile virtual keyboards, classroom projector legibility, and a comprehensive screen-reader audit are not established by Chromium viewport and keyboard checks. These limits are distinct from implementation completion. The in-app browser could not reach the sandbox preview; the established Playwright production harness supplies local real-browser verification.

Implementation and local behavior acceptance are complete. Hosted deployment and the physical-device checks above remain unverified; no claim of comprehensive classroom or accessibility certification is made.

## Acceptance accounting

| Spec criterion | Evidence and limits |
| --- | --- |
| 1. Continuous complete collection | Metadata-derived order/count/card assertions and catalogue screenshots. |
| 2. Shared filter/URL contract | Route tests and Chromium topic/search/clear/empty/history checks, encoded and malformed topics, filtered direct entry and refresh. |
| 3. Faithful useful cards | Existing asset/provenance map checked for every entry; localized copy reviewed, supported destinations checked, unavailable lesson branch tested. |
| 4. Focused workspace | Both-language workspace screenshots and all route render checks; permanent tree removed, inspector sections retain mounting. |
| 5. Shared page/picker selection | One collection implementation; picker current family, current marker, and filtered results exercised. |
| 6. Cancellation preservation | Real board identity, rendered curves, edited coordinates, selection, view, drafts, and frozen playback checked; active lesson progress retained through filtering and cancellation. |
| 7. Current/other destination behavior | Current graph continuation and lesson entry/Exit checkpoint tested; polynomial/PH main and child board disposal tested through switching. |
| 8. Return context | Back and breadcrumb restore filtered location, scroll and action focus; direct arrivals use the internal unfiltered destination and family link. |
| 9. Modal accessibility | Initial search focus, forward/reverse Tab containment, background focus rejection, Escape with a query, close, and focus return checked in Chromium. |
| 10. Responsive/localized presentation | 18 views at 390/724/1440 in both languages; overflow, target size, reduced height/motion and 125% root text checks. Physical device/projector/virtual keyboard gaps remain. |
| 11. Lifecycle and modes | Busy switcher guard/unit checks, existing export tests, direct lesson flows, lesson observation/completion/Exit/re-entry suite, Presentation mode cancel/switch, and language preservation. |
| 12. Verification and guidance | TypeScript, unit, build and browser evidence above; architecture, capabilities, hosting and smoke guidance updated. Hosted deployment evidence is separate from local acceptance. |
