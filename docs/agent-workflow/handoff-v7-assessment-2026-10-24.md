# Handoff v7 outcomes and v8 revision

Assessment date: 2026-10-24. Source contract: [evaluation follow-up](../specs/agent-workflow-evaluation.md#v7-assessment-follow-up--2026-10-24). Previous assessment: [handoff versions v1–v6](handoff-versions-2026-10-20.md). Current dispatch instructions: [agent workflow](../agent-workflow.md).

The v7 assertion wording did not prevent vacuous assertions on its own; independent review and smoke continued to catch them. Browser-environment setup failed the same way in almost every browser task. The owner adopted six narrow changes; their effect is unmeasured.

## Sample

Ten task records follow the v1–v6 assessment cutoff, from “preview capture/evidence interface (task 02)” through “Chapter activity control access”. Nine carry handoff-v7 explicitly. The scene-action-limits record names v7 but was reviewed in the main chat. Seven used a Codex handler with GPT-6 Luna workers; three used a Claude handler with Opus 5.5 or Sonnet 5.5 workers. Roles: six implementation, two standalone reviews, two S UI fixes (counted among implementation). Sizes, harnesses, models and acceptance differ, so the observations are correlated, not controlled comparisons.

## Observations

| Pattern | Records | Evidence |
| --- | --- | --- |
| Vacuous or non-proving assertions despite v7 | 2 of 5 test-writing implementation records | Scene recovery: an assertion could not prove the intermediate read; assertions sat inside an expected-throw path. Graph transient state: review found vacuous tests although the brief required test-first and a deletion test. Each needed a repair round. |
| Observed red regressions, no assertion findings | 2 | Chapter return control and chapter activity controls both reported a failing test before the fix. Both were S tasks, so size confounds the comparison. |
| Brief omitted persisted-data compatibility | 1 | Preset collection ownership: browser smoke, not unit tests or reviews, found a stored rational Preset rejected and replaced by the default scene. The repair message stated the HEAD-compatibility principle. |
| Sandboxed loopback blocked previews/browsers | 7 of 7 Codex browser records | Each required escalation; none counted as an app failure. |
| In-app browser unavailable inside subagents | 3 | Scene recovery, student review and UX review; reviews finished through a handler relay. |
| Shared Playwright artifacts collided | 1 | Chapter activity controls: parallel runs on separate ports shared `test-results/`, causing three ENOENT trace errors and a misjudged stall. |
| Prospective dispatch timestamp missed | 5 of 10 | Required by the workflow; elapsed comparisons therefore unavailable. Scoped usage appeared only in the three Claude records (tool notifications). |
| Routing mismatch | — | The smoke skill required Luna `max` while the table said `high`; the Claude column had no smoke path in practice (graph transient state ran smoke in the handler). |
| Logging boilerplate | most records | The evaluation skill both required marking context data unavailable and said omission means unavailable; records repeat unavailability sentences. |

Positive evidence: no integration failure attributable to overlapping writes; independent review and smoke found real defects in at least three records; partial acceptance stayed explicit throughout.

Alternative explanations: vacuous assertions may stem from task difficulty or source acceptance rather than wording; the red-first S tasks are easier than the L/M tasks that failed; environment failures depend on the Codex sandbox, not on brief content.

## Adopted changes

The owner authorized all proposals on 2026-10-24.

- **A (brief → v8):** each new regression assertion reports an observed failure against pre-change code or a deliberate mutation; review briefs check that new assertions would fail without the change.
- **B (brief → v8):** when a slice touches stored Presets, imported files or routes, Context states that data and links valid at HEAD keep working, or names the accepted break.
- **C (dispatch):** under Codex, run loopback previews and Playwright outside the sandbox from the first attempt; plan Playwright or a handler relay instead of in-app browser access in subagents.
- **D (tooling):** `playwright.config.cjs` suffixes `test-results` and `playwright-report` with the port when `SMOKE_PORT` is not the default 4173; default and CI paths are unchanged.
- **E (routing):** separate review and smoke rows, matching the smoke-tester skill. Codex smoke stays Luna `max`. Claude smoke splits by scope: Haiku 5.5 `medium` for narrow checks, Sonnet 5.5 `medium` for broad or first-pass smoke (see below).
- **F (logging):** omit unexposed context fields; read dispatch/acceptance times from a clock command when they occur.

Model, effort and task-size defaults are otherwise unchanged; three Claude records do not support a change.

### Claude smoke model and effort

The owner questioned the initially adopted Sonnet 5.5 `high`. Local transcripts show effort is a minor usage factor: in the two surviving full Codex smoke rollouts (Luna `max`), cached input was 95–96% of 1.4–3.5M tokens and reasoning 11–18k. Usage scales with browser steps and accumulated context, not effort.

Pricing the seven recoverable Claude smoke runs (10-10 to 10-17) request by request from their recorded usage gives $9.22 at Sonnet 5.5 rates and about $1.53 at Haiku 5.5 rates (83% lower). This uses the skill-cached 2026-10-06 prices, assumes cache read 0.1× and cache write 1.25× input, applies Haiku's over-100K tier per request, and assumes equal step counts. Quality evidence for Haiku: four narrow catalog/viewport smokes completed in 2–10 minutes without recorded problems; the one broad Haiku smoke (controls UX redesign) exceeded its budget, reported a misread heading as a failure and missed two controls, needing more handler follow-up. Haiku pilots generally met explicit checks but missed implied visual issues. No same-task Sonnet comparison exists. Future check: handler follow-up and false-failure counts on the next Haiku narrow smokes and Sonnet broad smokes.

## Future observations

- A: on the next comparable geometry/state test task, does review still find vacuous assertions? Recurrence with observed-failure evidence reported would count against A.
- B: does the next storage- or route-touching task avoid a late compatibility regression?
- C/D: count setup retries and artifact collisions in the next browser tasks.
- F: dispatch-timestamp capture rate in the next five records.
