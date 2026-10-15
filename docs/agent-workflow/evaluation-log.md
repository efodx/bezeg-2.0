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

Repairs: one review round. Of the findings, 4 were mathematical or wording errors in lesson content: a Darboux gap of 4/n instead of 8/n, an overstated reason for the Taylor bound, a mislabelled bound, and Slovenian grammar. The rest were 3 UI findings (legend swatch, narrow captions, terminology) and engineering duplication across the four graphs. Integration failures attributable to workers, found by the handler's smoke run: lesson formulas overflowing at 390 px and a stale preview manifest (expected). A browser screenshot pass then found caption and label collisions that unit tests and the smoke rows did not detect, fixed in one layout round. Worker smoke rows were only syntax-checked until the release run; that gap is where these failures surfaced.

Timing/context: task start about 2026-10-15T21:55+02:00, acceptance 2026-10-16. One handler compaction, requested by the owner between topics. Worker context and usage unavailable apart from per-worker completion totals in tool results (about 0.08–0.31 M subagent tokens each).
