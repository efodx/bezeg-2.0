# CI/CD verification

Source: [continuous deployment spec](../specs/continuous-deployment.md). Checked on 2026-10-09.

## Current hosted CI

The public GitHub API reports the latest [Browser smoke run](https://github.com/efodx/bezeg-2.0/actions/runs/37958234031) completed successfully at `39ee1cb4244386c7f449f84aa5b96e016604a2f1`. Its install, Chromium installation, build, and smoke steps all passed; failure evidence was skipped. The latest [Pages branch build and deployment](https://github.com/efodx/bezeg-2.0/actions/runs/37958685554) also succeeded, at publishing-branch commit `d3757e4e004092a2d5f4600752142a45d86ad1c1`. The remote default branch is `master` and Pages is enabled.

The first two runs above predate activation of this workflow. The first hosted run of the new gated CI/CD workflow is recorded under [activation and remaining coverage](#activation-and-remaining-coverage). Before this task, the current local branch was five commits ahead of `origin/master`, with a clean working tree. Remote Pages source was previously verified as `gh-pages` at `/` in the [release review](separate-project-site.md); the anonymous Pages configuration endpoint requires authentication and returned 404 in this inspection.

## Change and review

The existing workflow now checks TypeScript and the full CRA unit suite before build and browser smoke. It uploads the checked production artifact and deploys through GitHub's native Pages actions only on eligible `master` runs. No personal token, publishing-branch push, dependency, app runtime, route, or preset change is introduced.

Handler review confirmed the build is not repeated for deployment, upload follows smoke, deployment depends on successful smoke, PRs receive no deployment permission, and only the deploy job has `pages: write` and `id-token: write`. Workflow cancellation moved to the CI job so a newer run cannot interrupt an active Pages deployment; the deployment concurrency group serializes releases. YAML parsing, trigger/permission/dependency assertions, and six scenarios for both upload and deployment conditions passed: master push, master dispatch, PR, other-branch dispatch, fork push, and failed checks. `git diff --check` passed.

## Local verification

- `npx tsc --noEmit --pretty false`: passed.
- `CI=true npm test -- --watchAll=false --runInBand`: all 151 tests in 34 suites passed.
- `CI=false npm run build`: passed with existing lint and outdated Browserslist warnings.
- `CI=true SMOKE_PORT=4198 npm run test:smoke:built`: all 34 Chromium checks passed in 1.5 minutes, including every demonstration route, language/selection retention, preset restore, ownership, and batch export.
- Artifact checks: `index.html`, `404.html`, and `asset-manifest.json` exist; the HTML points to `/bezeg-2.0/static/js/`, and the 404 script retains one project path segment.

The Windows filesystem sandbox blocked Jest's temporary-directory realpath lookup, so the successful unit run used approved execution outside that sandbox. The default browser preview port was already occupied; browser verification used an alternate port and approved execution outside the sandbox after the sandboxed run stalled. These local environment adjustments do not change the Ubuntu CI commands.

## Activation and remaining coverage

The initial setup was committed as `97f068e` without a push, remote setting change, or deployment. The owner then authorized Git setup and activation. Existing author identity and Git Credential Manager were already configured; `origin` targets `efodx/bezeg-2.0` and the original Bezeg remote has pushing disabled. A fresh fetch confirmed a fast-forward, and the handler pushed the six local commits to `origin/master` without forcing or rewriting history.

Authenticated API inspection confirmed Pages previously used `build_type: legacy`, source `gh-pages` at `/`, with a `github-pages` environment rule permitting only `gh-pages`. The handler added a `master` branch rule while preserving the original rule and switched Pages to `build_type: workflow`. The push started [the first gated CI/CD run](https://github.com/efodx/bezeg-2.0/actions/runs/37972465405) at `97f068e495e90f0232a27d62c1d5244bf238004d`. See [activation and rollback instructions](../github-pages-spa-playbook.md#bezegs-gated-actions-deployment).

The first hosted run completed successfully: both `smoke` and `deploy` passed. Its `npm ci`, TypeScript, unit tests, build, Chromium checks, artifact upload, and native Pages deployment succeeded. The live entry returned HTTP 200 and referenced `main.1ed82941.js`; that hosted bundle's SHA-256 exactly matched the tested local production bundle (`0BE3FB7C3A0BBECB0ADF4E087EFB253B80694D39DC50FDA3DF87D5E71ACA6A37`). A deliberately missing JavaScript asset returned HTTP 404.

The delegated hosted smoke lane was selected because the change activates production hosting. A GPT-6 Luna worker at Max reasoning checked the deployed revision in a fresh Codex In-app Browser tab at 1265×711 within the ten-minute budget. All selected checks passed:

| Hosted check | Observed result |
| --- | --- |
| Entry/catalog and graph families | Home opened the catalog with 26 demonstrations; Bézier, rational, C¹ spline, and cubic PH showed headings, plotted curves, and inspectors. |
| Polynomial edit | Keyboard coordinate editing changed `p2.x` from 2 to 4 and visibly reshaped the curve. A screen-coordinate drag attempt did not register; drag coverage is incomplete. |
| Deep link and refresh | `/bezeg-2.0/bezier/curve?smoke=deep-link#curve` retained path, query, and fragment after reload with its graph mounted. |
| Navigation/back | Bézier → PH → browser back succeeded twice, with one graph and inspector on return. |
| Unknown route | An unknown path preserved query/fragment and showed the localized error view with a home link. |
| Assets | Handler HTTP evidence confirmed the matching bundle and missing-script 404 above. |

The worker closed the temporary tab, saved no presets, and made no file changes. Console logs were unavailable through the browser interface. Language/preset/lesson/narrow-screen baseline checks were skipped as outside the hosting change; the existing automated suite supplies the recorded language/preset coverage. Physical-device, projector, full accessibility, and complete drag coverage remain unverified.

Hosted direct links, refreshes, query/hash restoration, unknown routes, missing assets, and navigation need separate verification because the local smoke server uses an SPA fallback rather than Pages' 404 redirect. Physical devices, projector review, and comprehensive accessibility remain outside this workflow task. Existing CRA/React test warnings remain visible and were not repaired as part of CI/CD setup.
