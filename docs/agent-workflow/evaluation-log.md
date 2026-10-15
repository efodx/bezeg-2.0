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
