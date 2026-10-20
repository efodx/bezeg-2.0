# A repeatable process for GitHub Pages SPAs

The standalone learning pilot adds `/bezeg-2.0/learn`, `/bezeg-2.0/learn/bezier-curves` and stable section fragments. Activity links retain canonical graph routes and add validated `chapter=bezier-curves&activity=<id>` context. The existing project-base build and 404 fallback serve these additive routes. Invalid activity context is removed with history replacement while unrelated query/hash values are retained. Scene snapshots and reading offsets are visit-only; refresh starts the authored scene. Verify local production deep links separately from deployed Pages refresh/asset behavior; [pilot evidence](reviews/standalone-learning/implementation.md) records coverage.

The pilot's deployment check exposed that the 404 redirect discards history state. `history-entry-bridge.js` now passes only bounded chapter/section/activity IDs, a related Demonstration ID and router entry key/index through one-use session storage (60-second expiry, exact target match, remove before restore, allowlist again on restore). The app validates authored identities after bootstrap. No graph data, reading pixels or completion is stored. A versioned URI-encoded redirect payload preserves literal query values such as `~and~`; the decoder retains support for old workaround URLs. Storage denial and missing helper scripts retain canonical URL restoration. The local preview's normal 200 fallback cannot establish this behavior: `tests/history-entry-bridge.smoke.spec.cjs` exercises the built 404 response and document reload, with separate live Pages checks after deployment.

This playbook applies to static client-only apps. Bezeg supplies a concrete example, but its geometry, controls, and language choices are not requirements for another SPA. A browser app can keep local state and exchange files without a backend.

Guidance checked against official documentation on 2026-10-08. Tool versions and remote repository settings must be checked when a new project is created. This release copy targets `https://efodx.github.io/bezeg-2.0/`; the original Bezeg site remains at `/bezeg/` in its separate repository.

## 1. Record the deployment contract

Before scaffolding, fill in this small project record:

| Input | What to record | Bezeg today |
| --- | --- | --- |
| Hosting location | Project site, user/organization site, or custom domain | New project site at `/bezeg-2.0/`; original site remains at `/bezeg/` |
| Public base path | `/<repository>/` for a project site; normally `/` for a root site/domain | `/bezeg-2.0/` |
| Routing | Hash routes, history routes with a documented fallback, or generated static route files | History routes plus a 404 redirect pair |
| Persistence | Memory, local browser storage, file exchange | Local presets and files |
| Build and output | Tool, runtime, lockfile, build command, artifact directory | Vite, npm lockfile, `npm run build`, `build/` (configured `outDir`) |
| Publishing source | Actions workflow or publishing branch | Native GitHub Actions CD on `master`, activated 2026-10-09; legacy `gh-pages` branch retained for rollback |
| External runtime assets | CDN resources and their failure behavior | MathJax loaded from jsDelivr |

GitHub Pages serves static content rather than an application backend. [GitHub Pages creation guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 2. Choose a maintained setup that emits static files

For a small React + TypeScript SPA, evaluate Vite as a straightforward starting point. A typical new-project command is `npm create vite@latest example-spa -- --template react-ts`. Select the supported Node version from the chosen tool's documentation at setup time, then record it with the lockfile and scripts. [React's build-tool guide](https://react.dev/learn/build-a-react-app-from-scratch).

Keep app-shell navigation, domain logic, UI components, persistence, and hosting configuration distinguishable. Avoid embedding a particular repository name throughout domain code. Configure type checks explicitly; a bundler producing files does not prove type correctness.

Bezeg migrated from Create React App to Vite on 2026-10-13 ([ADR 0009](adr/0009-vite-build-and-vitest.md)). Its development command remains `npm start`.

## 3. Decide routing before adding pages

| Strategy | Benefit | Cost / acceptance checks |
| --- | --- | --- |
| Hash routing | The server always requests the actual app entry path | `#` URLs; account for interactions with other fragment uses |
| History routing + 404 redirect | Readable route paths on a static host | Maintain two coordinated scripts; an initial missing-file response triggers a redirect; verify query/hash restoration |
| Generate static route entry files | Existing route paths can resolve to actual files | Additional build/framework behavior; dynamic and unknown paths need an explicit strategy |

For a new simple SPA with no requirement for history URLs, hash routing is a reasonable default to evaluate because it reduces hosting-specific workaround code. For history URLs, explicitly document the fallback rather than assuming the host supports a universal rewrite.

Bezeg uses the [rafgraph SPA GitHub Pages workaround](https://github.com/rafgraph/spa-github-pages): `public/404.html` keeps one path segment for the project name and encodes the remaining path/query, while `public/index.html` restores them before the router runs. Retain upstream attribution and license when reusing the scripts. The router still needs its own unknown-route view. A missing asset must not be treated as a successful app route.

Bezeg's demonstration library uses the existing `/bezeg-2.0/demonstrations` route with optional URL-encoded `topic` and `q` filters. Changes preserve unrelated query parameters and the hash. Graph and `?learn=1` lesson deep links retain their existing routing. Validate filtered direct entry, refresh, Back/Forward, graph/lesson entry, and return navigation in the production preview and separately on Pages. Catalogue scroll/focus return state lives only in browser navigation state; it is not persistent data or part of a shared URL.

Optional motion previews are ordinary hashed WebM build assets shared by the catalog, picker and homepage carousel. Serve `.webm` as `video/webm`; the local smoke server includes that MIME mapping. Verify deployed MIME and actual browser decoding after publication. Only visible eligible previews attach video sources. Failed or unsupported playback retains the PNG poster. Local playback alone does not verify the deployed host.

During modernization, select a strategy based on URL requirements and simplicity. Breaking URL changes are permitted but must be communicated.

## 4. Align the base path across build, router, and fallback

For a Vite project site, set `base` to `'/<repository>/'`; root sites normally use `'/'`. Its default production output is `dist/`. [Vite's static deployment guide](https://vite.dev/guide/static-deploy).

Choose a router base/basename consistent with that hosting path. Prefer route definitions relative to that base instead of repeating a repository name in each route. Configure any history fallback for the same base. Resolve images, CSS, fonts, manifests, and lazy chunks through the build tool's base-aware asset handling.

Bezeg sets Vite's `base: '/bezeg-2.0/'` and keeps `build.outDir: 'build'`, hard-coded `/bezeg-2.0` routes, `%BASE_URL%` in its root `index.html`, and the redirect pair. Changing the base requires updating all of these together.

## 5. Build and verify the production artifact

Use a clean install from the committed lockfile (`npm ci`) and the recorded build command. Serve the resulting artifact under its real public base path. Development servers often hide missing-file routing issues with fallback behavior; a successful development refresh does not prove GitHub Pages deep links work.

For a Vite project, the standard scripts can expose `npm run build` and `npm run preview`. A preview server is useful for local inspection, but it is not proof of the host's 404 behavior. Verify the history fallback on a Pages environment or a static server that reproduces its missing-file behavior.

Check the home page, direct nested links and refreshes, browser back/forward, query strings, fragments, unknown routes, missing assets, and all base-path-sensitive files. Add app-specific flows such as local save/import and exports separately.

## 6. Publish one known artifact

For a new project, evaluate GitHub Actions as the repeatable publishing path: install from the lockfile, run relevant checks, build, configure Pages, upload the static artifact, and deploy it using the Pages environment. Configure the repository's Pages source accordingly. [GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Take action versions and permissions from official documentation when implementing. Restrict deployment to the intended branch or explicit release trigger; do not blindly copy a `main` trigger into a repository whose intended branch is `master`. Bezeg was on `master` when inspected. Record the commit and published URL, and review the same smoke checks on the hosted result.

If publishing built files from a branch, ensure that the publishing source has the appropriate `.nojekyll` handling when Jekyll processing is unwanted. A `.nojekyll` file only in the source repository is not proof it reaches the deployed artifact. See [GitHub's publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

This release copy's `npm run deploy` command runs its `predeploy` build and publishes `build/` through `gh-pages` with the explicit remote `https://github.com/efodx/bezeg-2.0.git`. The command cannot select the original repository through local Git remotes. Building alone does not publish. The initial verified production artifact was published on 2026-10-09 using the same gh-pages library with the explicit remote and dotfile options; at that release, Pages served the root of this repository's `gh-pages` branch. See [initial release verification](reviews/separate-project-site.md). Normal releases now use the gated Actions deployment below.

### Bezeg's gated Actions deployment

The [Browser smoke workflow](../.github/workflows/browser-smoke.yml) runs `npm ci`, TypeScript checking, the complete Vitest unit suite, one production build, and the production Chromium smoke suite for application changes. Compilation and all checks are blocking. It uploads that exact `build/` only after success on a push to `master` or a manual run on `master`, restricted to `efodx/bezeg-2.0`. A dependent job configures Pages and deploys the artifact through the `github-pages` environment. PRs never deploy. Only the deploy job receives Pages write and OIDC permissions. Obsolete CI jobs can be cancelled; Pages deployments are serialized without cancelling one already running.

Documentation-only PRs and pushes take a lightweight path: the `smoke` check still completes, but dependencies, application checks, build, browser installation, and deployment are skipped. The allowlist is Markdown under `docs/`, plus root `README.md`, `AGENTS.md`, and `CLAUDE.md`. Every changed path must qualify; renames consider both old and new paths. App code, assets, tests, CI/configuration, dependencies, mixed changes, and unrecognized paths retain the full pipeline. Missing comparison history and empty diffs also select full verification. PRs compare against their merge base; pushes compare against their previous head, including all commits in the push. The run summary explains the decision. Manual **Run workflow** always forces full verification and, on `master`, redeployment. See [CI scoping acceptance](specs/ci-change-scoping.md).

CD was activated on 2026-10-09 after owner authorization: the reviewed commits were pushed to `master`, Pages Source changed to **GitHub Actions**, and `master` was added to the `github-pages` environment branch allowlist. The existing `gh-pages` rule remains available for rollback. For recreating this setup, change **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, ensure the environment permits `master`, and dispatch **Browser smoke** on `master` if the initial push ran before the source change. This uses the ordinary Actions token and requires no personal access token. Follow [GitHub's custom workflow setup](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). See [local verification and hosted evidence](reviews/continuous-deployment.md).

After activation, use Actions deployment for normal releases. The retained `npm run deploy` script writes the legacy publishing branch and will not update the site while Pages uses the Actions source. Verify the hosted base URL, direct route and refresh, query/hash restoration, missing assets, and navigation after the first deployment: the local smoke server uses a direct SPA fallback and does not exercise Pages' 404 redirect.

For a code rollback, revert the release changes on `master` and let the same checks deploy the resulting artifact. Manual dispatch always builds the selected branch's current commit; this workflow intentionally refuses other branches. To return to branch publishing, first disable Actions CD, switch Pages Source back to **Deploy from a branch**, select `gh-pages` and `/`, and verify or manually publish a known-good artifact. The existing branch may contain an older release; inspect it before treating it as the rollback target.

## 7. Close the setup with a reusable checklist

- [ ] Record static-only constraints, base path, route strategy, build/output, and external assets.
- [ ] Commit a lockfile and documented development, build, and relevant check commands.
- [ ] Verify production assets and direct-route behavior under the real base path.
- [ ] Confirm the publishing source, branch/trigger, and artifact path agree.
- [ ] Record the release commit and hosted smoke-check results.
- [ ] Document how to redeploy a prior known-good artifact or commit.
- [ ] Keep domain-specific behavior in a separate capability map and guardrails.

Once a setup has been exercised successfully, extract a starter template from that implementation. This playbook is the process specification; it is not yet a validated scaffold or installed deployment workflow.
