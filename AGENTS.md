# Working on Bezeg

Before editing, read only the spec or document covering the area you change. [docs/README.md](docs/README.md) is an index, not required reading. [docs/guardrails.md](docs/guardrails.md) defines product and engineering constraints; the agreed direction is in [docs/future-plan.md](docs/future-plan.md).

## Implementation delegation

- Check the [handler context budget](docs/agent-workflow.md#handler-context-budget-codex) at Codex task start and bounded work boundaries, including handler-only work; prepare a fresh-chat handoff at 150k and collect worker notes at 190k. Context handoffs may create a fresh successor chat to continue the same authorized objective.
- Delegate code implementation and fixes when a worker can make meaningful progress on a bounded, separable slice. Small or tightly coupled changes may stay with the handler. Before dispatch, the handler reads [the delegation workflow](docs/agent-workflow.md) for model/effort routing, task briefs, and evidence capture. This is standing authorization.
- The main chat owns scope, review, verification, and commits. Workers implement their assigned slice, report evidence, and do not delegate further.
- Workers follow their assignment and relevant project constraints; orchestration research and accumulated evaluation logs are loaded by the handler only when evaluating the workflow.

## Product constraints

- Bezeg is an educational curve app for students and educators.
- Keep it static and client-only: no backend, accounts, or server database. Browser-local presets and file import/export are supported.
- Prioritize desktop and classroom projection, with essential touch and keyboard workflows on smaller screens.
- Slovenian is the default app language. English support is planned; contributor documentation is in English. New Slovenian terms: research and decide them yourself by [choosing new terms](docs/localization.md#choosing-new-terms).
- Keep the graph prominent, make controls understandable, and retain the elderflower identity.
- Breaking changes are allowed. Record their reason and user impact, including any change to routes or stored presets.

## Engineering practices

- Preserve mathematical meaning when changing evaluation, drawing, or constructions. Use relevant mathematical checks for affected operations.
- Measure representative dragging and slider interactions before selecting rendering optimizations or replacing JSXGraph. See [docs/performance-plan.md](docs/performance-plan.md).
- Keep hosting/app-shell concerns separate from mathematical features. Work toward geometry independent of React, JSXGraph, and graph-global cache state.
- Give boards, listeners, and auxiliary objects explicit ownership and disposal. Keep cache invalidation correct.
- Validate imported preset data and handle unsupported files with an actionable error.
- Localization calls are type checked per key (a recurring TS2345 failure): call `t('key')` without placeholders and `t('key', {value0: value})` with the catalog's exact names; keep `sl.ts` and `en.ts` in lockstep and never silence errors with `any` or casts. Components get `t` from `useT()`. Details: [docs/localization.md](docs/localization.md). After localization changes, run `npx tsc --noEmit --pretty false` and the production build.
- Lesson prose: wrap every symbol or formula in `\(...\)` or `\[...\]` (doubled backslashes in TS strings), use `{,}` for decimal commas in math, and keep `latex`/`calculationLatex`/`resultLatex` fields undelimited. `src/learning/content/lessonMathNotation.test.ts` enforces this; never weaken or skip it.
- Lesson scene actions run synchronously in one tick. Graph `setState` writes the scene store synchronously, so a later action may read `this.state` written by an earlier one; board side effects still run in `onStateChange` after the host commits. Do not reintroduce graph-field mirrors of state. Unit-test multi-action scenes in one synchronous sequence.
- Keep changes bounded. Evaluate build-tool, renderer, and UI migrations separately.
- Follow the existing package scripts until a migration changes them. Technology candidates in the roadmap are not installed dependencies or accepted migration decisions.
- For verification commands, start with `just --list`; [the command guide](docs/commands.md) covers setup, focused checks, logs, and build freshness. Select checks for the change's scope.
- Match verification to the change: mathematical checks for geometry, interaction review for controls, and production route/asset checks for hosting.
- Smoke-test with `$smoke-tester` and [the browser checklist](docs/smoke-tests.md) when a change alters a route, control, lesson, or rendering/interaction path. Check the affected routes and workflows; run the full checklist only when the shared app shell, workspace, or lesson runtime changes. Report failures and incomplete coverage. Documentation, test-only, and behavior-preserving changes covered by unit tests do not need smoke testing.
- Preserve unrelated working-tree changes.
- Context economy: locate code with search before reading; read files and specs by line range or section, not whole; summarize diffs by file before reading them, and check mechanical renames by search; keep long command output in logs and extract only failures; worker briefs cap report length and write bulky results to a file.
- Review large diffs (multi-file features or geometry changes) with parallel subagents for mathematical correctness and engineering constraints, adding UI and accessibility review when controls or visuals change. Review smaller diffs in the main chat.

## Git workflow

- Commit completed, verified work in small, logically separate commits.
- Use clear commit messages and report commit hashes and verification results.
- Stage only changes belonging to the current task; preserve unrelated changes.
- Only the main handler may push; subagents must never push. The handler pushes committed work unless told not to. Never force-push.
- "Push" means `master` on `origin` (https://github.com/efodx/bezeg-2.0), even when the work was done on another local or worktree branch. Fetch first, rebase only your new commits onto `origin/master`, recheck them against master's code, and push as a fast-forward (`git push origin HEAD:master`). If the rebase conflicts, stop and report. Pushing to `master` deploys GitHub Pages through `.github/workflows/browser-smoke.yml`.
- Do not amend existing commits or rewrite history unless requested.

## Documentation

Update architecture, capabilities, and hosting guidance when their described behavior changes. Use [GLOSSARY.md](GLOSSARY.md) for domain vocabulary only. Record consequential decisions with real alternatives in `docs/adr/`.

Start implementation from a bounded spec with acceptance criteria in `docs/specs/`. Create task files under `docs/tasks/<feature>/` only for work intended to be carried out, linked to their source spec; keep decisions and research in the spec or planning document. Planning is repository-local, with no external issue tracker.
