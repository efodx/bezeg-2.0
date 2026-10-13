# Vite migration

Status: implemented on 2026-10-13. Decision: [ADR 0009](../adr/0009-vite-build-and-vitest.md).

Requested on 2026-10-13: move from Create React App (CRA) to Vite. This carries out roadmap item 2's build-tool step while keeping React, JSXGraph, Bootstrap, mathematics, routes, and hosting unchanged.

## Scope

- Replace `react-scripts` with Vite 8 and `@vitejs/plugin-react` for `npm start`, `npm run build`, and `npm run preview`.
- Replace CRA's Jest with Vitest 5 (jsdom, globals, `mockReset` in place of CRA's `resetMocks`; Vitest restores a `vi.fn(impl)` implementation where Jest removed it, so mocks can only keep more behavior than before). Convert `jest.*` calls to `vi.*`; replace `jest.requireActual` and `jest.isolateModules` + `require` with `vi.importActual` and `vi.resetModules` + `import()`.
- Move `public/index.html` to the root `index.html`; replace `%PUBLIC_URL%/` with `%BASE_URL%`. Keep `public/` for static files (404 redirect, icons, manifest).
- Keep the `/bezeg-2.0/` base, hard-coded routes, redirect pair, and the `build/` output directory used by CI, the smoke server, and `npm run deploy`.
- Raise Node.js from 22.1.0 to 24 (`.nvmrc` 24.21.0, `engines` `>=24.15.0`), because current Vite, Vitest, and jsdom do not support 22.1. Upgrade TypeScript to 5.9 (`moduleResolution: bundler`) and `@types/node` to 24, which the new toolchain requires.
- Out of scope: ESLint (see below), lazy route splitting, renderer or UI changes, and the dev-only PH lesson remount error noted below.

## Acceptance criteria

1. `npx tsc --noEmit --pretty false` passes, and a stray `jest.` reference fails type checking.
2. All unit tests pass under Vitest with the same suite and test counts as Jest on the previous commit.
3. `npm run build` emits `build/index.html`, `404.html`, and `/bezeg-2.0/`-prefixed assets; the lazily loaded MathJax SVG export code stays in separate chunks.
4. The production Playwright smoke suite passes against the Vite build.
5. Representative routes render the same as the CRA build at desktop and phone widths.
6. `npm start` serves deep links under `/bezeg-2.0/` without new console errors compared with the CRA dev server.
7. CI uses the `.nvmrc` Node version and the new test command; contributor documentation describes the new commands.

## Verification (2026-10-13)

- Baseline on `c7486c5` with CRA: 91 Jest suites, 1224 tests passed; TypeScript passed.
- After migration on Node 24.21.0: TypeScript passed; Vitest ran 91 files and 1224 tests, all passing. With type roots limited to this checkout, a probe file using `jest.fn` failed with TS2304.
- `vite build` succeeded in about 6 seconds. MathJax export modules are separate chunks. The only warning is a direct `eval` inside JSXGraph's own JessieCode parser.
- The production Playwright suite passed (141 tests).
- Screenshots of the CRA and Vite builds were compared at 1440×900 and 390×844 on the home page, Bézier curve, De Casteljau, Farin points, C2 spline, quintic PH, integral, and the Bernstein lesson. All 16 pairs had 0.000% differing pixels. The CSS bundle differs only in minification. CRA's cssnano kept an extra default Bootstrap `:root` block that the later themed block overrides.
- The dev server rendered the home page and De Casteljau without console errors. `/ph/quintic?learn=1` throws `Cannot read properties of undefined (reading 'suspendRedraw')` during React Strict Mode's development remount on both Vite and the CRA dev server. It is pre-existing and does not occur in production builds. This change does not fix it.

## Consequences and follow-ups

- Contributors need Node.js 24.15 or newer. `npm test` watches in an interactive terminal and runs once otherwise; CI-style flags `--watchAll=false --runInBand` no longer apply.
- CRA ran ESLint (`react-app` config plus the `semi` rule) during start and build. Nothing runs ESLint now. Adding a flat ESLint config with TypeScript and React Hooks rules is a separate follow-up.
- The unit suite takes about 47 seconds rather than Jest's 25 because Vitest creates a jsdom environment per file. Pool tuning is a possible follow-up.
- The Bézier drawing benchmark build (`scripts/bezier-benchmark/build.cjs`) depended on webpack and Babel that CRA installed transitively; it now uses Vite's API. The harness itself has not compiled since `e35075f` removed `VisibilityContext`, so the ported build is unverified end to end until the harness is updated.
- Routes and stored presets are unchanged.
