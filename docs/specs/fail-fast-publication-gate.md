# Fail-fast publication gate

Status: proposed implementation specification, 2026-10-12. The owner confirmed the testing boundary: the publication command runner, exercised with temporary Git repositories and injected failures. This specification does not authorize implementation or a test push to the production remote.

## Problem Statement

The owner needs publication to stop when any prerequisite fails. A contributor should receive a clear failure and preserve the reviewed local commits instead of discovering that invalid or incompletely checked work was already pushed.

In the graph styling session, a PowerShell command continued from a failed whitespace check to a successful push. The handler then needed a corrective commit and a second push, which cancelled the previous CI run. Remote CI already gates Pages deployment with TypeScript, unit, build, and browser checks, but it does not prevent this local sequencing error.

## Solution

Provide one handler-owned publication command that executes prerequisites in a defined order, checks every result, and exits immediately on failure. It publishes reviewed commits only after fresh master reconciliation and verification of the exact resulting revision. It reports the failure stage, command result, and current revision without pushing subsequent work.

The command complements existing CI and preserves the existing fast-forward publication contract. It does not implement commit creation, resolve conflicts, or replace remote deployment checks.

## User Stories

1. As the owner, I want a failed prerequisite to prevent a push, so that unchecked work cannot reach master.
2. As a contributor, I want a failed fetch to stop publication, so that I do not publish against stale remote state.
3. As a contributor, I want rebase conflicts to stop the command, so that unrelated changes are not resolved automatically.
4. As the owner, I want only the handler's reviewed commits reconciled with master, so that unrelated branch history is preserved.
5. As a contributor, I want verification to cover the rebased revision, so that results apply to what will be published.
6. As a contributor, I want a failed whitespace check to block publication, so that mechanical mistakes are caught locally.
7. As a reviewer, I want required checks selected explicitly for the change, so that documentation work and runtime changes receive appropriate coverage.
8. As a contributor, I want the first failing stage and exit result reported clearly, so that I can repair the actual problem.
9. As the owner, I want publication to preserve unrelated working-tree changes, so that ongoing work is safe.
10. As the owner, I want only a fast-forward push to origin master, so that remote history is not rewritten.
11. As a contributor, I want a remote advance during verification to reject my push safely, so that parallel work is preserved.
12. As a reviewer, I want publication evidence to identify the verified commit, so that I can distinguish verification from deployment.
13. As a contributor, I want child commands and interrupted runs handled predictably, so that cancelled verification cannot continue to push.
14. As a contributor, I want the gate to behave consistently from PowerShell and other supported shells, so that shell sequencing does not change its safety.
15. As a maintainer, I want integration tests with local temporary remotes, so that publication tests cannot alter the production repository.
16. As the owner, I want subagents to remain unable to own the publication step, so that the handler retains acceptance responsibility.

## Implementation Decisions

- Implement the gate as a repository-local command runner with explicit child-process result handling. Use the existing Node runtime for shell-independent sequencing; existing repository verification scripts remain authoritative.
- The handler prepares and commits reviewed work before invoking publication. The gate does not stage files, create or amend commits, automatically stash changes, or choose a new worktree.
- Require a clean task checkout apart from ignored generated artifacts. If unrelated tracked or untracked changes are present, stop with an actionable explanation; preserve every file and refer the handler to an isolated checkout.
- Require a handler-declared task base and ordered commit IDs identifying the reviewed slice. Validate that the base is an ancestor of the candidate revision and that the Git range matches the declared slice exactly. This declaration records handler acceptance; the command cannot infer human review or commit ownership from Git author metadata. Stop on a missing or inconsistent declaration.
- Validate the repository and origin against the Bezeg publication contract before network mutation. Fetch master first, then reconcile only the declared new commits with the fetched master. Stop immediately on conflicts; retain the Git conflict state and recovery information for the handler.
- Record the reconciled revision and base, then check the complete task diff for whitespace errors and run the explicitly selected required verification recipe against that revision.
- Verification recipes reuse current commands and match repository rules. Documentation-only changes require document/link/diff checks; runtime, localization, mathematical, browser, or hosting changes require their applicable checks. A declared recipe is visible in the result; the gate does not silently downgrade it after a failure.
- Push only after every required stage succeeds and the candidate revision and working tree still match the verified state. No earlier successful result authorizes publication of a later changed revision.
- The target is origin master and the push is fast-forward only. A concurrent remote advance is a normal failure; stop and require a fresh reconciliation and verification run. Never force-push or retry automatically with altered history.
- Preserve child exit codes, relevant output, and interruption state. Spawn commands with argument arrays instead of concatenated shell strings. A nonzero result, spawn failure, signal, or cancellation prevents later stages.
- Report the candidate revision, selected recipe, completed stages, first failing stage, and local log location. Successful push evidence is distinct from CI success and hosted Pages deployment.
- Keep publication handler-owned under AGENTS. The runner is not an authorization system; subagents must not invoke its push stage.

## Testing Decisions

Good tests observe the command's exit result, ordered external operations, repository state, and remote refs. Avoid asserting internal helper structure or implementation-specific function names.

Use the public command boundary with an injectable process execution adapter for deterministic failures, supplemented by integration tests using temporary working repositories and a local bare remote. Neither test lane accesses the production remote. The integration harness supplies an expected-origin fixture contract for its local bare remote; production defaults continue to require the real Bezeg origin. Existing CI tests and native Pages deployment are prior art for verification ordering and the distinction between publication and deployment; they remain intact.

Acceptance criteria:

1. Inject failure at every prerequisite, including origin validation, cleanliness/ancestry checks, fetch, reconciliation, diff checks, and each required verification command. The command reports failure, returns nonzero, and never starts a push or any later stage.
2. Reproduce the session's whitespace error: the diff check fails, the local remote master ref remains unchanged, and reviewed commits remain available for repair.
3. A clean successful fixture fetches, reconciles, verifies, and performs one fast-forward push. The pushed ref equals the recorded verified revision, and the report identifies all completed stages.
4. An intentionally advanced local remote changes the candidate during reconciliation; verification observes that resulting candidate rather than the old pre-rebase revision.
5. A rebase conflict leaves the remote unchanged, preserves the conflict state and unrelated files, and produces actionable diagnostics. The command performs no automatic conflict resolution.
6. Unexpected local files, invalid task bases, an unsupported origin, and candidate changes during verification stop before push without stashing, deleting, or rewriting unrelated work.
7. A simulated remote advance immediately before push produces a rejected fast-forward push and nonzero result. There is no force-push, automatic second push, or implicit additional rebase.
8. Spawn errors, signalled processes, and cancellation stop the pipeline. Long-running child checks release their owned processes on cancellation, and logs remain available.
9. The supported Windows PowerShell invocation and CI/Linux invocation propagate success and failure consistently, including repository paths containing spaces. Test the command itself rather than reproducing the old semicolon chain.
10. Documentation and runtime recipes are explicitly tested; the runtime recipe executes its required checks, and the documentation recipe never claims app/browser coverage it did not run. Missing or invalid recipes stop safely.
11. Tests run without production credentials or network publication. Existing verification and deployment gates still pass; no remote settings or Pages configuration change.

## Out of Scope

A general verification-wrapper project, test-discovery repair, new lint rules, Git hooks as a substitute for the gate, automatic staging/commit creation, conflict resolution, force-push, deployment activation, remote permission changes, branch-protection changes, replacing CI, and implementing the separate rendered-style contracts.

## Further Notes

This specification complements [continuous deployment](continuous-deployment.md), the [Pages playbook](../github-pages-spa-playbook.md), and [the handler workflow](../agent-workflow.md). AGENTS remains the authority for handler ownership, origin/master publication, verification scope, and conflict handling. The existing CI deliberately allows established CRA lint warnings; this proposal does not change that policy.

Implementation should update contributor publication guidance with the gate's final invocation, recovery behavior, and limitations. The local report must never describe a pushed commit as a successful deployment without separate hosted evidence. No implementation task documents are included in this specification-only request.
