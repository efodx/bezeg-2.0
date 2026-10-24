# Planning cleanup and next work

Date: 2026-10-24. Initial review: local revision `7d5ff38`, initially clean. Scope: specs, task indexes/statuses, relevant acceptance records, recent history and targeted source checks. Follow-up owner decisions below update release policy; no application behavior changes or new app acceptance pass.

## Recommended next work

1. **Fix the observed lesson keyboard-focus defect first.** Finding 1 in the [current UX audit](guided-lessons-ux-audit-2026-10-24.md) records focus entering obscured graph points. Current `DemonstrationWorkspace.tsx` makes the inspector inert during reading, but the graph section has only a lesson-lock marker; Fit to points also bypasses the other navigation buttons' disabled handling. Prepare a bounded fix spec with keyboard/assistive-technology isolation and hide/reopen/completion/disposal acceptance. This review confirms the source gap; it does not rerun the browser reproduction or implement the fix.
2. **Address lesson state clarity and viewport budgeting.** Audit findings 2–4, 6 and 7 cover initially offscreen desktop navigation, competing Observe/Next actions, crowded mobile controls, completion handoff and Learning discovery. Scope the shared reading changes together where they share layout/state ownership. Preserve optional skipping and final-scene retention. Finding 5's compact current-task cue changes an accepted interaction tradeoff and needs a proposal. Token consolidation (finding 8) is lower priority.
3. **Restore missing per-lesson smoke rows and consolidate review ownership.** The [rollout reconciliation](guided-lessons-status-reconciliation.md) identifies eight absent rows: `bezier`, `decasteljau`, `affine`, `elevation`, `rational`, `rational-decasteljau`, `ph-cubic`, `ph-quintic`. A source check still finds no matching `id:` rows in the shared table; targeted tests elsewhere are not equivalent to its whole per-lesson workflow. The [matrix task](../tasks/guided-lessons-rollout/build-capability-matrix.md) should link existing evidence rather than rediscover implemented capabilities. Agree extension beyond its historical 26-route scope before calling it complete.
4. **Start the existing lesson example plan with task 00, then 01/02.** The [batch index](../tasks/lesson-example-improvements/README.md) remains real planned work. Task 00 can finish without code if existing scene operations meet every downstream requirement. Reconcile task 06's Taylor recommendations against the later experience pilot before editing: that pilot improved pacing but does not prove every requested example sequence is delivered. Keep task 08 as retention verification, not 18 mandatory rewrites.
5. **Keep mobile playback as a separate bounded follow-up.** The [spec](../specs/mobile-graph-playback.md) describes graph-adjacent controls across animated routes, not just fixed-point. It remains planning-only and needs implementation authorization. Coordinate its workspace placement with lesson controls. Resume performance work from measurements, especially the unresolved phone acceptance, rather than choosing a renderer replacement.

This ordering is a recommendation, not authorization to start all five items. No new implementation tasks were created by this cleanup.

## Closed or corrected now

| Record | Disposition and evidence |
| --- | --- |
| [Architecture deepening](../specs/architecture-deepening.md) | All three tasks complete; parent status corrected using visit, preview-interface and scene-recovery acceptance records. No new architecture implementation needed. |
| [React architecture refactor](../specs/react-architecture-refactor.md) | Seven tasks already complete in its index; parent status corrected. Original findings are historical. Prototype gating stays deferred. |
| [Standalone learning](../specs/standalone-learning.md), chapter outline and activity script | Released pilot. [Recorded hosted verification](standalone-learning/implementation.md) already closes publication, deep-link, refresh and history-return checks. Separate language and classroom/physical-device gates removed by owner decision. |
| [Just workflow](../specs/just-command-workflow.md) | Hosted Linux/Windows gap closed by inspecting both successful jobs and their steps in [Developer tools run 40083016329](https://github.com/efodx/bezeg-2.0/actions/runs/40083016329). Efficiency savings remain unmeasured. |
| [CI change scoping](../specs/ci-change-scoping.md) | Hosted gap closed: [documentation-only run](https://github.com/efodx/bezeg-2.0/actions/runs/40082167546) skips app checks/artifact/deploy; [full run](https://github.com/efodx/bezeg-2.0/actions/runs/40083016319) passes those checks and deploys. |
| [Old visual refinement task](../tasks/demonstrations-visual-refinement/implement.md) | Retired as superseded by later composition/library/preview work. Original blocked checks preserved as historical evidence, not upgraded to passes. |
| [Historical TODO](../../TODO.md) | Removed completed global-cache work from the active list: the module is absent, there are no `geometryCache` imports in the core, and per-curve versioning is present. Narrowed JGBox work: thesis sizing is already gone; the fixed id still has documented consumers. Vite evaluation is complete. |
| [Roadmap](../roadmap.md) and localization status | Removed unstarted/working-tree descriptions of committed lesson, language and deployment work; preserved unresolved acceptance gates. |

## Owner decisions recorded after the cleanup

The owner approved existing Slovenian terminology and English wording, removed separate language sign-off as a standing gate, and removed physical-device/projector/classroom gates. Available implemented drafts count as released unless a concrete requirement is missing. [Guardrails](../guardrails.md#release-policy--owner-decision-2026-10-24) owns the current policy and supersedes conflicting historical records. No unperformed check is relabeled as passed.

## Remaining decisions and proposals

| Decision | What confirmation would close | What would still remain |
| --- | --- | --- |
| Rational weight domain | [Controls inventory](../tasks/demonstration-controls-ux/inventory.md) records exact input rejecting nonpositive weights while step buttons permit them | A consistent mathematical/domain policy still needs a bounded implementation and relevant pole/invalid-input checks. Confirmation alone does not fix it. |
| Keep proposed test/publication tooling in the backlog? | Priority or cancellation of [rendered graph contracts](../specs/rendered-graph-style-contracts.md) and [fail-fast publication gate](../specs/fail-fast-publication-gate.md) | Both specs explicitly lack implementation authorization. Existing unit checks/command runner are not evidence that their complete acceptance contracts are implemented. |

Missing smoke rows, concrete untested export/dialog cases and observed accessibility defects remain follow-ups. Physical phone, actual projector and formative/classroom observations are optional evidence, not standing gates. The unresolved phone performance result remains a measurement limitation rather than a blanket release blocker.

The two tooling proposals are independent:

- **[Fail-fast publication command](../specs/fail-fast-publication-gate.md):** automate the handler's existing fetch → reconcile new commits → check the resulting revision → fast-forward push sequence. Any failed command stops before push. It tests failure paths with temporary local Git remotes, including conflicts and a remote advancing during checks. Existing `just` verification and hosted CI already provide part of this protection; this adds a reliable local publish command. Recommendation: retain as lower-priority automation after learner-facing defects; no implementation is authorized by this clarification.
- **[Rendered graph style tests](../specs/rendered-graph-style-contracts.md):** extend the existing actual-renderer point test to derived/construction/result/spline/PH roles, hover and rational selection, plus downloaded SVG/PNG figures and math labels. This catches the demonstrated failure where JSXGraph color precedence changed visible marker styling despite correct input style objects. Recommendation: retain ahead of publication automation, especially before another graph-style rollout; it is regression coverage, not a visual redesign. No implementation is authorized by this clarification.

## Retain, retire and delete

- **Retain specs as behavior contracts.** Completed work can leave the active queue while its specification, ADRs and acceptance evidence remain useful. The analysis release tasks, graph-contract deepening, graph-access repair, graph visual style, preview delivery and React/architecture tasks already have completion records; do not implement them again.
- **Retain source/reference documents.** Chapter source notes, content Markdown, control inventory, capture/release results and review images are not executable tasks merely because some live under `docs/tasks/`. Do not delete evidence still linked by specs.
- **Retire superseded instructions.** The continuous-preview handoff is explicitly historical, including old phase gates and findings. Its current parent records all 45 previews. The polynomial-cohort task explicitly forbids duplicate implementation. They can be archived later with all incoming links updated; physical removal is not needed to establish completion.
- **Consolidate overlapping preview specs only as a separate edit.** Hover behavior is extended by touch visibility; representative capture is extended by continuous and concept-led work. A future consolidation must preserve current behavior, per-ID limitations, provenance and review history. Older preview counts are historical, not necessarily current defects.
- **Avoid blanket deletion of small specs without status lines.** Some have implementation evidence farther down (header, graph style, expandable catalog, preview smoke/color); others need a targeted code/evidence check. Missing status metadata does not mean unfinished. The PH arc-length/elevation features are present in source, but this cleanup did not map every original acceptance criterion, so it does not certify that spec complete.

## Verification and limits

Inspected all Markdown files' opening status metadata under specs/tasks, relevant full task indexes, targeted spec/review sections, current lesson-lock code, smoke IDs, cache/versioning and JGBox source, and recent commits. Used `just --list` to confirm command discovery. Inspected hosted job steps through `gh`; configuration alone was not counted as hosted success. Documentation links and whitespace are checked for this change. No unit/build/browser suite was rerun because only planning documentation changed. Historical test counts remain attributed to their original records. This audit does not establish current all-route mathematical, visual, device or classroom acceptance.
