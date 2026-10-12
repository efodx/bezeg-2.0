# Automated smoke testing verification

Source: [accepted spec](../specs/automated-smoke-tests.md). Checked locally on 2026-10-09.

## Result and coverage

The production-built Chromium suite passed all 29 checks with one worker in 52.5 seconds: catalog link completeness, all 26 demonstration routes, SL/EN/SL retention of edited Bézier geometry and selection, and temporary preset save/change/reopen. Tests use isolated browser contexts. Routes come from the TypeScript catalog through AST inspection and are cross-checked against rendered catalog links. Each route requires a visible rendered JSXGraph curve as well as its heading and inspector; axes alone cannot satisfy the scene assertion. Workflow tests compare visible curve paths and editor coordinates, excluding selection handles from saved geometry.

Local verification used Node 22.1.0, Playwright 1.64.0, and its downloaded Chromium on Windows. TypeScript checking (`npx tsc --noEmit --pretty false`) and the production build passed. Existing CRA lint and Browserslist warnings remain; CI permits lint warnings only during the production build. Preview HTTP checks passed for the app entry, deep links, trailing-slash deep links, JavaScript assets, and missing-asset/non-app 404 responses. An occupied preview port was rejected rather than silently reused.

The complete local entry point, `npm run test:smoke`, also passed: production build followed by all 29 Chromium checks in 46.6 seconds for the browser phase. The later CI/CD change extended this workflow and its first hosted run passed; see the [CI/CD review](continuous-deployment.md).

A temporary test with an intentionally wrong heading exited with status 1 and generated `test-failed-1.png`, `trace.zip`, an error context, and an HTML report under ignored `test-results/failure-evidence/`. Its test/config files were removed and its preview port was closed. This verifies failure handling rather than representing an app regression; successful tests retain no screenshots/traces.

## Review and clean installation

Independent engineering and mathematical/UI test reviews found and resolved catalog parsing, lesson-link double counting, language-dependent selectors, inspector-tab selection, Windows launch quoting, scene-visibility coverage, and obsolete GitHub action-runtime issues. The workflow uses current Node 24 action runtimes, while the app/test job uses the tested Node 22.1.0 version. YAML and the agreed triggers, runner, permissions, cancellation, timeouts, failure-only artifact upload, and three-day retention were checked locally.

A task-only Playwright lockfile delta initially failed `npm ci` because the committed lock already had an inconsistent AJV 6/8 peer tree. An independently regenerated, bounded synchronization of that subtree passes isolated `npm ci --dry-run --ignore-scripts`. The original working lock changes were preserved; unrelated lock version metadata was excluded from staging. This dry run validates install consistency rather than claiming a complete fresh dependency install/build.

## Limits

At the time of this initial review, checks were local and the workflow had not yet been pushed or run on GitHub. The later CI/CD task activated the workflow and recorded its first hosted run in the [CI/CD review](continuous-deployment.md).

The historical CRA starter test remains outside this focused suite. The route smoke proves a visible scene loads, rather than mathematical identity of every route mapping. Dragging, sliders, lessons, narrow-screen/keyboard behavior, other browsers, full visual/accessibility review, physical devices, and deployed Pages behavior remain in [the complementary checklist](../smoke-tests.md). Runtime errors without a tested visible symptom are not comprehensively monitored by this initial suite.
