# A repeatable process for GitHub Pages SPAs

This playbook applies to static client-only apps. Bezeg supplies a concrete example, but its geometry, controls, and language choices are not requirements for another SPA. A browser app can keep local state and exchange files without a backend.

Guidance checked against official documentation on 2026-10-08. Tool versions and remote repository settings must be checked when a new project is created.

## 1. Record the deployment contract

Before scaffolding, fill in this small project record:

| Input | What to record | Bezeg today |
| --- | --- | --- |
| Hosting location | Project site, user/organization site, or custom domain | README points to a project site at `/bezeg/` |
| Public base path | `/<repository>/` for a project site; normally `/` for a root site/domain | `/bezeg/` |
| Routing | Hash routes, history routes with a documented fallback, or generated static route files | History routes plus a 404 redirect pair |
| Persistence | Memory, local browser storage, file exchange | Local presets and files |
| Build and output | Tool, runtime, lockfile, build command, artifact directory | CRA, npm lockfile, `npm run build`, `build/` |
| Publishing source | Actions workflow or publishing branch | Local `gh-pages` script exists; remote settings unverified |
| External runtime assets | CDN resources and their failure behavior | MathJax loaded from jsDelivr |

GitHub Pages serves static content rather than an application backend. [GitHub Pages creation guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 2. Choose a maintained setup that emits static files

For a small React + TypeScript SPA, evaluate Vite as a straightforward starting point. A typical new-project command is `npm create vite@latest example-spa -- --template react-ts`. Select the supported Node version from the chosen tool's documentation at setup time, then record it with the lockfile and scripts. [React's build-tool guide](https://react.dev/learn/build-a-react-app-from-scratch).

Keep app-shell navigation, domain logic, UI components, persistence, and hosting configuration distinguishable. Avoid embedding a particular repository name throughout domain code. Configure type checks explicitly; a bundler producing files does not prove type correctness.

For Bezeg, this is a migration candidate, not a command to replace the existing app. Its current development command remains `npm start`.

## 3. Decide routing before adding pages

| Strategy | Benefit | Cost / acceptance checks |
| --- | --- | --- |
| Hash routing | The server always requests the actual app entry path | `#` URLs; account for interactions with other fragment uses |
| History routing + 404 redirect | Readable route paths on a static host | Maintain two coordinated scripts; an initial missing-file response triggers a redirect; verify query/hash restoration |
| Generate static route entry files | Existing route paths can resolve to actual files | Additional build/framework behavior; dynamic and unknown paths need an explicit strategy |

For a new simple SPA with no requirement for history URLs, hash routing is a reasonable default to evaluate because it reduces hosting-specific workaround code. For history URLs, explicitly document the fallback rather than assuming the host supports a universal rewrite.

Bezeg uses the [rafgraph SPA GitHub Pages workaround](https://github.com/rafgraph/spa-github-pages): `public/404.html` keeps one path segment for the project name and encodes the remaining path/query, while `public/index.html` restores them before the router runs. Retain upstream attribution and license when reusing the scripts. The router still needs its own unknown-route view. A missing asset must not be treated as a successful app route.

During modernization, select a strategy based on URL requirements and simplicity. Breaking URL changes are permitted but must be communicated.

## 4. Align the base path across build, router, and fallback

For a Vite project site, set `base` to `'/<repository>/'`; root sites normally use `'/'`. Its default production output is `dist/`. [Vite's static deployment guide](https://vite.dev/guide/static-deploy).

Choose a router base/basename consistent with that hosting path. Prefer route definitions relative to that base instead of repeating a repository name in each route. Configure any history fallback for the same base. Resolve images, CSS, fonts, manifests, and lazy chunks through the build tool's base-aware asset handling.

Bezeg currently uses CRA's `homepage: "/bezeg"`, hard-coded `/bezeg` routes, `%PUBLIC_URL%` in its HTML template, and the redirect pair. Migrating to Vite must replace CRA-specific HTML substitutions and review script, style, and public-file handling. Merely changing `homepage` does not complete a migration.

## 5. Build and verify the production artifact

Use a clean install from the committed lockfile (`npm ci`) and the recorded build command. Serve the resulting artifact under its real public base path. Development servers often hide missing-file routing issues with fallback behavior; a successful development refresh does not prove GitHub Pages deep links work.

For a Vite project, the standard scripts can expose `npm run build` and `npm run preview`. A preview server is useful for local inspection, but it is not proof of the host's 404 behavior. Verify the history fallback on a Pages environment or a static server that reproduces its missing-file behavior.

Check the home page, direct nested links and refreshes, browser back/forward, query strings, fragments, unknown routes, missing assets, and all base-path-sensitive files. Add app-specific flows such as local save/import and exports separately.

## 6. Publish one known artifact

For a new project, evaluate GitHub Actions as the repeatable publishing path: install from the lockfile, run relevant checks, build, configure Pages, upload the static artifact, and deploy it using the Pages environment. Configure the repository's Pages source accordingly. [GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Take action versions and permissions from official documentation when implementing. Restrict deployment to the intended branch or explicit release trigger; do not blindly copy a `main` trigger into a repository whose intended branch is `master`. Bezeg was on `master` when inspected. Record the commit and published URL, and review the same smoke checks on the hosted result.

If publishing built files from a branch, ensure that the publishing source has the appropriate `.nojekyll` handling when Jekyll processing is unwanted. A `.nojekyll` file only in the source repository is not proof it reaches the deployed artifact. See [GitHub's publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Bezeg's declared local `npm run deploy` command runs its `predeploy` build and publishes `build/` through `gh-pages`. Building alone does not publish. Changing this pipeline is future implementation work; no deployment was performed while writing these docs.

## 7. Close the setup with a reusable checklist

- [ ] Record static-only constraints, base path, route strategy, build/output, and external assets.
- [ ] Commit a lockfile and documented development, build, and relevant check commands.
- [ ] Verify production assets and direct-route behavior under the real base path.
- [ ] Confirm the publishing source, branch/trigger, and artifact path agree.
- [ ] Record the release commit and hosted smoke-check results.
- [ ] Document how to redeploy a prior known-good artifact or commit.
- [ ] Keep domain-specific behavior in a separate capability map and guardrails.

Once a setup has been exercised successfully, extract a starter template from that implementation. This playbook is the process specification; it is not yet a validated scaffold or installed deployment workflow.
