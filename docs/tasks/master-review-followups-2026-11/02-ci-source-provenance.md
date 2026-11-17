# 02 — Base CI skipping on verified and deployed source

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#ci-source-and-deployment-coverage--r3), CI1–CI5. Finding R3. Dependencies: none.

## Outcome and scope

A docs-only push recovers pending runtime verification/deployment after a cancelled runtime push. Ordinary already-published documentation changes retain their fast path.

Own scripts/ci-change-scope.cjs, its tests and the relevant browser-smoke.yml gates. Read the existing verification-throughput policy before changing provenance lookup. Keep test-slot, publication and hosting implementation separate.

## Work

1. Add deterministic Git-tree/run-history cases for a code change whose scope is cancelled, followed by a docs-only push. Assert the decision and deploy-gate consequences, not only the explanatory text.
2. Represent proven verification and deployment source revisions separately. Decide eligibility from their relationship to current relevant source and a trustworthy ancestry/path comparison. Use existing Actions evidence; a scheduled green run supplies verification, not deployment.
3. Make missing, in-progress, failed, cancelled or uncertain history fall back to the existing full path. Preserve the docs-only fast path when runtime and verification inputs are already covered and published.
4. Update the command/hosting or verification guidance whose behavior changes, including recovery and the meaning of a green docs-only check.

## Verification and completion

Cover CI1–CI5 with cancelled scope, cancelled checks, cancelled deployment, in-progress predecessor, older green, scheduled green without deploy, red previous run, missing API/base, non-ancestor source, true docs-only changes, manual dispatch, PRs and existing sweep/lesson selection. Include a deliberate omission of the source comparison and observe regression failure.

Run `just tooling-test` and scoped lint, plus whitespace and workflow-contract checks. Review engineering and actual workflow consumers. A docs-only live publication may confirm the normal path; use fixtures for cancellation/failure cases instead of manufacturing a broken master. Record verification and deployment separately and identify anything not observed live.
