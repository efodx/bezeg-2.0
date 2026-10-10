# Working on Bezeg

Read [docs/README.md](docs/README.md) and the documents relevant to the change before editing the app. The agreed direction is in [docs/future-plan.md](docs/future-plan.md); [docs/guardrails.md](docs/guardrails.md) defines product and engineering constraints.

## Automatic implementation delegation

- For code implementation and fixes, automatically delegate bounded implementation tasks to subagents using **GPT-6 Luna with Max reasoning**. This is standing authorization; follow [the delegation workflow](docs/agent-workflow.md) for dispatch, ownership, review, and completion.
- The main chat remains the handler and final reviewer: it owns scope, coordination, acceptance, verification, and commits. Workers implement and return evidence for review.
- Workers execute their assigned slice and report to the main chat; further delegation requires an explicit assignment from the handler.
- Check the available spawn tool before dispatch. If it cannot select the exact requested model and effort, report the limitation and ask for a fallback choice before using another model. Continue independent planning and review work while waiting.

## Product constraints

- Bezeg is an educational curve app for students and educators.
- Keep it static and client-only: no backend, accounts, or server database. Browser-local presets and file import/export are supported.
- Prioritize desktop and classroom projection, with essential touch and keyboard workflows on smaller screens.
- Slovenian is the default app language. English support is planned; contributor documentation is in English.
- Keep the graph prominent, make controls understandable, and retain the elderflower identity.
- Breaking changes are allowed. Record their reason and user impact, including any change to routes or stored presets.

## Engineering practices

- Preserve mathematical meaning when changing evaluation, drawing, or constructions. Use relevant mathematical checks for affected operations.
- Measure representative dragging and slider interactions before selecting rendering optimizations or replacing JSXGraph. See [docs/performance-plan.md](docs/performance-plan.md).
- Keep hosting/app-shell concerns separate from mathematical features. Work toward geometry independent of React, JSXGraph, and graph-global cache state.
- Give boards, listeners, and auxiliary objects explicit ownership and disposal. Keep cache invalidation correct.
- Validate imported preset data and handle unsupported files with an actionable error.
- Treat typed localization calls as a known recurring TypeScript failure point. `t` in `src/localization/index.ts` uses a key-specific tuple (`TranslationArguments`): call `t('key')` only for messages without placeholders, and call `t('key', {value0: value})` (using the catalog's exact parameter names) for messages with placeholders. Before adding or changing a message, inspect `src/localization/sl.ts` and keep `en.ts` in lockstep; do not silence TS2345 with `any`, casts, or a weakened message type. Run `npx tsc --noEmit --pretty false` and the production build after localization changes, and explicitly recheck this failure mode when adding lesson or UI copy.
- Lesson prose is plain text: MathJax typesets only `\(...\)` (inline) and `\[...\]` (display) segments. Wrap every symbol, subscript, superscript, or formula in lesson text fields in `\(...\)` (doubled backslashes in TS string literals), use `{,}` for Slovenian decimal commas inside math, and keep `latex`/`calculationLatex`/`resultLatex` fields undelimited. `src/learning/content/lessonMathNotation.test.ts` enforces this for every lesson; never weaken or skip it to make new content pass.
- Keep changes bounded. Evaluate build-tool, renderer, and UI migrations separately.
- Follow the existing package scripts until a migration changes them. Technology candidates in the roadmap are not installed dependencies or accepted migration decisions.
- Match verification to the change: mathematical checks for geometry, interaction review for controls, and production route/asset checks for hosting.
- After meaningful runtime or UI changes, use `$smoke-tester` with [the browser smoke checklist](docs/smoke-tests.md); report failures and incomplete coverage alongside required change-specific checks. Documentation-only changes do not require app smoke testing.
- Preserve unrelated working-tree changes.
- For substantial code reviews, use parallel subagents for mathematical correctness and engineering constraints. Include UI and accessibility review when controls or visual behavior are in scope, and combine the findings in the main chat.

## Git workflow

- Commit completed, verified work in small, logically separate commits.
- Use clear commit messages and report commit hashes and verification results.
- Stage only changes belonging to the current task; preserve unrelated changes.
- Do not push, amend existing commits, or rewrite history unless requested.

## Documentation

Update architecture, capabilities, and hosting guidance when their described behavior changes. Use [GLOSSARY.md](GLOSSARY.md) for domain vocabulary only. Record consequential decisions with real alternatives in `docs/adr/`.

For future implementation, start from a bounded spec with acceptance criteria in `docs/specs/`. Create Markdown task files under `docs/tasks/<feature>/` only for implementation work intended to be carried out; keep decisions, research notes, and reference-only material in the spec or planning document instead of creating task files for them. Link task files to their source spec and represent dependencies with links or task titles. Bezeg uses repository-local documents for planning and implementation work, with no external issue tracker or tracker labels. This documentation task does not deploy the app or create external tickets.
