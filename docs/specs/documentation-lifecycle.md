# Documentation lifecycle and retention

Status: adopted 2026-10-24. Scope: repository documentation and planning records; no application behavior changes. This policy implements the owner's retention decision and develops the [planning cleanup review](../reviews/planning-cleanup-2026-10-24.md#retain-retire-and-delete).

## Retention by purpose

There is no age-based expiry. Retain a document while it explains current behavior, an active plan, a consequential decision or useful evidence. Git preserves removed historical detail; it does not replace discoverable current guidance.

| Record | Lifetime and maintenance |
| --- | --- |
| Current architecture, capabilities, contributor and hosting guides | Maintain while the described system exists. Update when behavior changes. |
| ADRs | Retain permanently. Mark superseded decisions and link their replacement; preserve the original rationale. |
| Feature specs | Retain while they define supported behavior or important constraints. Record implementation status; consolidate or retire replaced contracts. |
| Implementation tasks | Keep while executable work or concrete acceptance gaps remain. Once closed, preserve unique decisions/evidence in the spec, ADR or review, then remove redundant handoffs or retain a concise historical record. |
| Reviews and verification evidence | Retain useful outcomes, provenance and limitations. Remove redundant transcripts or raw logs once their useful results have a durable home and no current verification procedure depends on them. |
| Research, source content, mockups and references | Retain material supporting current behavior, active plans or consequential decisions. Remove abandoned duplicates after checking references. Location under tasks/ alone does not make a source document disposable. |

## Close out implementation

1. Reconcile the source spec and task index against the implemented scope. Record completion and evidence, or name the concrete remaining work and its owner document. Do not infer completion from age or an absent status line.
2. Preserve consequential decisions in ADRs and update current behavior guides. Keep acceptance outcomes, source revision where known, and unresolved limitations in the spec or a linked review. Unperformed checks remain unperformed; apply the current release policy when distinguishing optional observations from required acceptance.
3. Remove completed tasks from the active queue. A retained task starts with its status and a link to the source spec and completion evidence. Superseded instructions name their replacement; canceled work records cancellation without claiming acceptance.
4. Delete a redundant task only after its unique information has a durable home and incoming links are updated. Keep a short historical record in place when it still explains useful evidence; an archive folder is optional, not a required extra copy. If a record moves, update its incoming and relative outgoing links.

Use plain statuses such as proposed, planned, in progress, complete, superseded or canceled. When implementation is complete but acceptance remains partial, state that distinction and link the outstanding criteria. Retention does not authorize implementation or reopen completed work.

## Navigation and cleanup

The [documentation home](../README.md) prioritizes current guidance and the work queue. The [records catalog](../documentation-records.md) provides secondary access to feature contracts and evidence, including historical handoffs. It is a discovery aid, not a second backlog. Keep queue status in the source spec/task index and link it rather than copying acceptance lists across indexes.

During feature closeout or a requested cleanup, inspect the affected records and their links. Avoid repository-wide status rewrites without checking implementation and evidence. Consolidating overlapping specs must preserve applicable constraints, accepted decisions and provenance. Cleanup should reduce duplicate instructions, not introduce a new document for every retired task.

## Acceptance criteria for this cleanup

- The documentation home separates current guidance and the work queue from feature records and historical evidence.
- Links from the previous index remain discoverable in the records catalog, without moving their targets.
- Retention and closeout rules cover current guides, ADRs, specs, tasks, reviews and reference material, with no arbitrary expiry or loss of unique evidence.
- Contributor documentation points to this policy when closing or cleaning up planning records.
- Changed Markdown links resolve locally and whitespace checks pass. No application build or browser checks are required for this documentation-only change.

## Scope of adoption

This cleanup reorganizes navigation and establishes the closeout procedure. Existing feature specs, task files and acceptance records remain in place. Their removal or consolidation requires the targeted evidence and link checks above; this change does not certify every historical task's acceptance.

Acceptance recorded 2026-10-24: reviewed the home/catalog separation and all retention categories; checked 98 local Markdown link targets across the four changed documents and confirmed every previous home-index link remains in the catalog. Whitespace checks passed. Application tests and browser checks were not run because no application behavior changed.
