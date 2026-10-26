# Three.js lifecycle repair review

Reviewed the prototype diff, lifecycle verifier, repair note, and task 02 lifecycle/control requirements. No browser run or source implementation edits were made.

## Findings

- **P2 — The pre-fix regression assertion does not isolate the stale completion** (`verify-three-lifecycle.mjs:129–144, 177–180`). The old `ready()` reports true as soon as the remount allocates its renderer, before its fixture resolves. Thus the baseline's `api.ready() === false` assertion fails even if the delayed old fixture has no effect; it cannot establish that stale setup caused the regression. Capture the remount's pending state before resolving the stale response, then assert a stale-specific mutation/resource/listener outcome afterward.
- **P2 — Async generation gates are only partly regression-tested** (`verify-three-lifecycle.mjs:122–147`; implementation gates at `three-prototype.js:40`). The test supersedes a setup while `fetch()` is pending, then resolves it. It does not supersede a pending module import or a delayed `response.json()`; because the fetch-generation check returns first, the JSON gate is never reached in the stale case. Add deferred import and JSON-response schedules so removing either check fails.
- **P2 — “Exactly once” toolbar binding is not asserted** (`verify-three-lifecycle.mjs:156–163`). `controlCount > 10` accepts duplicate listeners, and the view-button assertion sets an idempotent preset, so repeated handlers pass. Assert per-control listener counts across multiple remounts; the implementation's `controlsBound` guard currently appears correct by inspection.

Mount generation checks, failure cleanup, readiness timing, control/mount ownership, stale RAF guards, and the void-returning `setFromCamera()` fix look sound by source inspection. The verifier checks final listener and RAF cleanup, but does not invoke a retained ResizeObserver callback after disposal; this review makes no browser/rendering or performance claim.
