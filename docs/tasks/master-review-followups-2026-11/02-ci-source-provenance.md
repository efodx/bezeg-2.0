# 02 — Base CI skipping on verified and deployed source

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#ci-source-and-deployment-coverage--r3), CI1–CI5. Finding R3. Dependencies: none.

## Outcome and scope

A docs-only push recovers pending runtime verification/deployment after a cancelled runtime push. Ordinary already-published documentation changes retain their fast path.

Own `scripts/ci-change-scope.cjs`, its tests and the relevant `.github/workflows/browser-smoke.yml` gates. The source specification's evidence contract and decision matrix are authoritative. Read the existing verification-throughput policy before changing provenance lookup. Keep test-slot, publication and hosting implementation separate; this task retains the existing full build/check/deploy path rather than adding artifact reuse or a new deployment service.

## Work

1. Add deterministic Git-tree/run-history cases for every source decision row, starting with a code change whose scope is cancelled, followed by one or several docs-only pushes. Assert the decision and deploy-gate consequences, not only the explanatory text.
2. Resolve proven verification and the most recent successful deployment independently, retaining source SHA and run/attempt identity. Compare each source to candidate HEAD; neither the latest push range nor a green docs-only aggregate establishes coverage. Check required job outcomes, trusted workflow/master identity and ancestry. A scheduled green run supplies verification, not deployment.
3. Make missing, in-progress, failed, cancelled or uncertain evidence fall back to the existing full path unless both source comparisons independently prove coverage under the source contract. Preserve the red-full-run recovery rule and the docs-only fast path when all relevant inputs are covered and published. A recovery run's lesson/sweep selection must cover the pending runtime changes, not just the final documentation diff.
4. Update the command/hosting or verification guidance whose behavior changes, including recovery and the meaning of a green docs-only check. Include both proven source revisions and the comparison reason in the scope summary; a skipped run must not become new verification/deployment evidence.

## Verification and completion

Cover CI1–CI5 with cancelled scope, cancelled checks, cancelled/failed deployment, in-progress predecessor, older green, scheduled green without deploy, docs-only chains, verification-input-only changes, red previous run, missing API/jobs/base, non-ancestor source and true docs-only changes. Reject a success from another branch/PR or an incomplete attempt as master evidence. Preserve manual dispatch, PR and scheduled policies. Assert recovery sweep/lesson coverage and actual workflow gate conditions. Deliberately omit each source comparison in turn and observe the corresponding regression fail; a verification-only test would miss an undeployed green run.

Run `just tooling-test` and scoped lint, plus whitespace and workflow-contract checks. Review engineering and actual workflow consumers. A docs-only live publication may confirm the normal path; use fixtures for cancellation/failure cases instead of manufacturing a broken master. Record verification and deployment separately and identify anything not observed live.
