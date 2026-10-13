# Build with Vite and test with Vitest on Node.js 24

Accepted on 2026-10-13. Bezeg builds, serves, and previews with Vite 8 and `@vitejs/plugin-react`, runs unit tests with Vitest 5 in jsdom, and requires Node.js 24 (`.nvmrc`). Create React App (`react-scripts` 5) and Jest are removed. See the [spec](../specs/vite-migration.md).

Create React App is deprecated and pinned the project to TypeScript 4.9, Jest 27, and webpack 5 without upstream maintenance. The roadmap named Vite as the first candidate and asked that the change stay separate from renderer and UI work.

The alternatives were these:

- Keep CRA. It leaves the build without upstream fixes and blocks TypeScript 5.
- Use Vite but keep Jest through a standalone Babel or ts-jest configuration. That keeps two transform pipelines, and CRA's preconfigured Jest would have to be rebuilt by hand anyway.
- Pin Vite 6 and Vitest 3, which still run on Node 22.1. That would replace one unmaintained toolchain with another that is already superseded.
- Adopt a static-export framework. That changes routing and app structure, which goes beyond a build-tool change.

Vitest shares Vite's transform and config, and its API maps nearly one-to-one from Jest's. The test conversion was mostly mechanical, and the suite kept every test.

Consequences:

- Contributors and CI move from Node 22.1.0 to Node 24.
- TypeScript moves to 5.9 with bundler resolution. `tsc` remains the type check, because Vite only transpiles.
- CRA's built-in ESLint run is lost until a separate ESLint setup is added.
- The base path `/bezeg-2.0/`, routes, `build/` output, GitHub Pages redirect pair, and stored presets are unchanged, so users see no difference.
