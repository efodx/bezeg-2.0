---
name: smoke-tester
description: Delegate a short browser smoke check for changes that cross routes, shared workspace/runtime behavior, persistence, lessons, rendering, or hosting; for an isolated visual or single-route control tweak, use focused browser validation instead unless the user explicitly requests smoke testing.
---

# Smoke tester

Answer whether the selected main workflows still function in the tested checkout. Keep the run bounded and evidence-based; a smoke pass establishes only the reported coverage.

## Triage before dispatch

Classify the change before loading the full smoke workflow:

- **Focused validation:** Use a direct browser check in the handler for a route-local styling change, copy adjustment, spacing/layout fix, or one isolated control whose state and data model are unchanged. Verify the affected route and the changed interaction only; do not dispatch this skill's worker for this lane.
- **Delegated smoke:** Use this skill when the change affects shared workspace components, multiple routes or graph families, routing/hosting, persistence/import/export, lessons, renderer or lifecycle behavior, mathematical output, or a cross-cutting interaction. Also use it when the user explicitly asks for a smoke test.

Choose the smallest lane that covers the actual risk. A UI change is not automatically a smoke-test change: the deciding question is whether the change can affect workflows beyond the directly edited route/control. State the selected lane and its reason in the handler's final report.

## Prepare and dispatch

1. Read repository instructions and the project's smoke checklist. For Bezeg, read `docs/smoke-tests.md`. If no checklist exists, select a small set from documented user workflows and the changed behavior, and state that selection.
2. Record the checkout path, HEAD revision, dirty state, change scope, and available target URL. Reuse a suitable local preview; otherwise derive launch instructions from the repository. Prefer a local production preview when practical. Identify a development preview as such. Confirm the target serves this checkout before describing results as verification of its changes.

   If preview ownership is unknown, report checkout verification as blocked. You may check the supplied preview's general behavior, clearly attributing observations to that URL and leaving revision unknown; those results do not verify the working-tree changes. A missing URL requires local launch or blocked browser coverage.
3. Select checks and a default ten-minute elapsed budget including setup. Include a stable representative baseline plus checks relevant to the change. Avoid repeating sufficient checks already evidenced for the same code and environment.
4. Spawn one testing subagent with a self-contained assignment: skill path, checklist path or selected checks, checkout, revision/dirty state, change scope, target URL or launch instructions, budget, output contract, and allowed side effects. Follow repository model/effort preferences; in Bezeg use `gpt-6-luna` with `max` from a Codex handler or, from a Claude handler, the `bezeg-smoke` agent with Haiku 5.5 `medium` for narrow checks (named routes, repair rechecks, catalog/asset checks) and Sonnet 5.5 `medium` for broad or first-pass smoke of new UI, with a fresh history. If the exact requested settings are unavailable, report the limitation and ask for a fallback; continue independent preparation. If delegation itself is unavailable, report that limitation and perform authorized checks in the handler, explicitly identifying that fallback.

The worker executes the checks and reports to the handler. It does not invoke this dispatch section again or create further agents. Keep implementation, Git staging, commits, deployment, and dependency changes with the handler.

## Worker execution

- Use available browser tools to exercise visible user behavior. Read the tool's instructions or relevant computer-use skill before operating it. Record what changed on screen; a mounted board alone is insufficient evidence of a working drag or slider.
- Use an isolated browser session or fresh origin for stateful checks. Create uniquely named temporary data and remove only data created by this run. On a shared session, restore language, selected preset, and scene when possible; report incomplete cleanup. Preserve existing saved data and unrelated files.
- Start a local preview only if needed and authorized by the assignment. Track processes/tabs created by this run and release them after checking; before returning, confirm by PID that every server, browser and script this run started has exited. Reuse existing services without stopping them.
- Bezeg opens in Slovenian. Set the language explicitly before using text locators, or locate by role, label or element id shared by both languages.
- Use the Playwright Chromium already installed. A missing browser or dependency is a blocked result for the handler, since installing changes the shared checkout.
- A refused loopback connection under a sandboxed handler means the preview must run outside the sandbox: report it blocked on the first attempt.
- Inspect console/runtime errors when tools expose them. If unavailable, report that coverage limitation. Record a reproducible symptom before a brief retry; keep diagnosis bounded and return fixes to the handler.
- When browser access, launch, or a required action is unavailable, mark the dependent checks blocked. Static inspection and HTTP/build success are separate evidence, never substitutes for browser passes.
- Finish within the budget, allowing time for cleanup and reporting. Mark unattempted checks skipped with a reason, including budget exhaustion. Report observed failures without asserting they were introduced by the current changes unless comparison evidence establishes that.

## Report and handler acceptance

Return the tested URL, preview type, revision and dirty state, elapsed time, viewport/browser details, and a table of each selected check with status and concrete evidence. Use these statuses:

- **Passed:** the expected behavior was exercised and observed.
- **Failed:** observed behavior contradicted the expectation; include steps, expected/actual results, and screenshot or error evidence when available.
- **Blocked:** an environment or tool limitation prevented execution.
- **Skipped:** deliberately unattempted; explain scope, redundancy, or time budget.

Include cleanup results and coverage limits. Say the selected smoke checks passed only when all selected checks passed; otherwise summarize failures and incomplete coverage. Keep mathematical correctness, performance claims, physical-device behavior, comprehensive accessibility, and production hosting acceptance separate unless specifically tested.

The handler reviews the evidence, integrates findings with other required verification, and assigns any fixes through the repository workflow. Rerun affected checks after corrections; broaden coverage only when the failure warrants it.
