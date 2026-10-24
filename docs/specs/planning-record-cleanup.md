# Planning record cleanup

Status: completed locally 2026-10-24; [disposition and verification](../reviews/planning-record-cleanup-2026-10-24.md). The owner requested the full retention audit, then authorized consolidation and deletion of its redundant records. Apply the [documentation lifecycle](documentation-lifecycle.md) and current [release policy](../guardrails.md#release-policy--owner-decision-2026-10-24).

## Scope

Retire completed task handoffs, superseded interface specs and obsolete prototype artifacts identified in this audit. Consolidate unique behavior constraints, decisions, verification provenance and named gaps into maintained specs or a small number of evidence records. Preserve current contracts, ADRs, source content, meaningful release/performance evidence and executable unfinished work. Application source, routes, presets and published assets are outside scope.

## Acceptance

- Review all 76 existing task files and 69 Markdown specs under the retention policy; remove only the audited redundant records after preserving useful unique information.
- Keep the capability matrix as the sole rollout follow-up owner for all eight missing lesson smoke rows; retain planned lesson example improvements, mobile playback, controls inventory and preview capture/release evidence.
- Consolidate historical lesson, engineering and superseded-interface evidence without copying obsolete instructions or inventing new acceptance passes. Preserve real limitations, including unverified enlarged-text acceptance and phone performance findings.
- Retire obsolete prototype comparisons while retaining selected current reference art and consequential selection provenance.
- Update all incoming references to deleted records, including Markdown links, images, directory references and literal paths. Redirect deleted sections to an appropriate retained document or stable replacement section; preserve historical source identification where useful.
- Remove obsolete general approval-gate wording from current guidance; retain factual unperformed-check limits in historical records with the current policy made clear.
- Check changed local links and anchors, all references to removed paths, staged whitespace and content-only scope. No app build/browser run is needed because application behavior is unchanged.
- Record final disposition, verification and limitations in the cleanup review. Commit and publish under the repository workflow.
