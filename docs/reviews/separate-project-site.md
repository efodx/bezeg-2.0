# Separate Bezeg 2.0 release verification

Source: [release specification](../specs/separate-project-site.md).

The release starts from original Bezeg HEAD `d409cd0` plus the current working-tree app and documentation changes captured on 2026-10-09. The separate repository baseline snapshot is `5030c5e`. The original checkout was not staged, committed, or pushed by this release task.

## Implementation review

The public base changes to `/bezeg-2.0/`; route suffixes and demonstration identities remain the same. The production asset manifest resolves through this base. The existing attributed 404 redirect pair retains one project segment. Deployment explicitly targets `efodx/bezeg-2.0`, including `.nojekyll`.

Browser storage uses the `bezeg-2.0:` prefix so the new app does not modify original-site presets or language choice on the shared GitHub Pages origin. Import/export retains established preset file keys and validation. Storage is resolved lazily so blocked localStorage access does not crash module initialization.

The handler reviewed all release adaptations. Geometry, graph implementations and lesson content/runtime have no release-specific changes. The dependency lockfile is structurally identical to the captured source apart from the package name/version.

## Verification

- Clean `npm ci --no-audit --no-fund`: passed, 1442 packages installed from the copied lockfile.
- `npx tsc --noEmit --pretty false`: passed.
- Production build: passed with inherited CRA/ESLint/Browserslist warnings.
- Production Chromium suite: all 29 tests passed in 1.1 minutes on an owned preview at `http://127.0.0.1:4185/bezeg-2.0`; catalog, all 26 graph routes, language/geometry/selection retention, and preset save/change/reopen.
- Delegated smoke lane selected because hosting and browser persistence cross routes; interaction and actual hosted Pages evidence passed and is recorded below.

The full historical Jest suite was not selected for this hosting release; its inherited starter-test failure remains separately documented in the architecture. Physical devices, projector/classroom use, exhaustive accessibility, comprehensive exports and performance are outside this release's verification scope.

## Original deployment preservation

Original repository: `efodx/bezeg`. Original Pages publishing source: `gh-pages`, root directory. Original published branch revision before work: `1621a71a001dd2670fb1cdcf0fca378419e4ea24`. The final remote check confirmed it remains unchanged.

## Completed release checks and deployment

Seven focused Jest suites passed, 43 tests: route/catalog paths, namespaced storage, blocked-storage initialization, locale separation, preset import UI and established-file import/export roundtrip. CRA's default test discovery did not find tests under the local hidden `.publish-*` path, so the worker used the unchanged CRA config with a temporary `testRegex` selecting the relevant suites. The temporary runner was removed. A broader run passed 25/26 suites; the sole failure is the inherited `src/App.test.tsx` starter test outside a Router.

Delegated local smoke passed: legacy preset/language sentinels remained unchanged, first visit used Slovenian, and language wrote only the new namespace; deep route/refresh preserved query and fragment on the local preview; a Bézier point drag changed coordinates and drawing; the De Casteljau slider changed from 0.50 to 0.65 and updated its construction; rational weight 2.00 to 2.25 changed the curve; PH auxiliary editor opened with four coordinate inputs; two Bézier/PH navigation cycles retained one workspace/main board and disposed auxiliary boards. A guided lesson advanced through explanation/observation, allowed dragging, and restored the edited entry coordinate (0.65, 0.90) and geometry on exit. At 390 CSS pixels the graph remained visible without page overflow; keyboard reached language and slider controls with visible focus and changed a slider value. No console/page errors were observed. Two initial selector mistakes were corrected; an initial lesson SVG-signature discrepancy did not reproduce in the focused coordinate-and-SVG restoration check. The worker removed scripts and stopped its owned preview.

Live site: [Bezeg 2.0](https://efodx.github.io/bezeg-2.0/). Source release commit: `39ee1cb4244386c7f449f84aa5b96e016604a2f1`. Published `gh-pages` artifact commit: `d3757e4e004092a2d5f4600752142a45d86ad1c1`. Entry HTTP 200 and main bundle `main.d4a350b5.js` match the verified build; `.nojekyll` exists in the published branch.

Remote [Browser smoke CI](https://github.com/efodx/bezeg-2.0/actions/runs/37958234031) and [Pages build and deployment](https://github.com/efodx/bezeg-2.0/actions/runs/37958685554) both succeeded. Pages settings were verified as branch `gh-pages`, path `/`.

The original site's final remote branch revision still equals `1621a71a001dd2670fb1cdcf0fca378419e4ea24`, and its Pages settings still point to its original `gh-pages` root. The original deployment is unchanged.

## Actual hosted routing acceptance

Focused Playwright checks passed on `https://efodx.github.io/bezeg-2.0/` in isolated Chromium at 1280×900. A direct `/bezeg-2.0/bezier/decasteljau?smoke=hosted&other=a%26b#plot` request received the expected initial document 404, then the encoded-query fallback entry returned 200. The app restored the exact deep route, query value `other=a&b`, fragment `#plot`, and De Casteljau heading. Refresh repeated the successful sequence. Navigating to Demonstrations and browser Back restored that URL. An unknown route passed through the same fallback to the localized app error view with a home link to `/bezeg-2.0`. No asset HTTP errors, request failures, or JavaScript page errors occurred; the browser logged only the expected document 404s. Hosted check scripts and isolated contexts were cleaned up.

Publishing used the installed gh-pages library API after an `npm exec` CLI invocation failed before publication. The successful call used the verified `build/`, explicit new-repository URL, and `dotfiles: true`; no dependency or deployment-target change was needed.
