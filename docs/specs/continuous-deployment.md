# Continuous integration and Pages deployment

Requested on 2026-10-09: inspect current CI and add CD where the static hosting contract supports it.

## Scope and acceptance

- Keep the existing `Browser smoke` workflow and `smoke` job identity, Ubuntu runner, Node 22.1.0, npm lockfile, master PR/push/manual triggers, bounded timeouts, and three-day failure evidence.
- Add explicit TypeScript and complete non-watch CRA unit tests before building. Existing CRA build lint warnings may remain allowed; type, unit, compilation, and browser failures must block deployment.
- Build once and run the existing production Chromium tests on that build. Only successful pushes to `master`, or manual runs on `master`, may upload and deploy that same `build/` artifact. Pull requests and other refs never publish.
- Use GitHub's native Pages artifact/deploy actions with the `github-pages` environment. Keep global permissions read-only; grant `pages: write` and `id-token: write` only to the deployment job. Do not use a personal token, branch push, or the manual `gh-pages` command in CI.
- Serialize Pages deployment without interrupting an in-flight deployment; retain cancellation of obsolete CI per PR/ref.
- Preserve `/bezeg-2.0`, the existing 404 redirect pair, and manual scripts. Document the one-time Pages source switch from `gh-pages` branch publishing to GitHub Actions, activation, rollback, and the distinction between local verification and a hosted run.
- The initial setup commits local changes without pushing, publishing, or changing remote settings. Subsequent owner authorization on 2026-10-09 extends completion to pushing the reviewed commits, activating native Pages CD, and verifying the first hosted run.

## Verification

Inspect workflow YAML and event/branch/permission/dependency conditions. Run TypeScript, all unit tests, production build, and the production Chromium suite. Check that the artifact includes `index.html`, `404.html`, and base-path assets. Record actual current hosted CI status separately from local results. No app runtime behavior changes are required.

Implementation: [workflow task](../tasks/continuous-deployment/implement-pages-workflow.md).
