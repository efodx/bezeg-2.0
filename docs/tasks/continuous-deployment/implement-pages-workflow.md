# Add gated Pages deployment

Source: [continuous deployment spec](../../specs/continuous-deployment.md).

Own `.github/workflows/browser-smoke.yml`. Extend the existing job with type and unit checks and conditional upload of the verified production artifact. Add a dependent, master-only native Pages deployment job with minimal permissions and non-cancelling deployment concurrency. Keep existing failure evidence and PR/ref CI cancellation.

Handler owns hosting documentation, integrated verification, review, and commit. Report the exact changes, syntax/condition checks, and activation limitations; leave staging and commits to the handler.

Implemented on 2026-10-09. See [verification and activation limits](../../reviews/continuous-deployment.md). Remote activation follows the documented Pages source switch after pushing; no deployment was performed by this task.
