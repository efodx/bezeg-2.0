# Master review follow-ups — November 2026

Status: planned, 2026-11-18. The owner requested implementation tasks for the bugs and architecture improvements in the [17 November review](../reviews/master-2026-11-17.md). [Execution queue](../tasks/master-review-followups-2026-11/README.md). Publishing this plan changes no application behavior.

## Outcome and scope

Repair all eight reproduced findings and make the existing user-action owners enforce current availability. Preserve mathematical meaning, supported Presets, routes and synchronous authored scene actions. The reviewed source was 56c0b38b; planning was checked against origin/master abacf13d.

Six repair tasks cover the eight findings: R1/R2 share workspace action availability; M3/M4 share domain-safe B-spline sampling. The other four repairs remain independent. Acceptance IDs below are authoritative; task files give the work and checks.

The [custom-formula specification](custom-function-entry.md) owns evaluator and formula behavior. Its [task queue](../tasks/custom-function-entry/README.md) implements the evaluator, Bisection pilot and Newton/Secant second consumer. Accept the Secant repair before the evaluator task changes the shared root-finding kernel, and user-action availability before the Bisection pilot. Its Contracts live-model and Controls foundations are accepted on master; execution still checks active ownership of shared controls.

The existing [board-unit](../tasks/architecture-followups-2026-11/01-board-unit-projection.md), [collision-settings](../tasks/architecture-followups-2026-11/02-applied-collision-settings.md) and [chapter-restoration](../tasks/architecture-followups-2026-11/03-chapter-reading-restoration.md) tasks retain their own specifications and status. The combined queue links them. Family registration, typed lesson actions and owned scene replacement are delivered foundations. Renderer replacement and the deferred whole-ring occlusion experiment remain outside this plan.

## User-action availability — R1, R2

One current decision from the existing workspace/graph-session owner governs each affected user action. Controls display its reason and the mutation entry checks it immediately before committing. Rendered location, an earlier open form, or a captured callback must not freeze permission. Keep user requests distinct from graph-owned authored scene actions; use the existing session/state authority rather than a second mirrored lesson state.

| Current session mode | User Preset writes: save, overwrite, rename, delete | User graph playback: step, play, run reset |
| --- | --- | --- |
| Free exploration | Ordinary storage/validation rules | Ordinary playback rules |
| Active lesson, instructional card owns interaction | Refuse | Refuse |
| Active lesson, card hidden / observe mode | Refuse | Ordinary playback rules |
| Exit or completion after the existing lifecycle releases ownership | Ordinary storage/validation rules | Ordinary playback rules |

This table governs user command entry regardless of control placement. Lesson-card actions and trusted scene preparation/checkpoint restoration retain their existing synchronous lifecycle; they are not free-exploration playback requests. Preserve existing select/import/workspace-reset locks and graph-busy behavior. This repair does not introduce a global command bus or a public bypass flag.

- **UA1:** Save, overwrite, rename and delete refuse writes throughout the active lesson's Preset lock, including forms opened before lesson entry, Enter submission and confirmation buttons. Storage bytes and the live scene remain unchanged after refusal.
- **UA2:** While instructional content locks the graph, relocated playback cannot advance, play or reset it through pointer or keyboard activation. Cover widths 699/700/701 px and heights 499/500/501 px, varying one axis while the other is above its breakpoint, then combining the small dimensions. Focus skips an inert group or reaches an accessible unavailable control; no invisible keyboard command remains active.
- **UA3:** Hide/observe mode retains its intended graph interaction, while Preset mutation stays locked until the lesson releases it. Exit restores ordinary controls; completion follows the existing lesson lifecycle. Resize, remount and scene replacement update availability without stale closures.
- **UA4:** The same current decision feeds UI feedback and the affected user-command entry. Inventory and remove superseded caller coordination. Trusted authored actions still execute synchronously in one tick, and scene/checkpoint restoration remains functional. Avoid a blanket mutation lock that blocks lesson preparation.
- **UA5:** Failed commits give useful existing localized feedback without losing drafts. Retain focus recovery, free-exploration playback and valid Preset operations. Verify storage, model and board observations, not only disabled-looking controls.

## CI source and deployment coverage — R3

A documentation-only decision needs evidence that runtime source has already been verified and published. An older green conclusion alone is insufficient.

Treat the two proven revisions separately:

| Evidence | Required proof | Insufficient evidence |
| --- | --- | --- |
| Verified source | A trusted master run of the canonical workflow, its source SHA and run/attempt identity, with all required runtime verification jobs successful. A scheduled full run can qualify. | A green docs-only aggregate, one successful shard, skipped checks, a PR run or an unfinished attempt. |
| Deployed source | The most recent successful Pages publication, tied to its source SHA and the verified build from that master push/manual run. | A successful scheduled run, uploaded artifact, queued deployment or successful verification followed by a cancelled/failed deploy. |

Compare each proven source revision with the candidate HEAD using the existing conservative documentation allowlist: every path outside it, including runtime, assets, dependencies, tests and workflow inputs, matters. Comparing only the latest push's `before..after` is insufficient. Require trustworthy, available ancestor commits; missing or truncated evidence falls back to full verification. Preserve the existing red-full-run recovery policy rather than searching past a failed full run for a convenient older green. A docs-only success advances neither provenance record.

For a documentation-only **master push**, use these deterministic decision cases. “Full + deploy” means run the existing full path and become eligible for deployment only after all required checks succeed; it does not bypass the deploy gate.

| History before the docs push | Expected path |
| --- | --- |
| Verified and most recently deployed sources both cover all current relevant inputs | Docs fast path; no deployment needed |
| Runtime change cancelled during scope/checks, or still in progress; only an older different source is green | Full + deploy |
| Current runtime verified, but its deployment failed/cancelled or is still pending | Full + deploy |
| Scheduled full verification covers new runtime, but Pages still serves older runtime | Full + deploy |
| One or more intervening docs-only successes follow uncovered runtime | Full + deploy; those successes do not establish verification or deployment |
| Runtime is unchanged, but verification-relevant inputs changed since the proven run | Full + deploy under the existing conservative policy |
| Missing API/jobs/source, non-ancestor source, or unresolved failed full run | Full + deploy |

- **CI1:** If a runtime push is cancelled during scope, checks or deployment, the next documentation-only push takes the full verification/deployment path unless the same runtime source has since been successfully verified and deployed.
- **CI2:** In-progress, cancelled-before-checks, failed and unavailable run histories cannot borrow an older unrelated success. Unknown or non-ancestor bases fail conservatively to full verification.
- **CI3:** Compare relevant changed paths against proven source revisions. Distinguish successful scheduled verification from successful deployment; a scheduled green run cannot stand in for publishing cancelled runtime work.
- **CI4:** Documentation-only changes may still skip runtime checks/deployment when application and verification-relevant inputs are unchanged from suitable proven revisions. Preserve pull-request, manual-dispatch, daily full-run, lesson-selection and catalog-sweep policies.
- **CI5:** Tests cover the matrix, scope decision and workflow consequences: full verification must reach the existing deploy gate on master, and a docs-only success must not claim pending runtime changes were deployed. A recovery run must cover the unverified runtime changes in its lesson/sweep scope, not inherit an empty docs-only selection. The summary identifies both evidence revisions and why skipping is or is not safe. Use deterministic histories and Git trees; no deliberately broken push is required.

## Secant termination — M1

- **RF1:** For the accepted x³ − x example, starts 0 and 2 and one step produce [0, 2, 0], residual zero and root-found, rather than repeated-iterate. A newly evaluated exact root wins over recurrence classification.
- **RF2:** Reversing the RF1 starts to 2 and 0 finds the current root immediately: history [2,0], zero steps taken and root-found. It must not append a synthetic step to match RF1's [0,2,0] and one step taken. Preserve genuine non-root cycles, flat denominators, non-finite outcomes, step cap and current convergence tolerances; a small step with nonzero residual still follows the existing approximate-convergence policy.
- **RF3:** Manual step, playback and restored saved runs derive the same history/status and matching construction. Preserve built-in IDs, step accounting and reference-root behavior. Keep this repair independent of adding custom formulas.

## Rational-function domain — M2

- **RD1:** In the Hole example, raising the numerator multiplicity at 1 to two gives (x + 1)(x − 1)² / (x − 1). The only zero is −1; 1 remains an excluded hole at height zero.
- **RD2:** All reported zeros belong to the original function's domain. Preserve cases with complete cancellation, remaining numerator multiplicity, remaining denominator multiplicity/poles and uncancelled roots. Use the model's exact factor identity; do not introduce a tolerance that merges different allowed roots.
- **RD3:** Graph markers/readouts, Preset round trips, Reset and lesson/checkpoint restoration agree with the model facts. Retain the hole and pole distinction and supported input controls.

Use these independent factor examples for RD1/RD2; evaluation at every excluded point remains undefined even when the reduced expression is finite there.

| Original expression | Zeros | Exclusion at 1 |
| --- | --- | --- |
| (x + 1)(x − 1) / (x − 1) | −1 | Hole at height 2 |
| (x + 1)(x − 1)² / (x − 1) | −1 | Hole at height 0 |
| (x + 1)(x − 1) / (x − 1)² | −1 | Pole |
| (x − 1) / (x − 1) | None | Hole at height 1 |
| (x − 1)² / 1 | 1 | None; 1 is a valid zero |

## B-spline domain-safe sampling — M3, M4

- **BS1:** The accepted quadratic knots [0,0,0,1e-10,2,2,2] render without throwing. Every sample lies in the closed raw domain; valid short spans are represented.
- **BS2:** For an interior knot u and the previous distinct in-domain knot p, any extra one-sided sample must satisfy p < t < u. Include such a sample when a representable interior value exists, even for BS1's short span. If none exists (for example p = 1 and u = 1 + Number.EPSILON), retain the exact boundary samples with the kernel's existing knot convention and omit the nonexistent interior sample; do not claim that this evaluates an analytic left limit. Document that drawing limitation instead of inventing an epsilon or widening the domain. Handle repeated knots and non-unit/negative domains; preserve discontinuity conventions and partition of unity where defined.
- **BS3:** The supplied unit-circle control points/weights with knots [-0.1,-0.1,-0.1,-0.025,-0.025,0.05,0.05,0.125,0.125,0.2,0.2,0.2] retain a finite radial error below 1e-12. The final sample is exactly the stored upper endpoint.
- **BS4:** Accepted edits and Preset imports, normalized/raw parameter views, Reset, lesson entry and restoration all produce valid board objects and consistent readouts. Require ordered in-domain parameters and nonempty finite basis columns of matching length, retaining the exact stored endpoints. Preserve existing validation and the kernel's strict domain checks.
- **BS5:** Put actually shared endpoint/one-sided sampling rules in a small pure owner and remove duplicated policy at its migrated callers. If the two operations need different interfaces, keep local implementations with explicit invariants and document why extraction would be shallow. Never widen the kernel domain or suppress invalid samples to make checks pass.

## Empty Monte Carlo readouts — M5

- **MC1:** Monte Carlo area with zero displayed samples shows an explicit unavailable sample share, estimate, error and standard error. Counts may correctly show zero; they must not imply a measured estimate or zero uncertainty. The visible status sentence and accessible announcements must also say there are no observations, rather than inserting a numerical-zero estimate.
- **MC2:** After the first sample, normal numerical estimates return. Replay, experiment/seed changes, stepping, playback and scene restoration keep the graph and readouts synchronized; the zero-sample marker remains absent.
- **MC3:** Both languages and accessible readout announcements distinguish unavailable from numerical zero. Use the shared readout conventions; retain genuinely measured zero values.

The area-mode branches of `SimulationGraph.readoutRows` and `statusText`, the live announcement path and the board marker are all acceptance surfaces. Other simulation experiments remain outside this repair. Use deterministic inside/outside first-sample cases with independently checked counts:

| Displayed samples n / inside count k | Sample share | Estimate | Signed error | Standard error |
| --- | --- | --- | --- | --- |
| 0 / 0 | Unavailable | Unavailable | Unavailable | Unavailable |
| 1 / 0 | 0 | 0 | −π | 4√((π/4)(1 − π/4)) |
| 1 / 1 | 1 | 4 | 4 − π | 4√((π/4)(1 − π/4)) |

The positive-sample rows preserve the existing area experiment's theoretical standard-error definition; this task does not replace it with an empirical variance estimate. Numerical comparisons account for display precision. Require the marker to be absent only for n = 0 and to show the measured estimate for n > 0, including a measured zero.

## Verification and completion

Each task first reproduces its finding on its implementation base and records a failing correct-behavior assertion. Retained review probes are useful starting evidence, not substitutes for durable regressions. Assertions must require the expected board/readout objects to exist.

Start verification with `just --list`, then focused `just unit` checks through the repository runner. Runtime changes finish with appropriate integrated checks; localization changes require TypeScript and production build. Affected graph/control/lesson paths use `$smoke-tester`; shared workspace/runtime changes require the full browser checklist. Screenshots of changed panels include the 310 px inspector. Review mathematics independently when evaluation, drawing or numerical claims change, and review engineering/UI as appropriate.

Record acceptance IDs, revision, observed failing-before evidence, checks and explicit gaps with each completed task. Keep changes in small commits and use AGENTS.md's publication workflow. This planning publication needs coverage/link/whitespace checks, not application or browser acceptance.
