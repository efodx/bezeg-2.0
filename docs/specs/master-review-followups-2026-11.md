# Master review follow-ups — November 2026

Status: planned, 2026-11-18. The owner requested implementation tasks for the bugs and architecture improvements in the [17 November review](../reviews/master-2026-11-17.md). [Execution queue](../tasks/master-review-followups-2026-11/README.md). Publishing this plan changes no application behavior.

## Outcome and scope

Repair all eight reproduced findings and make the existing user-action owners enforce current availability. Preserve mathematical meaning, supported Presets, routes and synchronous authored scene actions. The reviewed source was 56c0b38b; planning was checked against origin/master abacf13d.

Six repair tasks cover the eight findings: R1/R2 share workspace action availability; M3/M4 share domain-safe B-spline sampling. The other four repairs remain independent. Acceptance IDs below are authoritative; task files give the work and checks.

The [custom-formula specification](custom-function-entry.md) owns evaluator and formula behavior. Its [new task queue](../tasks/custom-function-entry/README.md) implements the evaluator, Bisection pilot and Newton/Secant second consumer. Its Contracts live-model and Controls foundations are accepted on master; execution still checks active ownership of shared controls.

The existing [board-unit](../tasks/architecture-followups-2026-11/01-board-unit-projection.md), [collision-settings](../tasks/architecture-followups-2026-11/02-applied-collision-settings.md) and [chapter-restoration](../tasks/architecture-followups-2026-11/03-chapter-reading-restoration.md) tasks retain their own specifications and status. The combined queue links them. Family registration, typed lesson actions and owned scene replacement are delivered foundations. Renderer replacement and the deferred whole-ring occlusion experiment remain outside this plan.

## User-action availability — R1, R2

One current decision from the existing workspace/graph-session owner governs each affected user action. Controls display its reason and the mutation entry checks it immediately before committing. Rendered location, an earlier open form, or a captured callback must not freeze permission. Keep user requests distinct from graph-owned authored scene actions; use the existing session/state authority rather than a second mirrored lesson state.

- **UA1:** Save, overwrite, rename and delete refuse writes throughout the active lesson's Preset lock, including forms opened before lesson entry, Enter submission and confirmation buttons. Storage bytes and the live scene remain unchanged after refusal.
- **UA2:** While instructional content locks the graph, relocated playback cannot advance, play or reset it through pointer or keyboard activation. Cover widths on both sides of 700 px and heights on both sides of 500 px. Focus skips an inert group or reaches an accessible unavailable control; no invisible keyboard command remains active.
- **UA3:** Hide/observe mode retains its intended graph interaction, while Preset mutation stays locked until the lesson releases it. Exit restores ordinary controls; completion follows the existing lesson lifecycle. Resize, remount and scene replacement update availability without stale closures.
- **UA4:** The same current decision feeds UI feedback and the affected user-command entry. Inventory and remove superseded caller coordination. Trusted authored actions still execute synchronously in one tick, and scene/checkpoint restoration remains functional. Avoid a blanket mutation lock that blocks lesson preparation.
- **UA5:** Failed commits give useful existing localized feedback without losing drafts. Retain focus recovery, free-exploration playback and valid Preset operations. Verify storage, model and board observations, not only disabled-looking controls.

## CI source and deployment coverage — R3

A documentation-only decision needs evidence that runtime source has already been verified and published. An older green conclusion alone is insufficient.

- **CI1:** If a runtime push is cancelled during scope, checks or deployment, the next documentation-only push takes the full verification/deployment path unless the same runtime source has since been successfully verified and deployed.
- **CI2:** In-progress, cancelled-before-checks, failed and unavailable run histories cannot borrow an older unrelated success. Unknown or non-ancestor bases fail conservatively to full verification.
- **CI3:** Compare relevant changed paths against proven source revisions. Distinguish successful scheduled verification from successful deployment; a scheduled green run cannot stand in for publishing cancelled runtime work.
- **CI4:** Documentation-only changes may still skip runtime checks/deployment when application and verification-relevant inputs are unchanged from suitable proven revisions. Preserve pull-request, manual-dispatch, daily full-run, lesson-selection and catalog-sweep policies.
- **CI5:** Tests cover the scope decision and its workflow consequences: full verification must reach the existing deploy gate on master, and a docs-only success must not claim pending runtime changes were deployed. Use deterministic histories and Git trees; no deliberately broken push is required.

## Secant termination — M1

- **RF1:** For the accepted x³ − x example, starts 0 and 2 and one step produce [0, 2, 0], residual zero and root-found, rather than repeated-iterate. A newly evaluated exact root wins over recurrence classification.
- **RF2:** Preserve genuine non-root cycles, flat denominators, non-finite outcomes, step cap and current convergence tolerances. Check both starting-order cases and root-found when the new root coincides with an earlier iterate.
- **RF3:** Manual step, playback and restored saved runs derive the same history/status and matching construction. Preserve built-in IDs, step accounting and reference-root behavior. Keep this repair independent of adding custom formulas.

## Rational-function domain — M2

- **RD1:** In the Hole example, raising the numerator multiplicity at 1 to two gives (x + 1)(x − 1)² / (x − 1). The only zero is −1; 1 remains an excluded hole at height zero.
- **RD2:** All reported zeros belong to the original function's domain. Preserve cases with complete cancellation, remaining numerator multiplicity, remaining denominator multiplicity/poles and uncancelled roots. Use the model's exact factor identity; do not introduce a tolerance that merges different allowed roots.
- **RD3:** Graph markers/readouts, Preset round trips, Reset and lesson/checkpoint restoration agree with the model facts. Retain the hole and pole distinction and supported input controls.

## B-spline domain-safe sampling — M3, M4

- **BS1:** The accepted quadratic knots [0,0,0,1e-10,2,2,2] render without throwing. Every sample lies in the closed raw domain; valid short spans are represented.
- **BS2:** One-sided samples respect the previous distinct knot. Handle repeated knots, non-unit/negative domains and adjacent floating-point values with no representable interior point. Preserve exact knot samples, discontinuity conventions and partition-of-unity behavior where defined.
- **BS3:** The supplied unit-circle control points/weights with knots [-0.1,-0.1,-0.1,-0.025,-0.025,0.05,0.05,0.125,0.125,0.2,0.2,0.2] retain a finite radial error below 1e-12. The final sample is exactly the stored upper endpoint.
- **BS4:** Accepted edits and Preset imports, normalized/raw parameter views, Reset, lesson entry and restoration all produce valid board objects and consistent readouts. Preserve existing validation and the kernel's strict domain checks.
- **BS5:** Put actually shared endpoint/one-sided sampling rules in a small pure owner and remove duplicated policy at its migrated callers. If the two operations need different interfaces, keep local implementations with explicit invariants and document why extraction would be shallow. Never widen the kernel domain or suppress invalid samples to make checks pass.

## Empty Monte Carlo readouts — M5

- **MC1:** Monte Carlo area with zero displayed samples shows an explicit unavailable estimate, error and standard error. Counts may correctly show zero; they must not imply a measured estimate or zero uncertainty.
- **MC2:** After the first sample, normal numerical estimates return. Replay, experiment/seed changes, stepping, playback and scene restoration keep the graph and readouts synchronized; the zero-sample marker remains absent.
- **MC3:** Both languages and accessible readout announcements distinguish unavailable from numerical zero. Use the shared readout conventions; retain genuinely measured zero values.

## Verification and completion

Each task first reproduces its finding on its implementation base and records a failing correct-behavior assertion. Retained review probes are useful starting evidence, not substitutes for durable regressions. Assertions must require the expected board/readout objects to exist.

Start verification with `just --list`, then focused `just unit` checks through the repository runner. Runtime changes finish with appropriate integrated checks; localization changes require TypeScript and production build. Affected graph/control/lesson paths use `$smoke-tester`; shared workspace/runtime changes require the full browser checklist. Screenshots of changed panels include the 310 px inspector. Review mathematics independently when evaluation, drawing or numerical claims change, and review engineering/UI as appropriate.

Record acceptance IDs, revision, observed failing-before evidence, checks and explicit gaps with each completed task. Keep changes in small commits and use AGENTS.md's publication workflow. This planning publication needs coverage/link/whitespace checks, not application or browser acceptance.
