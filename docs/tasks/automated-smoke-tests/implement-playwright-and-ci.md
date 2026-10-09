# Implement Playwright smoke tests and CI

Source: [automated smoke tests spec](../../specs/automated-smoke-tests.md).

Status: implemented and locally verified. Evidence: [implementation review](../../reviews/automated-smoke-tests.md). Hosted Actions verification awaits a push.

Implement the accepted three checks, local production preview and commands, dependency/configuration setup, and bounded GitHub Actions workflow. Verify against the production build; return changed files, results, failure-evidence demonstration, and remaining limitations to the handler. The handler reviews, integrates documentation, stages the task-specific lockfile delta, and commits. Preserve existing UI and package-lock changes; workers do not commit or delegate.
