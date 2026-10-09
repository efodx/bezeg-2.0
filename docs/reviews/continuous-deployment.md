# CI/CD verification

Source: [continuous deployment spec](../specs/continuous-deployment.md). Checked on 2026-10-09.

## Current hosted CI

The public GitHub API reports the latest [Browser smoke run](https://github.com/efodx/bezeg-2.0/actions/runs/37958234031) completed successfully at `39ee1cb4244386c7f449f84aa5b96e016604a2f1`. Its install, Chromium installation, build, and smoke steps all passed; failure evidence was skipped. The latest [Pages branch build and deployment](https://github.com/efodx/bezeg-2.0/actions/runs/37958685554) also succeeded, at publishing-branch commit `d3757e4e004092a2d5f4600752142a45d86ad1c1`. The remote default branch is `master` and Pages is enabled.

These are existing hosted runs, not evidence that the new workflow has run. Before this task, the current local branch was five commits ahead of `origin/master`, with a clean working tree. Remote Pages source was previously verified as `gh-pages` at `/` in the [release review](separate-project-site.md); the anonymous Pages configuration endpoint requires authentication and returned 404 in this inspection.

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

The new workflow is committed locally, with no push, remote setting change, or deployment. Follow the [activation and rollback instructions](../github-pages-spa-playbook.md#bezegs-gated-actions-deployment): push the reviewed commits to `master`, switch Pages Source to GitHub Actions, permit `master` in the `github-pages` environment, and run the workflow. Until the source switches, existing branch publishing remains the documented production path.

The first hosted run of the new type/unit/CD steps remains unverified. Hosted direct links, refreshes, query/hash restoration, unknown routes, missing assets, and navigation must be checked after activation; the local smoke server uses an SPA fallback rather than Pages' 404 redirect. Physical devices, projector review, and comprehensive accessibility remain outside this workflow task. Existing CRA/React test warnings remain visible and were not repaired as part of CI/CD setup.
