# Automated browser smoke tests

Status: implemented and hosted in GitHub Actions. The initial local evidence is in the [smoke-test review](../reviews/automated-smoke-tests.md); hosted deployment evidence is in the [CI/CD review](../reviews/continuous-deployment.md).

Confirmed on 2026-10-09: add a small Playwright suite and GitHub Actions workflow, complementing [agent smoke testing](smoke-testing.md).

## Accepted scope

- Test the actual production build served locally under `/bezeg`, without deployment or paid services.
- In isolated Chromium contexts, check all catalog demonstration routes render their expected heading, visible graph, and shared controls; check SL/EN switching preserves edited Bézier geometry and selection; check temporary preset save/change/reopen restores the saved geometry.
- Use observable outcomes and stable accessible UI selectors. A mounted SVG alone does not establish scene retention. Derive routes from the maintained catalog or verify a bounded list against it; new routes must not silently escape coverage.
- Add local commands for building/running and rerunning against an existing build. Keep test tooling outside the app's TypeScript compilation and avoid changing mathematical or user-visible behavior just to test it.
- Use one standard Ubuntu runner with Chromium on pull requests targeting `master`, pushes to `master`, and manual dispatch. Cancel outdated runs for the same PR/ref. Set bounded job and suite timeouts; fail the job on build or test failures.
- Retain failure screenshots/traces and reports for three days. Upload artifacts on failure only, use minimal workflow permissions, and require no credentials beyond the normal Actions token.
- Preserve unrelated working-tree changes, including the already modified package lock. Commit only this task's lockfile delta.

Clean-install verification exposed a pre-existing inconsistency in the committed AJV peer-dependency tree: adding Playwright alone leaves `npm ci` failing before tests can run. A bounded, independently generated lockfile synchronization needed for clean CI is part of this task. Preserve the original working lock edits and distinguish required peer-tree repair from unrelated metadata changes when staging.

## Verification and completion

Run TypeScript checking, a production build, and the new Chromium suite. Demonstrate that a violated assertion fails the suite and produces failure evidence, using a temporary test or isolated verification rather than shipping an intentional failure. Check workflow syntax, triggers, timeout, permissions, cancellation, and retention. Review package/lock consistency and production server routing/assets. Record local evidence separately from an actual hosted Actions run, which requires pushing and is outside this assignment.

The historical CRA starter test is unrelated and is not silently included in this focused workflow or claimed as passing. Dragging, sliders, lessons, other browsers, physical devices, full accessibility, visual baselines, and deployed Pages verification remain follow-up coverage. Keep the agent checklist for these and for exploration of changed workflows.

Implementation and verification are complete; remaining browser/device coverage is tracked in [the smoke checklist](../smoke-tests.md).
