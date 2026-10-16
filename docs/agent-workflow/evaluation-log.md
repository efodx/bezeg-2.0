# Subagent workflow evaluation log

Append one compact record per completed or blocked task using [`do-log`](../../tools/skills/subagent-flow-evaluation/SKILL.md), covering all its worker roles together. Standalone research, review, and smoke assignments count as tasks; include useful handler-only comparisons. Keep summaries concise and non-sensitive. This log is observational; records do not establish causation.

## Current record format

Use this compact core for ordinary tasks, then add one handoff note per worker. Omit unavailable optional telemetry and non-applicable fields; omission means unavailable or inapplicable, never zero or successful. Keep acceptance gaps and missing evidence that limits a comparison explicit. Historical records retain their original wording; corrections are appended.

```text
### YYYY-MM-DD — task identifier/link
Roles/class/size/scope: worker roles or handler-only; class; S|M|L; concise scope
Dispatch: reason; worker count (or 0), roles and requested model/effort; handler and resolved worker settings when exposed
Outcome: accepted/partial/blocked; checks; coverage gaps; integration failures and attribution
Repairs/timing: applicable repair rounds, cause and status; observed start and completion timestamps, elapsed boundary and external waits; usage with scope when exposed
Context: handler and each worker; starting/peak input tokens, reported window, compactions during work; source/scope and startup exclusions, or unavailable
Handoff — worker role: brief revision; decision-bearing wording or saved reference; material omission/clarification; instruction added/changed and observed follow-up outcome when applicable
```

For handler-only entries omit handoff, worker repair rounds, and worker settings. Set S/M/L before dispatch and keep it unchanged: S is one localized outcome with one owner; M has several files or behavior branches with one primary owner; L crosses modules or has independently verifiable slices.

Keep full initial/revised prompts, field-by-field completeness, staffing detail, and expanded finding counts in a bounded repository-local evidence file only for handoff investigations or labeled prompt-format pilots. Ordinary records need a decision-bearing excerpt or saved reference. Preserve this initial sample exactly; new records use the compact format.


## Task records

### 2026-10-15 — Compact delegation and handoff feedback

Roles/class/size/scope: documentation implementation and independent validation; workflow; initial overall size unknown (not recorded), validation S; [spec](../specs/agent-workflow-evaluation.md). Authorized policy revision, not a performance pilot.

Dispatch: isolate skill/log edits and independently exercise behavior; handler model/effort unknown; implementation and validation workers each requested GPT-6 Luna/high, resolved settings unknown, count 2.

Outcome: accepted; diff, 36 local links/anchors, TOML defaults, and exact legacy-log preservation checked. Two synthetic exercises produced an honest record and a concrete wording proposal from comparable handoff failures, excluding unrelated research. Product/model performance remains untested. Packaged validator blocked by missing PyYAML; frontmatter checked separately. App/browser tests n/a; runtime model resolution and escaped defects unknown.

Repairs: 0 handler-to-worker rounds; handler corrected per-assignment aggregation and restored owner authorization. Validator failure is tooling-related. First dispatch unknown; first clock observation 15:02:04 UTC, accepted 15:08:00 UTC on 2026-10-15; total elapsed and external waits unknown; handler-plus-worker usage unknown. Missing initial size/timestamp limits comparison.

Handoff — implementation: handoff-v1; “Preserve all historical log entries exactly”; preservation verified. Evidence-file location unspecified; worker kept it flexible, no blocking clarification. Added worker instruction n/a; handler changed logging to one enclosing task record, future effect unknown. Scope compliance observed; causation unknown.

Handoff — validation: handoff-v1; “Use ONLY the supplied synthetic evidence and current format section” and “no live log entries.” Both outputs returned without edits. Worker reported ambiguous model labels and retained unknown settings. Added instruction n/a. Concrete focus-management wording proposed from two comparable fixture records; this demonstrates suggestion behavior only, not better product outcomes.

## Initial sample (legacy format)

| Date | Task / class and size | Workflow / worker model and count | Elapsed (boundary) | Repair rounds | Review findings / escaped defects | Integration failures | Outcome | Usage (scope) | Notes |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| 2026-10-13 | Demonstrations opening prototype; UI, medium ([spec](../specs/demonstrations-opening-prototype.md)) | Delegated; GPT-6 Luna Max, 1 worker | unknown | 1 | Handler found featured Bernstein label on a Bézier sketch and an emoji-style lesson arrow; both repaired before acceptance; escaped defects unknown | None attributable to code; initial dependency and sandbox browser setup blocked checks until repaired | Prototype acceptance passed; production design pending owner choice | unknown | Three variants, desktop/mobile captures, focused catalog tests, TypeScript, and production build; no production push |
| 2026-10-13 | Variant C carousel refinement; UI, small ([spec](../specs/demonstrations-opening-prototype.md)) | Delegated; GPT-6 Luna Max, 1 worker | unknown | 2 | Handler found initial page scroll, wrapping/cropped choice content, narrow desktop width, and abrupt preview change; repaired before acceptance; escaped defects unknown | None attributable to code | Prototype acceptance passed; production design pending owner review | unknown | Chromium checked 1440/810/390 px, route and keyboard changes, reduced motion; TypeScript, focused tests, and production build passed; no production push |
| 2026-10-13 | Demonstrations opening carousel; UI, medium ([spec](../specs/demonstrations-opening-carousel.md)) | Delegated; GPT-6 Luna Max, 1 worker | unknown | 3 | Handler found an aria-live test mismatch, focus transfer that could move the page vertically, and keyed preview remount that dropped action-link focus; corrected before acceptance; none observed after acceptance | None attributable to code; sandbox blocked initial loopback browser access until retry and blocked direct Jest rerun via temp-path `EPERM` | Local acceptance passed; physical touch and hosted deployment not tested | unknown | Route tests 9/9 (worker), TypeScript, production build, 36/36 catalog smoke tests and focused production desktop/390px browser checks passed before the final focus-preservation correction; final smoke rerun was interrupted after the runner hung |
| 2026-10-13 | Demonstrations visual refinement; UI and generated-preview workflow, multi-file ([spec](../specs/demonstrations-visual-refinement.md)) | Delegated; GPT-6 Luna Max, 5 workers (2 implementation, 2 review, 1 smoke) | unknown | 1 handler-to-worker round; handler made follow-up smoke-assertion corrections | Review found 44px carousel target, responsive preview legibility, duplicated coordinate policy, and scale-estimate/load-readiness gaps; corrected before commit, severity unknown; no post-acceptance findings | Production build blocked by missing `sass-embedded`; browser smoke blocked because local server was unreachable from browser/PowerShell | Partial pass: implementation, typecheck, focused unit and preview validation passed; build/browser acceptance incomplete | unknown | 34/34 generated previews and manifest entries, 720×440, no containment failures; smoke runner did not verify rendered page |
| 2026-10-14 | Demonstrations selector and topic headers; UI, small ([spec](../specs/demonstrations-selector-and-topic-refinement.md)) | Delegated; GPT-6 Luna Max, 1 worker | unknown | 0 | No actionable handler findings; image activation/decorative-alt regression assertion added before acceptance; escaped defects unknown | Production build stopped before bundling because Vite could not resolve `sass-embedded`; attribution to this task unknown | Partial pass: focused page tests (10/10), TypeScript, and direct dev-browser checks passed; production build and production smoke could not run | unknown | Route-local focused browser lane; selector, rail scroll, keyboard focus, thumbnail disclosure, SL/EN at 390/724/1440 checked; enlarged text and physical touch not covered; no repair round |
| 2026-10-14 | Subagent flow evaluation commit rule; workflow skill, small ([skill](../../tools/skills/subagent-flow-evaluation/SKILL.md)) | Handler-only; 0 workers | unknown | n/a | No review findings observed | Skill validator could not run because bundled Python lacks PyYAML; skill frontmatter and edited instruction reviewed manually | Partial pass: requested commit policy is documented; automated skill validation unavailable | unknown | No code tests applicable; pending prior-task log entry included with this change |
| 2026-10-15 | Homepage carousel and dedicated catalogue; UI, multi-file ([spec](../specs/homepage-carousel-and-demonstrations-catalogue.md)) | Delegated; GPT-6 Luna Max, 4 workers (implementation, tests, engineering review, browser smoke) | unknown | 3 (two test setup/type repairs, one responsive CSS repair) | Before acceptance: missing file-scoped graph mock, ambiguous jsdom header query, test lookup typing, and 390px enlarged-text overflow/title compression; corrected. Minor unused import/focus-padding cleanup by handler. Severity unknown; no escaped defect observed | Initial focused run 37/40; corrected to 40/40. Initial sandboxed build falsely failed Sass resolution; unsandboxed build passed without dependency changes | Local acceptance passed: TypeScript, production build, focused40, browser45, independent review, real carousel and interaction checks | unknown | Delegated smoke plus handler doubled-text12-case matrix and shared-header baseline; physical device/projector, screen reader, complete lesson suite, and hosted deployment unverified. See review evidence |

## 2026-10-15 — Homepage visual flair

- Source: [homepage visual flair](../specs/homepage-visual-flair.md); implementation, UI presentation, size S estimated before dispatch. One bounded homepage outcome.
- Handler: GPT-6 family; exact model/effort unknown. One fresh implementation worker requested GPT-6 Luna/high; resolved setting unknown. Delegated the separable two-file styling slice; handler owned spec, review, production build, browser checks, and Git.
- Brief: handoff-v1, source spec plus explicit 390/724/1440 and both-language fit, preserve carousel logic/content and unrelated dirty files, homepage-scoped styles. Positive outcome: only the two assigned homepage files changed. No material missing context reported.
- One pre-acceptance review clarification: inset shadow might be covered by opaque children; use a real rail, and widen the 14ch headline for two desktop lines. Worker changed to a 5px left border and 17ch measure. No test failure or later repair round; attribution is handler review guidance, not an observed browser regression.
- Accepted: focused tests 2 files/12 tests; TypeScript and production build passed. Handler browser review passed both locales at all three widths, keyboard selection/focus, catalog/brand navigation, graph and lesson entry, image loading. Enlarged text, physical touch/projection, comprehensive accessibility, and hosted CI remain unverified.
- Environment: sandbox Sass resolution and loopback access failed; identical build/preview outside sandbox worked without repository dependency changes. Unrelated PH snapshot and local prototype/spec files preserved.
- Observable task window: dispatch preparation 15:15:44 UTC to browser acceptance 15:21:21 UTC (5m37s), including tool and environment waits; worker-only elapsed and usage unknown.

### 2026-10-15 — Correction to Homepage visual flair acceptance

The implementation and recorded checks passed, but acceptance was partial: enlarged-text usability was a required criterion in the [source spec](../specs/homepage-visual-flair.md) and was not verified. The earlier “Accepted” label overstated coverage. This correction adds no new browser evidence and preserves the original record.

### 2026-10-15 — Observable delegation records and acceptance coverage

Roles/class/size/scope: handler-only; workflow documentation; S; bounded correction across the [workflow and evaluation contract](../specs/agent-workflow-evaluation.md).

Dispatch: 0 workers; small, tightly coupled wording changes kept with the handler. Owner authorized optional-telemetry omission and the previously proposed handoff/acceptance fixes.

Outcome: content checks passed; packaged skill validation incomplete because bundled Python lacks PyYAML. All 23 local file links resolve, historical task records preserved exactly before append, unchanged skill frontmatter manually checked, and diff whitespace checked. No product behavior changed; app/browser tests do not apply. Missing required acceptance checks remain explicit, while unavailable optional telemetry is omitted. New handoff-v2 behavior has not yet been observed on a product assignment.

Timing: first clock observation 15:30:30 UTC to content-check completion 15:31:48 UTC (1m18s); this excludes earlier analysis and subsequent logging/Git work, so it is not total task elapsed time.

## Backfilled Claude Code delegation records (2026-10-10 to 2026-10-14)

These ten tasks used Claude Code subagents and were not logged when they ran; Codex-run tasks above were. They were reconstructed on 2026-10-15 from the Claude Code transcripts (parent session, each worker's `subagents/*.meta.json`, and the workers' hand-back reports). They are retrospective: S/M/L sizes were assigned after the fact, no dispatch-time estimate exists, and timestamps are UTC from transcript events. Requested model/effort come from the spawn input or meta file; "resolved" is the model id recorded on the worker's own transcript messages. Effort "unset" means the spawn did not pass one. Usage is omitted: transcript token counts are not reliable for scoped usage. Accepted/pushed status comes from the parent session's closing report, not from re-running anything. Observational only; no causation is claimed. The in-progress `analysis-batch-a` task (16 workers, unpushed at the time of this backfill) is not recorded here and should be logged by its own session when accepted or blocked.

### 2026-10-11 — Guided lesson cohorts B–E and lesson smoke suite (worktree `cohort-b-lessons`)

Roles/class/size/scope: 25 workers (11 graph-seam, 5 lesson-content, 4 smoke, 4 fix/rework, 1 integration); UI plus lesson content; L (retrospective); new guided lessons for the remaining Bézier demonstrations, then a smoke-suite restructure.

Dispatch: slices were file-disjoint and run in parallel waves. Requested sonnet, effort unset; resolved claude-sonnet-5-5 on all 25. Handler settings not extracted.

Outcome: accepted and pushed to `master` (b031894); CI smoke (6m9s) and deploy passed. Local checks across slices: `tsc`, full Jest (315–316 tests on the last content slices), production build, built smoke 187/187, then 107/107 after restructuring. Smoke time fell from 187 tests/10.6 min to 107 tests/3.1 min. Workers repeatedly reported which checks they did not run (build, Playwright).

Repairs/timing: 4 follow-up fix/rework assignments after findings. Before acceptance: Cohort B smoke found 3 real UI defects (390px horizontal overflow, z-index); lesson prose lacked math delimiters, which led to the `lessonMathNotation` guard test; Cohort D smoke found a blocking "Next fails mid-lesson" bug on `subdivision` and `rational-subdivision`; the extrapolation worker reported rational default weights going non-positive before the slider limit; the Farin lesson text went stale after a concurrent master change. Parallel seam workers saw each other's in-progress edits as failing tests/type errors (coordination, not code defects). The handler self-reported force-pushing the feature branch after a rebase without asking, against the repository rule. First worker 15:29, last worker end 01:14 next day; session 15:21 to 01:24 including long waits and ~10-minute smoke runs.

Handoff — all roles: briefs named an exact slice and file set ("Slice N"; seam workers first added only the listed `LessonAction` variants; nothing committed). Brief revision unlabelled; verbatim briefs are in the transcripts. Workers stayed inside their slices; cross-worker interference showed up only as transient test failures. Added instructions not recovered.

### 2026-10-11 — Farin control points movable (worktree `farin-movable-points`)

Roles/class/size/scope: 1 implementation worker; geometry/UI; S (retrospective); keep control points draggable while Farin points are shown.

Dispatch: single bounded fix. Requested sonnet, effort unset; resolved claude-sonnet-5-5.

Outcome: accepted and pushed (8e5855e) on top of the latest `master` because `codex/bezeg-2.0` was 24 commits behind. Handler checks: `tsc`, build, 317 unit tests, 113 smoke tests. The CI run (38097487190) had started; its result is not in the transcript.

Repairs/timing: 0 recorded. Worker 23:46–23:48 on 2026-10-10; session 23:45 to 00:10 (24 min).

Handoff — implementation: wording not extracted; the worker's three-file change matched the request and it ran `tsc` and the full unit suite.

### 2026-10-11 — English-mode Slovenian text leaks (worktree `workspace-localization-leaks`)

Roles/class/size/scope: 1 implementation worker; localization; S (retrospective); five hardcoded Slovenian workspace strings moved to `t()`.

Dispatch: single worker. Requested sonnet, effort unset; resolved claude-sonnet-5-5.

Outcome: partial acceptance. Pushed (d9d4f1d; 6be6f13 is an unrelated AGENTS.md rule commit). On the new base the handler ran `tsc` and the build only; unit tests and browser smoke were not rerun and the Pages deploy was not watched. The worker ran the localization and workspace tests.

Repairs/timing: 0 recorded. Worker 11:34–11:35; session 11:33–11:42.

Handoff — implementation: wording not extracted.

### 2026-10-11 — Idempotent "Fit to points" (worktree `fit-points-idempotent`)

Roles/class/size/scope: 1 implementation worker; board behavior; S (retrospective).

Dispatch: single worker. Requested sonnet, effort unset; resolved claude-sonnet-5-5.

Outcome: partial acceptance. Pushed (cd6ab7f). The worker ran `tsc`, focused tests and the build and stated it did not run a browser; no later browser check or deploy check is recorded, so real-board behavior is unverified.

Repairs/timing: 0 recorded. Worker 11:44–11:48; session 11:42–11:54.

Handoff — implementation: wording not extracted.

### 2026-10-11 — PH arc-length readout and elevation overlay (worktree `ph-arclength-elevation-overlay`)

Roles/class/size/scope: 3 workers (2 parallel implementation, 1 repair); geometry display; M (retrospective); first two items of the owner's TODO.

Dispatch: parallel feature slices. Requested sonnet, effort unset; resolved claude-sonnet-5-5.

Outcome: accepted and pushed. Final checks: `tsc`, build, Jest 586/586, full smoke 108/108. Neither feature worker ran a browser.

Repairs/timing: 1 repair round. The handler's English browser check found board text not redrawn on language switch (arc length stayed "Dolžina loka" after SL to EN); fixed by adding `onLanguageChange`/`currentLanguage()` (f74dabb). Environment: Jest's glob failed on the `.claude` worktree path segment, so workers used a `--testMatch` override. Workers 12:28–12:52; session 12:26–13:04.

Handoff — implementation: wording not extracted; the defect was found by handler browser review, not by worker checks.

### 2026-10-12 — Functions and calculus family, eight concepts (worktree `function-concepts`)

Roles/class/size/scope: 12 workers (8 sequential implementation, 3 parallel read-only reviewers: math, engineering, UI/accessibility; 1 fix); new demonstrations plus 5-step lessons; L (retrospective).

Dispatch: one implementation worker per concept, then parallel specialist review. Requested sonnet, effort unset; resolved claude-sonnet-5-5 (reviewers included).

Outcome: partial acceptance. Pushed; the closing report states `tsc` clean, 1104 unit tests, production build, and full smoke 140/140. Gaps: lessons are drafts needing the owner's language review, and two citations were written from memory and are unchecked.

Repairs/timing: the definite-integral worker did a 5-point rework after handler review; the review slice produced a fix assignment. Math review: no calculation errors, wording/terminology findings (e.g. Slovenian "antiderivacija"); engineering review: no high-severity defect; UI/a11y findings were fixed in the fix slice (count not extracted). Environment: the shared `node_modules` was emptied while two worktree junctions pointed at it (cause unknown; the worker worked around it). Workers 12:48 on 2026-10-11 to 11:42 on 2026-10-12 with an overnight gap; session 12:40 to 11:51 next day.

Handoff — implementation and review: briefs scoped one concept per worker with reviewers read-only; wording not extracted. Reviewers' reports were specific (file, line, severity, confidence).

### 2026-10-11 — Math labels in SVG figure export (worktree `demo-preview-mathjax`)

Roles/class/size/scope: 1 implementation worker found in transcripts; export; M (retrospective); duplicated-formula bug in `SvgMathLabels`.

Dispatch: single worker. Requested sonnet, effort unset; resolved claude-sonnet-5-5. Earlier workers for the initial export implementation, if any, are not in the recovered transcripts.

Outcome: partial acceptance. Pushed (f290520); the worker said it did not re-run the real-browser export, and the Pages deploy was still running at session close. The handler reported the same local checks passing before commit.

Repairs/timing: 0 recorded. Worker 13:52–14:00; session 11:56–14:14.

Handoff — implementation: wording not extracted.

### 2026-10-13 — React architecture refactor, seven tasks (worktree `react-architecture-spec`)

Roles/class/size/scope: 15 workers (8 implementation for tasks 1–7b, 1 performance measurement, 6 reviews: engineering plus spec/UI/browser for tasks 3, 5 and 4); architecture; L (retrospective).

Dispatch: per-task specs in `docs/tasks/react-architecture/`; tasks 1–3 and 6 ran in parallel. Requested sonnet, effort unset; resolved claude-sonnet-5-5.

Outcome: accepted and on `master` through 6e78abf; CI passed. Final worker checks: `tsc`, Jest 91 suites/1218 tests, build with `CI=true`, smoke 141/141.

Repairs/timing: the implementation workers for tasks 3, 5 and 4 each continued after review for 8, 6 and 6 items. Findings before acceptance: the performance measurement found no change on 8 of 10 scenes but a 2.4x–3.7x slowdown on the quintic PH hodograph drag, fixed by O(1) geometry version reads (25130bb, cherry-picked to `master` as 01abdfc); reviews found stale controls after Reset (tasks 5 and 4) and a one-frame "Preparing graph" state (task 3, low-medium). The task 6 worker committed on its own worktree branch despite a no-commit brief; the handler cherry-picked, and branch `worktree-agent-a49a66e4fc32e61eb` still holds the original commits. Task 1 deliberately kept curve-selection commands still used by the workspace path. Environment: Jest's default path match found no tests in worktree paths. Workers 15:36 on 2026-10-12 to 01:35 on 2026-10-13; session 14:33 to 01:35.

Handoff — implementation: briefs said not to commit, not to run state-changing git, not to delegate, and named the task file and spec; workers otherwise stayed in scope (exception above).

### 2026-10-13 — Create React App to Vite and Vitest migration (worktree `vite-migration`)

Roles/class/size/scope: handler-implemented; 1 read-only review worker; build tooling; L (retrospective).

Dispatch: review only. Requested sonnet/high; resolved claude-sonnet-5-5.

Outcome: accepted and pushed; CI run 38417598471 passed and deployed. Handler checks: Jest 91 files/1224 tests before and Vitest the same count after, `tsc`, build in about 6 s, 141 Playwright tests, 16/16 old-versus-new screenshot pairs identical across 8 routes at desktop and phone widths. Physical device and hosted-asset checks beyond CI are not recorded.

Repairs/timing: the reviewer, which re-ran none of the handler's claims, found one real bug (`scripts/bezier-benchmark/build.cjs` still required webpack and loaders formerly pulled in by `react-scripts`) and stale-document items; their disposition was not recovered. Worker 14:51–14:52; session 14:21–15:04.

Handoff — review: read-only review brief; wording not extracted.

### 2026-10-14 — Review of the previous day's commits and six fixes (worktree `fix-review-findings`)

Roles/class/size/scope: 6 workers (3 read-only reviewers for lesson/controls, Vite and demonstrations commits; 3 implementation workers on file-disjoint slices); M (retrospective).

Dispatch: reviewers passed no model and resolved to claude-opus-5-5 (inherited); implementers requested sonnet/high and resolved claude-sonnet-5-5.

Outcome: six bugs fixed and pushed as 0037b05, 76079cf, 0465a24 and beed431 (6ec1268..beed431). Checks: `tsc`, 1297 unit tests, production build, smoke 142/142. The Pages deploy was not watched. Per-reviewer finding counts were not extracted.

Repairs/timing: 0 recorded rounds after implementation; the handler reviewed each diff before committing. Reviewers 11:15–11:28; implementers 11:33–11:39; session 11:15–11:46 (31 min).

Handoff — implementation: each brief named the files that worker alone owned and warned that two other workers were editing in parallel; all three stayed in their lanes and reported unrun checks (for example, scripts not exercised against a real build).

### 2026-10-15 — Apply historical workflow findings

Roles/class/size/scope: handler documentation and one read-only research worker; workflow; overall size not captured before dispatch, research S; [historical follow-up](../specs/agent-workflow-evaluation.md#historical-follow-up--2026-10-15). Owner authorized the proposed improvements; historical runs remain evidence for the earlier workflow.

Dispatch: 1 fresh research worker requested GPT-6 Luna/high, handoff-v2; isolate the supported Git-control investigation while the handler owns tightly coupled workflow/spec edits, verification, and Git. Resolved settings and usage unavailable.

Outcome: workflow now uses handoff-v3, checks indirect control/graph transitions, coordinates shared verification resources, requires stable integrated acceptance, and covers migration scripts and finding disposition. GitHub API confirmed active master-only ruleset 25172820 with one non-fast-forward restriction and no bypass actors. Worker-only Git enforcement remains unavailable in this shared dispatch environment and is documented as a limitation. Model defaults and all prior log text preserved. Documentation links/anchors, brief revision, acceptance mapping, and diff reviewed; product/browser tests do not apply. Workflow effectiveness on subsequent product tasks remains unmeasured.

Repairs/timing: 0 handler-to-worker repair rounds. First clock observation 15:57:44 UTC; worker reported completion 15:58:59 UTC. Sandbox blocked initial fetch and GitHub API access; escalated retries succeeded. Integrated content verification and Git occur after this entry; no total elapsed time claimed.

Handoff — research: handoff-v2; “Distinguish supported settings, this runtime's actual capability, and best-effort command matching” and “Do not claim shared Git hooks establish worker identity.” Returned official sources and enforcement limits without edits, commits, or further delegation. No material clarification requested; handler verified the relevant documentation and remote rules through the API. No revised instruction or follow-up assignment.

## 2026-10-15 — CI documentation-only fast path

- Class/size: CI execution policy, M; source: `docs/specs/ci-change-scoping.md`. Local implementation accepted 16:22:48 UTC; task/dispatch began 16:19:26 UTC (3m22s to local acceptance). Hosted validation remains pending the push.
- Dispatch: bounded workflow/detector/tests ownership, one implementation worker plus one independent engineering reviewer; both requested GPT-6 Luna high. Handler owned spec, documentation, integration, verification, and Git. Resolved model settings/usage were not exposed.
- Handoff: `handoff-v3`; required exact Markdown allowlist, PR merge-base and complete push ranges, conservative rename handling, full fallback, stable `smoke` identity, and explicit full-verification deployment gate. Worker could not delegate or commit. Reviewer inspected the actual diff and source spec read-only.
- Repairs: one handler feedback round during implementation added the missing push-before environment binding, malformed event fallback, and always-on standalone tests; a final conservative path correction removed backslash normalization and added documentation-only deletion/rename plus unreadable-event coverage. These were code/coverage issues, not model or environment escalation. No attributable integration failures remained.
- Outcome: nine detector tests passed for worker and handler; handler additionally exercised the CLI entry point on a real documentation-only commit, checked Node syntax/diff whitespace, and passed Actionlint 1.7.12 with ShellCheck/Pyflakes disabled. Independent reviewer found no actionable issues; handler reviewed final small corrections. App/browser suites were not run locally because no app/runtime/build behavior changed. Hosted Actions remains a separate verification gap.
- Environment: GitHub CLI token invalid, but Git fetch succeeded with existing Git credentials after sandbox escalation. Actionlint was downloaded to temporary storage; no dependency changes. Unrelated untracked design work preserved.

## 2026-10-15 — Demonstrations library redesign

- Class/size: feature / L, crossing catalogue, routing, shared workspace, graph playback owners, localization, and lessons. Source: [spec](../specs/demonstrations-library-redesign.md); [acceptance evidence](../reviews/demonstrations-library-redesign.md). Handler owned workspace integration, review, verification, and Git.
- Dispatch: four distinct workers. Collection implementation, playback-owner implementation, and browser-test implementation requested `gpt-6-luna` / `high`; two implementation workers subsequently performed parallel read-only engineering/mathematical and UI/accessibility reviews. The smoke worker requested `gpt-6-luna` / `max` under the smoke-tester skill. Resolved settings and scoped usage were not exposed. Collection start was observed at 18:44:28 +02:00; local acceptance at 19:29:14 +02:00. Handler start was not separately captured, so these are not a whole-task duration measurement.
- Handoff-v3 evidence: collection brief required one controlled page/picker collection, typed localization, URL/history retention, and preservation of unrelated untracked work. Playback brief required a graph-owned current-frame pause and existing export/scene locks, without a reset or animation rewrite. Browser brief required real graph/board identity, numerical scene retention, focus/background isolation, and responsive checks. Clarifications added fresh scroll capture at activation, current-lesson continuation, presentation retention, and a real running-animation pause case. Those flows passed after integration repairs.
- Repairs: bounded follow-ups corrected a translation-key union, whitespace-only query handling, fresh return context, busy-action accessibility, Tab wrapping, Escape consumed by native search, and an obsolete three-column lesson rule. Browser selectors/assertions were corrected where multiple graph entry controls or lesson frame expectations were ambiguous. The exact aggregate repair-round count was not captured. Linear lesson object limits retained their bound while excluding viewport-owned axis/tick labels; 24 affected lesson rows passed. No mathematical algorithms or preview assets changed.
- Outcome: implementation and local behavior accepted; physical device, virtual keyboard, projector, comprehensive screen-reader, and hosted-deployment acceptance remain unverified. Unit checkpoint: 111 files / 1,614 tests; final affected unit/localization and TypeScript checks passed. Complete browser run: 165 passed, two old linear-count failures subsequently closed by the 24-row rerun. Final focused browser rerun: 57/57 passed with tracing disabled locally after a Windows trace-close artifact failure; the preceding failure occurred after catalogue assertions. Repository/CI trace settings were retained. Production builds passed. Same-process production previews and scoped escalation resolved sandbox loopback/Sass resolution failures without dependency changes. Temporary worker scripts and diagnostic output folders were cleaned; screenshot evidence retained. Preset deletion was not exercised by the delegated smoke worker. No changes to workflow routing policy are inferred from this one task.

## 2026-10-15 — Individual demonstration visual identity

- Source: [spec](../specs/individual-demonstration-visual-identity.md). Class: shared presentation styling; estimated size S before implementation dispatch. Two workers: bounded implementation requested GPT-6 Luna/high, browser smoke requested GPT-6 Luna/max; handler owned scope, review, integration, verification and Git. Resolved settings/usage unavailable. Exact task-start/dispatch timestamps were not captured, so no elapsed comparison is asserted.
- Handoff-v3: implementation owned workspace TSX/new identity CSS, with instruction to retain exact copy, board backgrounds, geometry and presentation contrast; local botanical reuse only, no home/catalog refactor. Handler feedback preserved `#fffdf5`, removed hidden decoration padding in presentation and protected title width; one bounded repair round completed before production verification. Optional action-button radius polish was not carried out after the build freeze.
- Smoke handoff-v3: frozen production build, owned preview on 4188, representative families, languages/widths, lesson, presentation and keyboard; existing 9-test workflow/picker evidence supplied to reduce duplication. No integration failure. Initial sandbox preview/network access required an outside-sandbox preview; transient Vite missing CSS occurred while files were still being written and cleared at stable checkpoint.
- Outcome: implementation complete; acceptance partial only for unavailable enlarged-text verification. Workspace unit tests 11/11, TypeScript, production build, diff check and production workflow/picker tests 9/9 passed. Delegated browser checks passed 390/724/1440 in SL/EN without document overflow, representative families, slider construction, PH auxiliary editor, lesson flow, presentation and keyboard. Zoom action timed out unchanged; physical touch/projector/comprehensive accessibility/hosted CI remain outside observed evidence. See spec for detailed evidence.

### 2026-10-15 — Shared header aesthetic alignment
- Class/size: UI styling / S; handler implemented one tightly coupled CSS change against [header spec](../specs/header.md#aesthetic-alignment--2026-10-15).
- Delegation: one smoke worker, requested GPT-6 Luna / max with fresh history; implementation/review stayed with handler. handoff-v3 specified production preview ownership, home/catalog/graph at desktop/390px, 44px targets, focus/navigation, language retaining graph, 200% text, and screenshots. Worker start/dispatch timestamp was not captured precisely; elapsed-time comparison unavailable.
- Outcome: accepted. TypeScript/build passed; delegated Chromium checks passed on three routes at 1440×1000 and 390×844, including doubled header text, keyboard focus/navigation, SL/EN graph retention, hover/current states, and no console/page/request errors. Handler inspected home desktop and graph mobile screenshots. Browser zoom and physical device/projector review are outside coverage.
- Repairs: no code repair rounds. Sandbox Sass resolution, dependency filesystem permissions, and loopback access delayed setup; locked npm ci and escalated build/preview resolved them without tracked dependency changes. Initial smoke brief pointed to an inaccessible sandbox preview; follow-up supplied reachable escalated port4188 and explicit installed Chromium path, after which worker completed checks. No attributable integration failures.

### 2026-10-16 — Retrospective Codex context backfill

Scope: owner-requested historical context measurements for 142 recovered Bezeg Codex workers from October 8–15; [per-worker evidence and method](context-usage-2026-10-16.md). This supplements historical records without changing their outcomes or attributing defects to compaction.

Context: local rollout `token_count` request-input measurements and top-level `compacted` events. Seventeen workers compacted during work; fifteen additional workers had startup-only records under the disclosed five-second heuristic. October 13–15: 4/38; October 15: 3/19. Complete per-worker starting/peak input, reported window, startup counts, compactions, and first-compaction wall time are in the evidence file. These are context measurements, not billed or cumulative usage; handler context and Claude runs are outside this extraction. Encryption and recovered-history coverage limit attribution; symptoms or adverse outcomes were not correlated.

Context supplement — [demonstrations library redesign](#2026-10-15--demonstrations-library-redesign): playback 33,726 starting / 191,189 peak input; browser tests 33,771 / 173,698; smoke 33,922 / 160,936. Each reported a 258,400-token window and one during-work compaction, first observed at 22.9, 20.9, and 14.5 minutes respectively. Collection and all other recovered workers are included in the linked table. Requested model settings remain as historically recorded; this extraction makes no model-resolution claim.

### 2026-10-16 — Retrospective Claude context backfill

Scope: owner-requested historical context measurements for 97 recovered Bezeg Claude Code workers and 30 handler sessions from October 10–15; [per-worker evidence and method](claude-context-usage-2026-10-16.md). Counterpart to the Codex backfill above; supplements historical records without changing their outcomes.

Context: transcript `usage` request input (uncached + cache creation + cache read) and `compact_boundary` records. Workers started at 20,134–39,174 input (median 36,262) and peaked at median 125,607, maximum 387,751; 26 exceeded 200k. No worker compacted. Handlers recorded three distinct compactions, all manual; none automatic. Claude transcripts report no context-window size, so window is unavailable; peaks are not comparable to Codex's 258,400 window as a capacity fraction. Symptoms or adverse outcomes were not correlated.

### 2026-10-16 — Context-aware delegation guidance and logging

Roles/class/size/scope: handler-only; workflow documentation; S, one tightly coupled guidance change expanded by owner-requested routine context logging and historical backfill; [source acceptance](../specs/agent-workflow-evaluation.md#context-follow-up--2026-10-16).

Dispatch: 0 workers; handler retained the small documentation slice. Updated brief to handoff-v4 with relevant entry points and stable browser preview ownership/reachability. Task-size and model defaults unchanged; fresh workers between roles remain a hypothesis.

Outcome: documentation acceptance complete; skill validator passed, 35 local links/anchors checked, 142 evidence rows verified, historical task records preserved, and bounded diff reviewed. Documentation-only: no application/browser tests required. Runtime effectiveness remains unmeasured. Unrelated worktree edits preserved; publication targets only these workflow files.

Repairs/timing: initial system Python was inaccessible; bundled Python validated the skill. Corrected a PowerShell extraction quoting error before saving evidence. First clock observation 22:13:43 UTC, documentation acceptance 22:16:54 UTC on October 15 (October 16 locally); task start was not captured, so no whole-task elapsed time asserted. Scoped cumulative usage unavailable.

Context: handler starting/peak input, reported window, and compaction count unavailable in current tool results; no workers dispatched. Historical worker context is recorded separately above, with source and exclusions.

### 2026-10-16 — Analysis guided lessons Batch B

Roles/class/size/scope: Claude Code handler (Opus 5.5) with Sonnet 5.5 workers; feature; L, four independently verifiable topics (extrema, convexity, Darboux sums, Taylor) plus a batch release; [tasks 05–09](../tasks/analysis-guided-lessons/README.md).

Dispatch: 13 workers. Part A: 4 parallel mathematics workers (Sonnet; Taylor at high effort for remainder-bound correctness). Parts B/C: 4 sequential graph+lesson workers (Sonnet; Darboux bundled its maths, the others built on committed maths), each the sole owner of the shared integration files. Release: 3 parallel read-only reviewers (mathematics on Opus; engineering and UI/accessibility on Sonnet), 1 review-fix worker, and 1 board-layout worker. The layout worker was stopped by an accidental user interrupt and replaced by a fresh worker briefed on its partial edits. Brief: handoff-v3, with the previous topic's commit named as template and a settled vocabulary.

Outcome: implementation and release acceptance complete. Commits 19a6751…3c1910d on `batch-b` were pushed together after verification. tsc is clean, vitest passes (124 files, 1978 tests), the build passes, and the full production smoke suite passes 183/183. A scripted browser pass covered SL/EN live switch, desktop and 390 px, drag, keyboard and reveal. Coverage gaps: no physical touch device or projector, Slovenian prose pending owner review, and source citations unverified against the book.

Repairs: one review round. Of the findings, 4 were mathematical or wording errors in lesson content: a Darboux gap of 4/n instead of 8/n, an overstated reason for the Taylor bound, a mislabelled bound, and Slovenian grammar. The rest were 3 UI findings (legend swatch, narrow captions, terminology) and engineering duplication across the four graphs. Integration failures attributable to workers, found by the handler's smoke run: lesson formulas overflowing at 390 px and a stale preview manifest (expected). A browser screenshot pass then found caption and label collisions that unit tests and the smoke rows did not detect, fixed in one layout round. Worker smoke rows were only syntax-checked until the release run; that gap is where these failures surfaced. After the push, hosted CI (Linux Chromium) found 390 px overflow in three Darboux/Taylor explanation frames that passed locally on Windows; fixed in one handler round and the deploy succeeded.

Timing/context: task start about 2026-10-15T21:55+02:00, acceptance 2026-10-16. One handler compaction, requested by the owner between topics. Worker context and usage unavailable apart from per-worker completion totals in tool results (about 0.08–0.31 M subagent tokens each).

## 2026-10-16 — Demonstration controls UX specification audit

- Role/class: read-only research for a UX specification; one bounded scope audit. Size was not recorded prospectively, so no size-based comparison is supported.
- Dispatch: one GPT-6 Luna worker requested at high effort under handoff-v4; delegated facts discovery required by the grilling skill while the handler interviewed the owner. Brief: identify current Display order, shared inspector/control boundaries, scroll ownership, and applicable existing specs; no file edits, browser use, commits, pushes, or further delegation.
- Outcome/checks: worker located BaseGraph/BaseCurveGraph Display composition, PH/elevation append behavior, shared inspector scrolling/tab reset, phone height cap, and relevant existing specs. Handler used these findings in docs/specs/demonstration-controls-ux.md and inspected the cited spec constraints. No repair rounds or attributed integration failures observed. Research accepted; image examples were subsequently retained with the specification and the owner authorized publication. No application implementation or behavioral verification was performed.
- Handoff/context: brief explicitly preserved dirty lesson/catalog changes and distinguished settled Display ordering from unresolved product decisions. No clarification was needed; worker returned focused files/symbols and made no edits. Only dispatch date was captured; precise start/completion timing, resolved settings, usage, handler/worker context occupancy, window sizes, and compaction telemetry are unavailable. No timing or context comparison is claimed.
- Publication: the owner initially requested waiting for image review, then authorized publishing the specification and repository-local image references to master on 2026-10-16. Application implementation remains deferred.

### 2026-10-16 — Carousel preview transition

- Task class/size: localized UI fix, S (one implementation owner); handler start approximately 13:39, dispatch 13:42, accepted 13:46 Europe/Ljubljana.
- Worker: requested gpt-6-luna/high, fresh context, handoff-v4; owned HomeDemonstrationsCarousel.tsx/CSS. Brief required a stable 300 ms crossfade, immediate reduced motion, preserved behavior, no Git operations. Returned two-file implementation without repairs.
- Handler diagnosed loaded keyed image fading from zero opacity (0.347 sampled), reviewed diff and screenshots, ran 8 homepage tests, TypeScript, build, and focused Chromium desktop/narrow checks for overlap, stable dimensions, autoplay/manual/rapid/keyboard/reduced-motion behavior. All passed; full smoke and physical-device testing out of scope.
- Context occupancy, resolved worker settings, and scoped usage unavailable; no compactions observed. Unrelated branch commits and dirty files preserved; deployment isolated to origin/master.

## 2026-10-16 — Calm catalog preview loading

- Class/size: bug fix, S (estimated before dispatch); source: `docs/specs/catalog-preview-loading.md`. One bounded implementation worker, followed by one browser verification worker; handler owned spec, review, integration, and Git.
- Routing/brief: `handoff-v4`; implementation requested GPT-6 Luna/high, smoke requested GPT-6 Luna/max. Brief required decode-gated reveal, reserved pale frame, first three filtered images eager, reduced motion, cached/error/stale lifecycle behavior, and preservation of unrelated Batch C changes. Resolved settings, usage, and context occupancy/window/compactions were not exposed. Exact initial dispatch/start timestamp was not captured; no elapsed-time claim.
- Outcome: implementation accepted on 2026-10-16 after review and verification on isolated `origin/master` checkout (base `7d21bfc`, implementation `2ebec14`; local branch equivalent `17eb955`). No mathematical assets, routes, preset data, or localized copy changed. Source branch's unrelated dirty changes were preserved.
- Checks: TypeScript passed; production build passed; focused preview/page/workspace component tests passed (3 files, 25 tests). Delegated Chromium checks at 1440 and 390 CSS px passed for delayed placeholders, failed images, decoded reveal with 180 ms opacity transition, eager/lazy attributes, filtering while loading, reduced motion, narrow layout, and shared picker filtering/cancellation with graph preservation. Handler inspected desktop pending and narrow screenshots. No browser page errors; the injected HTTP 503 was the expected console error.
- Limits: preview responses use `Cache-Control: no-store`, so HTTP reload-cache behavior was not established. A ready-image remount reused its resource without another request; a dedicated completed-image unit test covers the cached mount path. No full mathematical/lesson smoke, physical-device, or hosted Pages acceptance was claimed.
- Repairs: handler caught an ineffective cached-image test setup (mock getters before mount) and TypeScript rejected deletion of readonly mocked properties (use `Reflect.deleteProperty`); corrected checks passed. Browser harness needed path/sequence/selector corrections; these were test setup issues, not application regressions. No implementation repair was required after browser verification.

### 2026-10-16 — Master preview smoke assertion repair

- Scope: S, test maintenance; align catalog loading and homepage selected-image assertions with the approved preview specs. Handler-only, 0 workers: one small, tightly coupled correction across two smoke files. Source: docs/specs/preview-smoke-assertions.md.
- Outcome: accepted locally at 12:22:08 UTC. All three original CI failures reproduced on isolated origin/master ebf148a; both complete affected smoke files then passed, 51/51 in 1.0 minute. Production build and diff check passed. Reviewed in the handler. No app behavior changes; other smoke files were not rerun locally.
- Repairs: no repair rounds after the assertion fix. Root cause was stale test expectations after the eager-loading and mounted-image crossfade changes. Initial fetch required normal sandbox escalation; no code failure was attributed to the environment. Existing unrelated dirty files were excluded through an isolated worktree.
- Evidence limits: precise task start boundary was not captured, so total elapsed time is unavailable. No workers or handoff briefs. Handler context occupancy, context-window size, compaction count, and scoped usage were not exposed.

## 2026-10-16 — Representative preview task breakdown and motion design

- Role/class: repository-local planning and capture/player design. Handler-only, 0 workers: the specification and dependent task contracts were one tightly coupled planning slice; no implementation was dispatched. Size and start timestamp were not captured prospectively, so no size/timing comparison is supported.
- Outcome: expanded the existing representative-preview proposal and created six executable tasks. Owner clarified captured states plus possible lightweight smooth Bezier control-point motion. Planned offline real-board frames encoded as short silent clips, required PNG posters, discrete/smooth timelines, three pilots, activation-only delivery, reduced motion, isolated control-point choreography and explicit size/quality gates. Runtime implementation remains future work.
- Checks: handler inspected current capture tooling, collection loading/navigation, lesson action vocabulary, figure-export interfaces, task conventions and dirty catalog/route state. All relative links in eight planning documents resolved; staged whitespace checks passed. No application tests/build/browser run was required for documentation-only planning; codec support, payload targets and capture feasibility remain pilot acceptance work. Initial link-check command could not launch the Windows Python alias; equivalent Node check passed. No code repairs or attributed worker failures.
- Publication: documentation isolated onto a clean origin/master checkout to preserve unrelated Batch C commits and working changes. No runtime/asset changes included. Context occupancy, window size, resolved handler settings, usage and precise elapsed time unavailable; no compaction observed.


### 2026-10-16 — Thesis-motivated Bézier study chapter

- Role/class/scope: documentation and narrow source research; owner selected Bézier curves for the standalone-learning pilot and supplied Štampar's 2024 thesis. Handler drafted the chapter outline; one worker audited current graph/lesson support. Estimated size and exact dispatch timestamp were not captured prospectively, so no size/timing comparison is claimed.
- Dispatch: one research worker requested GPT-6 Luna/high, fresh context, handoff-v4. Brief limited writes to `docs/specs/bezier-study-chapter-source-notes.md`, preserved unrelated dirty work, prohibited implementation/Git/delegation, and required verified defaults, activity support, and gaps. Research skill required delegation; repository narrow-research routing selected the setting. Resolved settings and usage unavailable.
- Outcome: planning research accepted at 2026-10-16 13:49:44 UTC (15:49:44 Europe/Ljubljana). Handler extracted thesis introduction and relevant Bézier sections, visually inspected printed pp. 3, 7, 9, reviewed worker source paths, verified exact cubic midpoint/interpolation rows and sampled quadratic expansion, and checked 83 local documentation links. Capability audit identifies cubic/quartic default mismatch, Bernstein starting degree, missing cross-demonstration synchronization/return context, and global control-point influence. No application behavior changed; browser, classroom, final learner-facing copy, and owner approval of the proposed outline remain unverified future work.
- Repairs: one wording correction: replace degree exactly n with nominal representation degree n and possibly lower actual degree for special controls. Worker made that correction only. No attributed integration failure. Python stdout encoding needed UTF-8 for Slovenian source extraction; this was an environment issue, not a worker reasoning failure.
- Context: handler and worker starting/peak input, reported context windows, compactions, and scoped cumulative usage were not exposed by current tool results; no context comparison is asserted. Exact original brief was not saved because this was not a handoff-format investigation. Publication carries only task documentation and this appended record; unrelated evaluation-log edits in the working checkout are preserved.


### 2026-10-16 — Shared study chapter specification with picture examples

- Role/class/size: documentation specification and reference assets; M handler scope, with two S read-only review slices estimated before dispatch. Owner accepted the two UI mockups and shared Demonstrations with independent catalog discovery, then explicitly requested specification and publication to master. No application implementation authorized in this task.
- Dispatch: two fresh-context reviewers requested GPT-6 Luna/high under handoff-v4 at 2026-10-16T14:07:25Z. Engineering reviewed navigation/state/lifecycle and existing runtime ownership; learning/math/UI-accessibility reviewed prerequisite/content scope, graph tasks, and the selected pictures versus written requirements. Briefs prohibited writes, further delegation, commits, and pushes and preserved unrelated dirty work. Resolved worker settings and usage unavailable.
- Outcome: accepted at 2026-10-16T14:10:21Z after one repair round. Engineering's two findings specified actual explicit-return Back/Forward behavior and a validated history marker for refresh restart messaging. Learning review corrected 'through control points' to 'using control points' and added non-drag/keyboard/assistive-technology access and text feedback for graph tasks. Both reviewers confirmed closure with no residual issue on their findings. Handler also fixed affine activity scope alignment and selected the initial ordinary Bernstein basis view.
- Checks: 92 local file/anchor references across eight changed Markdown documents; both reference PNGs are 1536x1024 and byte-identical to the accepted generated originals; staged whitespace check passed. Images are implementation references only and are not loaded by the app. No TypeScript/build/browser run required for documentation-only publication; final learner-facing translation/content, actual route/state behavior, device/accessibility, and production feature acceptance remain implementation gates. No attributed integration failures.
- Timing/context: dispatch-to-review-acceptance boundary 2m56s, covering both parallel reviews plus handler repairs; whole-task start was not captured. Handler/worker starting and peak input, context windows, compactions, scoped cumulative usage, and resolved runtime model settings were not exposed; no context comparison is asserted. Publication uses a clean master-based checkout and includes only these docs/assets plus this record, preserving unrelated evaluation-log edits in the main checkout.

### 2026-10-16 — Analysis guided lessons Batch C

Roles/class/size/scope: Claude Code handler (Opus 5.5) with Sonnet 5.5 and Haiku 5.5 workers; feature; L, four independently verifiable topics (sequence convergence, uniform convergence, fixed-point iteration, complex multiplication) plus a batch release; [tasks 10–14](../tasks/analysis-guided-lessons/README.md).

Dispatch: 14 workers, brief handoff-v4.
- Part A: 4 parallel mathematics workers (Sonnet high), each 4–5 min, 0.08–0.10 M subagent tokens.
- Graph+lesson: 4 sequential workers, each the sole owner of the shared integration files: sequence (Sonnet high), then fixed point, uniform convergence and complex multiplication (Sonnet medium).
- Release: 3 parallel read-only reviewers (mathematics on Opus; engineering and UI/accessibility on Sonnet medium), 1 review-fix worker (Sonnet medium) and 1 board-layout worker (Haiku medium).
- Owner-requested pilot (labelled): effort high → medium for graph+lesson and fix workers after the first graph+lesson worker; then model Sonnet → Haiku (medium) for the layout round.
- New in the briefs: each graph+lesson worker ran its own smoke row, and Batch B's 390 px and caption lessons were stated up front.

Outcome: implementation and release acceptance complete. Commits `010fe87`…`d5c2214` plus the release documentation on `batch-c` were pushed together. tsc clean; vitest passes (138 files, 2428 tests); the build passes; the full production smoke suite passes 199/199; a scripted browser pass covered desktop and 390 px, drag, keyboard, reveals, playback and a live SL/EN switch. Coverage gaps: no physical touch device or projector, Slovenian prose pending owner review, source citations unverified against the book, two partial layout fixes (recorded in task 14).

Repairs: one review round and one layout round.
- Mathematics: 1 confirmed error (a shared N at epsilon = 1 for x^n on [0, 1]), inherited from the handler's task file. 1 floating-point boundary error in band membership (Part A code, visible through the graph).
- Wording: 4 mathematical wording errors and 1 Slovenian mistranslation in worker content.
- Engineering and UI: the rest; 7 board-layout collisions went to the layout round.
- Part A workers found one handler task-file error (the alternating-sign rule) before implementation.
- Integration: an API session limit stopped the uniform-convergence worker mid-run; it was resumed with its partial edits. The owner meanwhile committed unrelated work on the branch and published it to master, so the Batch C commits were cherry-picked onto `origin/master` before review. A wiped `node_modules` (probably an owner worktree removal) was repaired by a worker with `npm install`; a garbled test file of unknown cause was restored by the same worker.

Pilot evidence (observational; one batch, n = 1 per cell, topics differ in size and difficulty, later workers had better templates; not a basis for changing defaults):
- Graph+lesson at high, sequence: 35 min, 0.50 M tokens, 115 tool uses, about 10 later review findings (mostly UI/layout; 2 mathematical display issues).
- Graph+lesson at medium:
  - Fixed point: 31 min, 0.42 M tokens, 109 tool uses, about 6 findings (3 mathematical wording).
  - Uniform convergence: 3 findings, all minor. Its time and usage are incomplete because of the session-limit interruption: the resumed leg was 8 min, 0.40 M tokens, 30 tool uses.
  - Complex multiplication: 31 min, 0.39 M tokens, 116 tool uses, about 7 findings (mostly labels and input edge cases).
- All four graph+lesson workers were green at hand-back, including their smoke rows.
- Fix round at medium: 31 min, 0.34 M tokens, 150 tool uses, all 13 items fixed, one overstated note corrected by the handler.
- Layout round on Haiku medium: 15 min, 0.21 M tokens, 68 tool uses, 5 of 7 collisions fixed and 2 partly fixed (confirmed by handler screenshots), checks green.
- Medium effort showed no clear increase in errors and a modest reduction in time and tokens. Haiku completed a bounded layout task with partial results.

Timing/context: task start 2026-10-16T11:02+02:00 and acceptance the same day, with a pause for the API session limit (about 12:00–16:13). Handler and worker context occupancy and compactions were unavailable; usage is from per-worker completion totals in tool results.

### 2026-10-16 — Justfile session opportunity research

- Scope: S, research; inspect past Bezeg command records and current command contracts; save docs/research/justfile-session-opportunities-2026-10-16.md. One read-only research worker for separable official just documentation and repository command mapping; handler owned session mining, synthesis, review, and Git.
- Dispatch: requested GPT-6 Luna high, fresh context, handoff-v4. Brief required official sources, cross-platform concerns, recipes beyond redundant npm aliases, and no invented savings. Worker returned source links and recommendations without edits or further delegation; no repairs or material clarifications.
- Outcome: accepted report. Sample covers 113 prior local Codex session records, 69 with 1,613 distinct completed command IDs. Pattern counts are explicitly heuristic candidates, not invocation counts or measured savings. Representative command/output evidence reviewed; current npm, Playwright, server and capture contracts checked. All relative report links resolve; diff whitespace check passed. Documentation only, so app tests and smoke were not required. No justfile or application behavior changed.
- Limits: Claude sessions and dates outside October 14–16 were not analyzed; no tokenizer-based counterfactual or measured savings. Requested worker settings are not runtime-resolution evidence. Handler/worker context occupancy, window size, compaction counts, and scoped usage unavailable. Exact start/dispatch boundaries were not prospectively captured, so elapsed duration is unavailable. Unrelated working-tree changes preserved.

### 2026-10-16 — Prospective justfile token-saving forecast

- Scope: S, handler-only research follow-up, 0 workers; freeze numeric predictions and a measurable scoring contract in the justfile opportunity report. Small, tightly coupled documentation addition.
- Outcome: primary prediction is 8% median whole-task token reduction for recipes plus concise logged output; separate aliases-only and command-text forecasts prevent conflating mechanisms. Defined population, matched pairs, token accounting, uncertainty, acceptance reporting, adoption costs, and scoring. Handler reviewed consistency with the retrospective evidence; git diff --check passed. No app tests or smoke required for documentation only.
- Limits: forecasts are judgmental, not measured savings; affected token share is explicitly assumed. No task elapsed boundary or scoped usage/context telemetry captured; unavailable rather than zero. No worker handoff or repairs.

### 2026-10-16 — Just verification workflow implementation

- Scope: M, developer tooling; source docs/specs/just-command-workflow.md. Handler owns spec, discovery guidance, CI, integration, review and Git. One implementation worker plus two read-only independent reviewers (platform/CI and runner correctness), each requested GPT-6 Luna high with fresh context and handoff-v4; no worker delegation or Git writes. Existing npm scripts remain authoritative; no app/dependency/deployment-gate changes.
- Handoff evidence: bounded owned files and acceptance required shell-free argv, complete retained logs, fail-fast status, explicit build provenance, meaningful subprocess regressions, and preservation of unrelated work. Follow-ups clarified Node-as-interpreter argv convention and real downstream argument assertions. Five repair rounds addressed compiler entry path/fixture evidence, log failures and provenance coverage, Unix npm resolution, verbose sink errors, and backpressure cleanup. Early draft feedback also corrected async Git metadata and digest paths. These were tooling correctness/test gaps, not app failures.
- Outcome: local acceptance at 16:47:32 UTC on Windows Node 24.21.0 / just 1.59.0. Handler just check passed TypeScript, 138 unit files / 2,428 tests, and production build. Final just tooling-test passed 15 tests, with 1 Unix-only symlink test skipped on Windows. Quoted focused unit invocation passed. Both smoke-built and final build-and-smoke recipe passed the 2 selected homepage cases. Preview served a deep link HTTP 200; Ctrl+C propagated exit 130 and both task-owned ports were released. Syntax, recipe listing, documentation links, whitespace and handler review passed. Two independent reviews had actionable corrections applied and checked; final handler inspection added the backpressure regression. Existing build warnings remain discoverable in logs.
- Environment and coverage: sandbox denied loopback HTTP; the first smoke run was stopped by its owned process tree and rerun successfully with loopback access. Official just was installed with winget and archive verification; CI binaries are version/checksum pinned. Hosted Windows/Linux outcomes pending at this commit boundary. No manual UI smoke was needed for tooling-only behavior; the automated smoke subset validates the wrapper, not all app interactions. Only the unit run's line-ending-only snapshot effect was restored; unrelated untracked files preserved.
- Timing/telemetry: observed handler window 16:30:06–16:47:32 UTC (17m26s, includes installation and environment repair); actual task started before the first timestamp, and exact dispatch instant was not captured. Handler/worker context occupancy, window size, compactions, resolved worker model settings and scoped token usage were not exposed. No savings measurement or change to the original forecast.

### 2026-10-16 — Proportionate worker verification and repair

- Scope: S, handler-only workflow documentation, 0 workers; one tightly coupled policy revision authorized after the owner questioned universal preventive checks. Source: [proportionate verification follow-up](../specs/agent-workflow-evaluation.md#proportionate-verification-follow-up--2026-10-16).
- Outcome: documentation accepted at 16:53:34 UTC. Handoff-v5 asks workers to flag encountered mathematical contradictions; extra screenshots and deeper premise checks are targeted by risk. Required release review, smoke, and acceptance remain; focused repair is an ordinary completion path. Workflow and evaluation skill compare total effort through acceptance with escaped defects reported separately. Model and task-size defaults unchanged; runtime savings and effectiveness unmeasured.
- Checks: handler reviewed the bounded diff against the acceptance criteria, checked 15 local file links and skill frontmatter structure, and passed git diff --check. Historical records preserved by append only. No product tests or browser smoke needed for documentation-only changes. just was unavailable in this shell; direct documentation checks used. Unrelated untracked work preserved.
- Timing/context: first clock observation 16:52:39 UTC to documentation acceptance 16:53:34 UTC (55 seconds); excludes earlier reading, later logging and Git work, so not total task duration. Scoped usage and handler context occupancy/window/compactions unavailable; no worker handoff or repairs.

## 2026-10-16 — Representative demonstration previews

- Class/size: implementation L, estimated before dispatch; 45 route recipes/posters, three offline motion pilots, and shared catalog/picker playback. Source: `docs/specs/representative-demonstration-previews.md`; results in `docs/tasks/representative-demonstration-previews/{capture-results,release-results}.md`.
- Delegation: five workers across implementation, independent review and smoke (never more than four concurrent agents including handler). Requested settings: capture GPT-6.1 Sol/high and mathematical/engineering review GPT-6.1 Sol/high, strengthened from the provisional Luna route for ambiguous 45-route mathematical capture/provenance work; player GPT-6 Luna/high; visual/accessibility review GPT-6 Luna/high; smoke GPT-6 Luna/max per smoke skill. Resolved settings/usage telemetry unavailable. Handler retained integration, verification and Git.
- Handoffs: handoff-v5; bounded path ownership and no worker delegation/commits/pushes. Capture brief required supported UI, exact outcomes, staging, unchanged inputs, fixed-camera three-clip pilots and the partial media contract. Player brief required activation-only sources, cancellation/stale-event safety and sibling localized controls. Reviews used the spec independently. Smoke received a stable build, confirmed reachable production URL, source/output digests, existing 67-test browser evidence and a ten-minute budget.
- Outcome: implementation delivered; 45 distinct genuine posters and three 3-second clips (10,616/17,802/25,612 bytes), +1,327 gzip JS bytes, no new app dependencies or mathematical/default/lesson/route changes. Seven capture tests, 23 focused player/poster tests, 2,444 full unit tests, TypeScript, production build and 67 Chromium browser checks passed. Chrome/Edge smoke passed native decoding/MIME/deferred loading, 390px display, real drag/slider response and picker retention. Actual document-hide browser check was blocked by headless visibility semantics; 200% browser zoom skipped; physical device/projector, Firefox/WebKit and screen-reader checks unperformed. Two static targets retain explicit limitations (extrapolation original-interval distinction, inspector-only spline sample count); no owner-approved scope expansion or deferral inferred, and full target acceptance is not claimed.
- Repairs: iterative prepublication capture corrections for hidden controls, supporting polygons, rational labels, annotation/tick collisions, unequal analysis scales, camera agreement and idempotent motion strokes. Independent mathematical review prevented an extra elevation step and verified exact Bézier endpoints/stationary controls. Two handler player repair rounds after handoff fixed automatic-pass Stop and explicit-pass restart on contained focus; component/browser regressions passed. Early handler feedback also corrected TDZ and touch compatibility-event behavior. Capture round count was not separately tracked. No failed diagnostic output was deployed.
- Environment: initial just command lookup failed due stale process PATH despite installed WinGet executable; absolute invocation worked. Browser/socket access required approved escalation. User steering interrupted the initial workers; they were resumed after status inspection. The unit run's formatting-only snapshot write was restored, mathematical fingerprint returned to its captured value, and rebuilding produced exactly the same tested output digest.
- Time/context: local acceptance recorded 2026-10-16 17:48 UTC; exact initial dispatch time was not captured, so total elapsed is unavailable. Smoke reported about five minutes. Context occupancy/window sizes, worker compactions and scoped token usage were not exposed for handler or workers. No context-related failure attribution is inferred. Git/host verification continues in the release record.

## 2026-10-16 — representative previews, owner motion revision

- Class/size: implementation and release, L; bounded capture and shared-player slices after the owner's local visual rejection. Source: `docs/specs/representative-demonstration-previews.md`. Handler owns integration/Git. Owner explicitly changed acceptance to visible automatic looping without buttons, single-board affine/elevation animation, and carousel reuse without duplication.
- Delegation: capture revision GPT-6.1 Sol high (complex mathematical timelines/provenance), shared UI GPT-6 Luna high, independent math/engineering review GPT-6.1 Sol high (cross-cutting lifecycle and numerical review), independent smoke GPT-6 Luna max per smoke skill. Brief revision handoff-v5; fresh contexts. A homepage-preservation worker was canceled when the owner expanded carousel scope; its duplicate assets were removed before final integration. No worker committed, pushed or delegated further.
- Decision-bearing handoff: 'loop automatically while visible', 'offscreen media has no source', 'same assets/player for carousel', 'original/elevated/original full-board holds'; capture/build resources had one owner until atomic publication. UI and capture wrote disjoint paths. Full checks began after both handed off.
- Review repairs: per-visible-session media child and live/failure guards resolved stale events and late failed-play reveal; thumbnail target fill fixed zero-height keyboard target; catalog CSS scoped to avoid homepage geometry conflict. Capture diagnostic accessible-name mismatch stopped publication safely, then exact control name fixed. Rational central weight-label omission recorded rather than claiming all labels visible.
- Evidence so far: 45+6 publication validation;9 tooling tests;21 focused UI tests;139 files/2,434 full unit tests;TypeScript/build;all69 production browser cases covered (68 initial plus corrected focused loop case). Two-speed96sample math/camera equivalence and6native decode outputs passed. Main's two failed browser assertions were test assumptions (ambiguous thumbnail/title locator and only-one-visible clip), corrected to actual thumbnail target and viewport/source correspondence; no app fix required. No mathematical/default/lesson/route changes.
- Timing/context: capture final183.9s, full unit175.4s, typecheck/build16.7s. Exact dispatch-to-accept duration and scoped usage unavailable. Handler compacted during the ongoing task; token occupancy/window/worker compaction telemetry unavailable. No attribution to compaction is inferred. Browser-hidden-tab/physical-device and projector coverage remain explicit gaps; final independent smoke/hosted outcomes follow release evidence.
- Final independent smoke: about five minutes, installed Chrome/Edge1440×1000 and390×844; all six decode/loop, shared URLs, static-slide disposal, no overflow and single-board visuals passed. One generic Edge404 was not reproducible on focused200reload; hidden-tab/200%zoom blocked, physicaldevices/projector untested. Main's formatting-only rebuild had identical output, so existing browser evidence was retained. Final capture/player commits fb9b837 and0d008ae pushed fast-forward; hosted CI/deployment result is recorded in release evidence. Working tree clean after refreshing an identical-content CRLF file's index stat; master alignment check reports up to date.
- Hosted acceptance: Actions38946579958 passed2,434unit tests and207browser tests, then Pages deployed. Fresh Chrome matched the deployed entry bundle SHA to the local tested output and natively decoded all6hosted4sloops with video/webm; carousel/catalog URL sharing passed, no page errors. The diagnostic's initial deep-link200assertion was corrected to account for existing Pages404redirect behavior; direct catalog entry passed. Task-owned4300preview disposed; pre-existing3012preserved. Physical/headless limits and the two original static-scene gaps remain explicit in release/capture records.

## 2026-10-16 — Preview video color consistency
- Class/size: bug fix, M (estimated before dispatch); shared offline encoder and six media assets, spec `docs/specs/preview-video-color.md`.
- Dispatch: one implementation worker, requested `gpt-6-luna` / `high`, fresh context, handoff-v5; worker owned encoder/tests/media, handler owned scope, review, build/browser verification and Git. Brief required original-frame regeneration, exact background pixels, color metadata, unchanged scenes/posters, and <=300 KiB per clip. Dispatch boundary 18:47 UTC; acceptance recorded after final checks in this task. Resolved model/effort and scoped usage unavailable.
- Outcome: RGB VP9 CRF10 with explicit sRGB metadata; six regenerated clips and separate re-encoding provenance. All 576 source/decoded corner samples match; largest clip 292,962 bytes. Handler reviewed the small encoder/test diff directly; original frame hashes preserve mathematical scenes. Focused smoke lane: offline media only, no shared application-runtime change.
- Checks: TypeScript and production build passed; capture/encoder Node 10/10, asset manifest 45 posters + six videos valid; production motion browser 8/8 passed; handler Chromium visual review confirmed matching background and active playback. Physical-device/projector/non-Chromium coverage unavailable.
- Repair/integration: one publication repair. Worker initially published only WebMs and manifest, causing the publisher to prune posters; handler's concurrently started first build failed on missing imports. Worker restored all posters byte-for-byte from verified staging and republished the full set; clean diff/manifest and the subsequent build passed. No missing posters shipped. Clarification: handler requested a separately runnable real-encoder regression in addition to generation-time assertions; worker added it and reported 10/10 passing.
- Environment: `just` unavailable; used `node scripts/commands.cjs` and npm-compatible checks. Sandboxed localhost could not be reached; escalated temporary local server worked. Context occupancy/window/compactions for handler and worker unavailable; cumulative usage unavailable.
- Acceptance boundary: 18:56 UTC (about nine minutes after dispatch); focused preview unit checks also passed. Foreground decoded RGB mean absolute channel error 0.146–0.692, maximum 7–23; all four corners of all frames exact. Handler and worker timings exclude unavailable scoped token/usage telemetry.

## 2026-10-16 — Demonstration controls UX redesign (Haiku worker pilot)

- Class/size: implementation, L (estimated before dispatch); spec `docs/specs/demonstration-controls-ux.md`, all 45 routes; record `docs/tasks/demonstration-controls-ux/inventory.md`. Handler: Claude Opus 5.5 (Claude Code), owned seams (Display hook, `InspectorDisclosure`), integration, review fixes, browser follow-up and Git.
- **Pilot (owner-requested):** one changed factor — model. Every worker requested Haiku 5.5 `medium` instead of the table's Sonnet 5.5 `medium` for implementation/review/smoke (research row already Haiku). Hypothesis: Haiku medium can complete bounded L-task slices with acceptable repair load. Resolved settings not exposed; requested settings only.
- Workers (10, fresh contexts, handoff-v5, none committed/pushed/delegated): research inventory 1; implementation 6 (W1 shell layout, W2 input primitives, F1 shared curve controls, F2 curve families, F3 function/analysis, F4 smoke-test repair); review 2 (math/engineering, UI/accessibility); smoke 1. W1‖W2 then F1‖F2‖F3 ran in parallel with disjoint path ownership and separate localization insertion anchors. Reported worker tokens: inventory 246k, W1 106k, W2 138k, F1 137k, F2 182k, F3 183k, F4 135k, R1 103k, R2 116k, smoke 76k (tool-reported per-agent totals; not context occupancy). Worker durations 5.8–19 min.
- Timeline (+02:00): inventory dispatch 21:22, W1/W2 ~21:25, F1–F3 ~21:55, reviews ~22:04, F4 ~22:15, full browser pass 22:42, smoke ~22:43, handler acceptance 22:55 (≈1 h 33 min incl. ~11 + 7 min full browser runs).
- Handoff evidence: one mid-task clarification to W2 (integer slider `decimals`, keep `formatValue` callers for family workers) — followed. Briefs naming exact files, line anchors, retained exceptions and "report, don't guess" produced explicit contradiction flags (F1: rational weight positivity; F2: scheme-switch placement choice). Inventory corrected the route count (45 vs the brief's 48).
- Outcome: 7 commits (`7fd5df4`…`32336e0`). TypeScript clean; 144 files / 2,478 unit tests; production build; full Playwright 207/207; R2 browser geometry (1440×900, 390×844, 720×450) and smoke worker (1024×768, 724px, live SL→EN, lesson layout, presentation, 200% text) passed; handler browser repro for disclosure/no-selection, rational weights and keyboard preview passed; no console errors.
- Repairs (code): handler fixed W2's Enter-submits-form gap in Slider fields before commit; R2 found number-field contrast 2.2:1 (global `input[type]` colour) — handler fix; R1 found confirm-mode blur/Enter committing rounded display text (pre-existing logic) — handler fix + test; F2 formal Slovenian in two hints — handler copy fix; F4 helper regex lost a backslash (`/D+/`) — handler fix. First full browser run 12 failures, all stale test selectors (F4, one repair round, no app regressions; one motion timing flake not reproduced). Handler reverted one own unnecessary edit. Smoke worker's one "failure" was a misread heading (handler repro passed); it left two checks incomplete (selector lookup), finished by the handler.
- Pilot observations (facts, not a verdict): all six implementation slices passed handler unit/type review on first hand-back; defects found later were mostly integration/cross-file (CSS specificity, form semantics) or pre-existing, caught by reviewers/browser runs. Haiku reviewers produced concrete, reproducible findings. The Haiku smoke worker exceeded its 15-min budget, misattributed a heading, and could not locate two controls; smoke needed more handler follow-up than implementation. No Sonnet comparison run; single task, so no routing change is implied.
- Gaps/open decisions: physical device/projector, non-Chromium, screen reader untested; 724px graph narrow beside inspector (layout passes, prominence questionable); retained exceptions and open decisions (route commands hidden while a curve is selected, rational ± can reach weight ≤ 0, Shorten/Subdivide share a parameter, pre-existing `disabled` focus loss on De Casteljau Play and Taylor stepper) listed in the inventory. Handler context: ~287k of 1M at final checks, no compaction; worker context occupancy unavailable.
