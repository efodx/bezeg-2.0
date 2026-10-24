# Scope CI for documentation-only changes

Status: implemented and hosted verification confirmed on 2026-10-24. [Documentation-only run](https://github.com/efodx/bezeg-2.0/actions/runs/40082167546) passed scope detection while skipping app checks, artifact upload and deployment; [full run](https://github.com/efodx/bezeg-2.0/actions/runs/40083016319) passed type, unit, production build, Chromium smoke and deployment. Original local boundary-case evidence follows.

## Scope and acceptance

- Preserve the `Browser smoke` workflow and `smoke` check identity and existing PR-to-master, master-push, and manual triggers.
- Automatically skip dependency installation, TypeScript, unit tests, browser installation, build, artifact upload, and deployment only when every changed path is a recognized documentation path: Markdown under `docs/`, or root `README.md`, `AGENTS.md`, or `CLAUDE.md`.
- All other paths, including workflow/configuration/scripts, app code, assets, dependencies, mixed changes, and unknown paths, retain the full existing verification and deployment gate.
- Compare the complete PR diff against its base (merge base), and the complete push range against its previous head. Handle deletions and both sides of renames conservatively. Missing/invalid comparison information and empty diffs must select full verification.
- Manual dispatch always runs full verification. Documentation-only runs still report a successful `smoke` check and explain the decision in the run summary; they do not publish or replace the deployed site.
- Keep normal application deployment restricted to successful verified master push/manual runs. A successful skipped validation must never enable deployment.
- No runtime changes, dependencies, or selective feature/lesson testing in this iteration.

## Verification

Exercise change detection with documentation, application, mixed, deleted/renamed paths, multi-commit pushes, PR merge bases, manual dispatch, empty diffs, and unavailable history. Validate workflow syntax and inspect the artifact/deployment conditions. Record local verification separately from hosted Actions evidence. Browser smoke is not required locally because this changes only CI execution policy and does not change the build, routes, or app runtime.

Local evidence: `node --test scripts/ci-change-scope.test.cjs` passed all nine tests; Node syntax checks and `git diff --check` passed. Actionlint 1.7.12 accepted the workflow (ShellCheck and Pyflakes disabled). The detector CLI entry point also classified the existing documentation-only `HEAD^` to `HEAD` push correctly at pre-change commit `1656073`. Independent engineering review found no actionable issues; the handler additionally checked deployment gates and the final conservative path handling. The application suite was not rerun locally because its commands and application source are unchanged; the implementation push selects the full hosted pipeline.
