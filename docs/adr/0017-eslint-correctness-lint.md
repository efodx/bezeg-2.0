# Lint for correctness with ESLint and a suppression baseline

Accepted on 2026-10-25. `just lint`, `just check` and the Browser smoke workflow run ESLint 10 with the flat config in `eslint.config.mjs`. See the [spec](../specs/agent-guardrails.md).

[ADR 0009](0009-vite-build-and-vitest.md) removed Create React App's built-in lint run. Since then, `tsc` has been the only static check, and it covers `src/` alone. The Playwright specs and helpers in `tests/` and the Node tooling in `scripts/` and `tools/` are CommonJS that nothing checks. An undefined variable in a smoke row was caught only by review.

Rules:

- `.cjs` files: `@eslint/js` recommended (including `no-undef` and `no-unused-vars`) with Node and browser globals, since `page.evaluate` callbacks run in the page.
- TypeScript in `src/`: `typescript-eslint` recommended and `eslint-plugin-react-hooks` recommended, with `exhaustive-deps` raised to an error.
- Everywhere: `eqeqeq` in `smart` mode, and errors for unused disable directives. A leading `_` marks an intentionally unused value.
- `@typescript-eslint/no-explicit-any` is off. Its 961 existing uses are style debt, not a defect class this change targets.

Violations that predate the rules (59 files, mainly `prefer-const`, unused variables, and ten `exhaustive-deps` cases in effects such as `GuidedLesson.tsx`) are recorded in `eslint-suppressions.json` instead of being fixed here. New code must pass. ESLint fails when a recorded suppression no longer occurs, so fixing one requires `npx eslint . --prune-suppressions`.

The alternatives were these:

- Type-check the `.cjs` files with `checkJs` in a second tsconfig. That catches undefined names but reports Playwright's loosely typed helpers as errors, and it adds nothing for React hooks.
- Biome or oxlint. Both are faster, but they reimplement only part of the React hooks rule set that `eslint-plugin-react-hooks` maintains, and each adds a configuration model of its own.
- Fix every existing violation before enabling the rules. Several hook-dependency changes alter effect timing in the lesson runtime, so they need their own review rather than a guardrail change.

Consequences:

- Five dev dependencies, pinned exactly: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` and `globals`. The React hooks plugin brings Babel into the lockfile.
- `just check` takes slightly longer, and lint failures stop it before the unit tests.
- Users see no difference: routes, the build output, and stored presets are unchanged.
