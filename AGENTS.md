# Working on Bezeg

Before editing, read only the spec or document covering the area you change. [docs/README.md](docs/README.md) is an index, not required reading. [docs/guardrails.md](docs/guardrails.md) defines product and engineering constraints; the agreed direction is in [docs/future-plan.md](docs/future-plan.md).

## Implementation delegation

- Delegate multi-file features and slices from a spec in `docs/specs/` or `docs/tasks/` to subagents using **GPT-6 Luna with Max reasoning**, following [the delegation workflow](docs/agent-workflow.md). This is standing authorization.
- Do small fixes (roughly under 50 changed lines or within one module) directly in the main chat.
- The main chat owns scope, review, verification, and commits. Workers implement their assigned slice, report evidence, and do not delegate further.
- If the spawn tool cannot select Luna Max: in Claude Code, use Sonnet workers without asking; elsewhere, report the limitation and ask for a fallback.

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
- Localization calls are type checked per key (a recurring TS2345 failure): call `t('key')` without placeholders and `t('key', {value0: value})` with the catalog's exact names; keep `sl.ts` and `en.ts` in lockstep and never silence errors with `any` or casts. Details: [docs/localization.md](docs/localization.md). After localization changes, run `npx tsc --noEmit --pretty false` and the production build.
- Lesson prose: wrap every symbol or formula in `\(...\)` or `\[...\]` (doubled backslashes in TS strings), use `{,}` for decimal commas in math, and keep `latex`/`calculationLatex`/`resultLatex` fields undelimited. `src/learning/content/lessonMathNotation.test.ts` enforces this; never weaken or skip it.
- Lesson scene actions run synchronously in one tick, but `setState` is asynchronous: an action must not read `this.state` written by an earlier action in the same scene; keep such values in a graph field or the curve object. Unit-test multi-action scenes in one synchronous sequence and give every lesson a row in `tests/guided-lessons.smoke.spec.cjs`.
- Keep changes bounded. Evaluate build-tool, renderer, and UI migrations separately.
- Follow the existing package scripts until a migration changes them. Technology candidates in the roadmap are not installed dependencies or accepted migration decisions.
- Match verification to the change: mathematical checks for geometry, interaction review for controls, and production route/asset checks for hosting.
- Smoke-test with `$smoke-tester` and [the browser checklist](docs/smoke-tests.md) when a change alters a route, control, lesson, or rendering/interaction path. Check the affected routes and workflows; run the full checklist only when the shared app shell, workspace, or lesson runtime changes. Report failures and incomplete coverage. Documentation, test-only, and behavior-preserving changes covered by unit tests do not need smoke testing.
- Preserve unrelated working-tree changes.
- Review large diffs (multi-file features or geometry changes) with parallel subagents for mathematical correctness and engineering constraints, adding UI and accessibility review when controls or visuals change. Review smaller diffs in the main chat.

## Git workflow

- Commit completed, verified work in small, logically separate commits.
- Use clear commit messages and report commit hashes and verification results.
- Stage only changes belonging to the current task; preserve unrelated changes.
- Push committed work unless told not to. Never force-push.
- "Push" means `master` on `origin` (https://github.com/efodx/bezeg-2.0), even when the work was done on another local or worktree branch. Fetch first, rebase only your new commits onto `origin/master`, recheck them against master's code, and push as a fast-forward (`git push origin HEAD:master`). If the rebase conflicts, stop and report. Pushing to `master` deploys GitHub Pages through `.github/workflows/browser-smoke.yml`.
- Do not amend existing commits or rewrite history unless requested.

## Documentation

Update architecture, capabilities, and hosting guidance when their described behavior changes. Use [GLOSSARY.md](GLOSSARY.md) for domain vocabulary only. Record consequential decisions with real alternatives in `docs/adr/`.

Start implementation from a bounded spec with acceptance criteria in `docs/specs/`. Create task files under `docs/tasks/<feature>/` only for work intended to be carried out, linked to their source spec; keep decisions and research in the spec or planning document. Planning is repository-local, with no external issue tracker.
