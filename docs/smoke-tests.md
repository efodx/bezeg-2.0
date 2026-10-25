# Bezeg browser smoke checklist

Use with `$smoke-tester` after meaningful app changes. The skill is maintained as a project skill at [.agents/skills/smoke-tester/SKILL.md](../.agents/skills/smoke-tester/SKILL.md), where Codex discovers it; Claude Code discovers it through `.claude/skills/smoke-tester/SKILL.md`, which points to the maintained copy. No personal installation is needed. See [the bounded spec](specs/smoke-testing.md).

The handler dispatches one GPT-6 Luna worker at Max reasoning with a default ten-minute budget including setup. Keep the baseline below, and add or substitute demonstration-specific checks when the change warrants it. Account for every selected check in the report; budget exhaustion means skipped coverage.

## Automated coverage

The first [automated suite](specs/automated-smoke-tests.md) covers all catalog demonstration routes, language switching with edited geometry and selection, and temporary preset save/change/reopen. It exercises the production build in isolated Chromium contexts. Use sufficient passing evidence from that suite for the same checkout and environment, then spend the agent's budget on the remaining baseline and changed workflows. Route loading does not establish dragging, specialized controls, lesson behavior, narrow-screen access, or keyboard behavior.

Guided lessons have a data-driven suite in `tests/guided-lessons.smoke.spec.cjs` with shared helpers in `tests/lesson-smoke-helpers.cjs`. Each allowlisted lesson is one row in its `LESSONS` table (schema in the spec's header comment). Every row gets two walks to completion: (1) a Slovenian desktop walk that probes every frame (`stepProbe`); (2) an English 390-pixel walk that checks Next/Exit placement and, on calculation and notation frames, horizontal page overflow and that every notation and worked-example block lies inside the viewport. Both walks click Next with a real pointer on every frame, require visible board points inside the board view (`offscreenSteps` excepted), assert the exact in-order frame sequence, and fail explicitly when the frame guard expires. A single walk that switched language and width per frame measured slower than the two navigations (see [test consolidation coverage](tasks/test-consolidation/coverage.md), task 3). An English Exit/re-entry test (short Back/Next check, user-state restore, two re-entry rounds with a stable board snapshot) runs only on the rows in `EXIT_SAMPLE`, one per restoration mechanism; `src/learning/runtime/lessonRestorationContract.tsx` covers restoration for every lesson in the unit suite. Observation frames (observe button, unlocked graph, compact overlay tab reopening the same frame, Next hit-test) run once in the `Observation flow` block, and the desktop, projection, short-screen, 320-pixel and enlarged-text layouts plus Exit dialog focus run on Taylor in `tests/lesson-experience-checks.cjs`. Behaviour of the shared `GuidedLesson` runtime that does not depend on lesson content (header language switch, Tab+Enter on Next, lossless full Back walk) runs once in the `Shared lesson runtime` block on the `bernstein`, `farin`, and `spline-g1` rows. When a lesson is added, add its row in the same change instead of writing a new spec. While iterating on spec changes, run only that file against an existing build; run the full suite once per batch. `playwright.config.cjs` sets `reducedMotion: 'reduce'` (the lesson runtime skips its 220 ms overlay hand-off) and runs `min(6, max(2, cpus - 2))` workers locally, 3 on CI; there are no retries.

GitHub Actions runs this focused suite on pull requests targeting `master`, pushes to `master`, and manual dispatch. Failures fail the job; failure reports, screenshots, and traces are retained for three days. Local checks and actual hosted Actions results must be reported separately.

For local setup, install the locked dependencies with `npm ci`, then install Chromium with `npx playwright install chromium` (Linux may need `--with-deps`). Run `npm run test:smoke` to build and test, or `npm run test:smoke:built` to test a production build you just generated. The latter command does not rebuild, so record build provenance when using it as verification. The test runner starts and disposes its own loopback preview; an occupied test port must fail rather than silently reuse a different checkout. Inspect the local HTML report with `npx playwright show-report`.

The preview defaults to port 4173; set `SMOKE_PORT` to a free port if another local service owns it. The config and preview server use the same value. Other ports write `test-results-<port>/` and `playwright-report-<port>/`, so concurrent runs on separate ports keep separate artifacts.

The suite and CI have time limits. CI installs the Chromium browser only (system packages through apt only when a library is missing), runs four shards of three workers each against one shared build, and uploads failure artifacts only, one set per failing shard. Playwright's `--shard` balances by test count while a guided-lesson test takes about four times as long as the others, so three shards each run a third of `guided-lessons.smoke.spec.cjs` (`--shard=N/3`) and the fourth runs every other spec (`SMOKE_TEST_IGNORE` in the Playwright config); a new spec file lands in the fourth. TypeScript, unit tests, build errors, and browser failures block deployment. Documentation-only changes skip application checks and deployment while still completing the `smoke` check; application/configuration changes and manual runs retain full verification. See [the CI scoping policy](specs/ci-change-scoping.md) and [deployment guide](github-pages-spa-playbook.md#bezegs-gated-actions-deployment). Review failures rather than adding broad retries or suppressing runtime errors.

See [initial verification](reviews/automated-smoke-tests.md) for local results, review findings, and coverage limits.

## Setup

Read [UI functionality](ui-functionality.md) for control behavior and `package.json` for current scripts. Resolve representative paths from `src/demonstrations.ts` and lesson availability from `src/learning/runtime/lessonCatalog.ts`. The app base is `/bezeg-2.0`; use the actual local preview origin supplied by the handler rather than assuming a port. Confirm preview ownership and report whether the run exercises production or development code.

Prefer a fresh browser session/origin for preset checks. Use a uniquely named `smoke-<run-id>` preset, preserve existing data, and restore shared-session state. The baseline does not import or replace existing collections. The 2.0 app stores presets under its release namespace; original-site preset files should be exercised only through explicit import.

## Baseline

| Check | Actions and expected observation |
| --- | --- |
| Entry and graph families | Open `/bezeg-2.0`, follow the demonstrations link, then open `bezier`, `rational`, `spline-c1`, and `ph-cubic` by catalog ID. Each displays its expected heading, visible curve/board, and usable inspector. Account for PH auxiliary boards as intentional. |
| Point and slider response | On polynomial Bézier, drag a free control point and observe the point and curve move. On `decasteljau`, change the parameter slider and observe its value and construction update. Record actual before/after behavior. |
| Family-specific controls | Change one rational weight and observe the curve respond. On PH, open the generating-point editor and confirm its auxiliary board and controls are usable. |
| Navigation and lifecycle | Navigate from a polynomial route to PH and back, twice. Boards and controls remain usable; no duplicate workspace or unexpected auxiliary board remains. Recheck one edit after returning. |
| Language retains scene | Edit and select an eligible Bézier curve; switch SL to EN and back. Labels change while the edited points, selection, and board persist. Restore the initial language if the session is shared. |
| Preset save/reopen | Save edited geometry under the unique temporary name, change the scene, and reopen that preset. Geometry returns to the saved values. Delete only the temporary preset and restore the previous selection. |
| Guided lesson | On a currently supported route, capture an edited scene and enter the lesson. Reach an observation frame, exercise a supported graph action, reopen the compact overlay tab, advance inside the lesson, then exit. Navigation and graph action respond; exit restores the entry scene. |
| Narrow viewport and keyboard | At about 390 CSS pixels, confirm graph and essential controls are reachable without horizontal page overflow. Use Tab and Enter/Space to operate an inspector control and language selector; confirm visible focus and resulting behavior. This is browser viewport/keyboard evidence, not physical-phone testing. |

## Change-specific additions

- For the demonstration library, combine topic and forgiving text search, clear zero results, refresh a filtered URL, and use Back/Forward. Open a card after scrolling and verify both Back and the workspace collection breadcrumb restore filters, scroll, and card focus. Check the family breadcrumb separately.
- For the workspace picker, edit/select a curve and record its board identity, points, view, and drafts. Open, filter, cancel, and choose the current graph; those values must persist. During playback verify that entry pauses at the current frame and cancellation leaves it paused. Repeat with a lesson and Presentation mode; verify focus containment, background isolation, current marker, narrow-screen topic selection, reduced height, and deliberate navigation disposal.
- For persistence changes, use isolated storage to test export/import round-trip and actionable rejection of an invalid file; verify cancellation preserves data.
- For lesson changes, test the affected lesson action, backward navigation, scene restore, and animation cancellation where applicable.
- For export changes, download and inspect the affected SVG/PNG output rather than treating a click as success.
- For routing/hosting changes, check production asset loads, direct deep links and refresh, unknown routes, and relevant query/hash behavior. A local preview does not establish GitHub Pages behavior.

## Evidence and limits

Return one row per selected check using passed, failed, blocked, or skipped, with observed evidence. Include reproduction steps for failures, preview/revision/dirty state, elapsed time, viewport, tool limitations, and cleanup. If browser interaction is unavailable, report blocked coverage.

This checklist complements required mathematical checks, TypeScript checks, production builds, and change-specific verification. Derive commands from current repository scripts and guidance. Report any existing test failure separately; neither a known failure nor a smoke pass excuses a new one.
