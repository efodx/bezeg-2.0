# Consolidate tests around owned guarantees

Status: planned, 2026-10-25. Requested outcome: reduce repeated verification by making shared guarantees explicit and testing each at the narrowest credible seam. Implementation is queued in [five ranked tasks](../tasks/test-consolidation/README.md).

## Evidence and reassessment

Inspection of the current dirty checkout at `b3dc301` found 276 Chromium cases (`npx playwright test --list --reporter=list`). The guided-lesson file registers 153 cases, with another 13 registered from `lesson-experience-checks.cjs`. Its 45 lesson rows each run a desktop completion walk, an exit/re-entry scenario, and a narrow completion walk. The identical exit title wraps shared dialog/navigation checks, graph-specific state assertions and repeated board-count checks. Counts describe this checkout, not a frozen future target. The focused `LessonSession.test.ts` suite passed during inspection; the browser suite was listed, not executed. There is no measured speedup yet.

Publication recheck against fetched `origin/master` (`28d27da`) found two newer protections: `lessonSmokeCoverage.test.ts` already enforces catalog/row completeness, and `6619861` checks every frame's visible points against its board viewport at desktop and narrow widths after finding real lesson clipping defects. Preserve and reuse those checks. A single traversal must still exercise both viewport observations on every frame; representative desktop control checks do not replace content-specific framing coverage. Re-baseline counts/timings on the implementation revision.

Existing architecture already supplies useful seams:

- `LessonSession` owns frame/step transitions, exit restoration, completion and animation cancellation; `GuidedLesson` owns presentation and focus.
- `BaseGraph` captures/restores checkpoints, including preset data, scene state, transient state, viewport and display settings.
- `GraphTransientState.test.tsx` mounts every graph through the real host and JSXGraph in jsdom. It checks actual board/control observations, not only calls on mocks. Its `STALE_VIEW_CACHED_CURVES` exclusions currently weaken specific curve comparisons.
- `sceneContentAgainstGraphs.test.tsx` applies all authored scene actions synchronously. Acceptance without an exception is weaker than correct resulting mathematics; this suite alone cannot replace mathematical scene probes.
- Chapter activity lifetime/history behavior already has `ChapterActivityVisit` and `useChapterActivity` tests.

The priority is to use and strengthen these seams, not add another manager. A broad automatic resource-ownership migration is deferred: functions already have `own()` and cleanup, curves have different ownership, and no measured gain justifies migrating all of them as part of test reduction. A separate browser fixture application is also deferred; first remove repeated traversal using actual production routes and the existing render path.

## Ranked implementation priorities

| Rank | Work | Expected gain and limits |
| --- | --- | --- |
| 1 | Move repeated exit/restore/re-entry verification to a real-graph lesson contract | Largest directly identifiable repeated scenario: 45 browser cases become a documented implementation-risk sample plus lower-level coverage for every graph. No fixed sample size is assumed. |
| 2 | Concentrate shared lesson interactions in one feature matrix | Removes Observe/reopen, dialog, focus and navigation assertions repeated inside content walks. Browser coverage follows behavior variants, not lesson count. |
| 3 | Use one content traversal per lesson instead of separate desktop/narrow walks | Removes up to 45 duplicate full traversals. Narrow content rendering remains exhaustive; representative complete desktop flows remain. |
| 4 | Separate authored chapter scenes from shared activity lifetime/history checks | Six authored activities currently repeat the history/reset/refresh sequence. Keep every launch/scene assertion and a smaller set of real history workflows; savings are smaller than the lesson work. |
| 5 | Repair the excluded function-graph drawing comparisons | Correctness and architectural confidence gain, rather than a direct case-count saving. Removes documented holes before affected browser assertions are retired. Root causes must be reproduced, not inferred from exception comments. |

Ranking is expected payoff relative to scope, not a measured cost estimate. Task 5 gates retirement only of browser checks whose replacement depends on the excluded observations. Unaffected consolidation can proceed first. Tasks 1–3 share the guided-lesson file and execute serially.

## Scope and design

Keep the app static and client-only, existing mathematical meaning, current lesson overlay behavior and graph identity/scene ownership. No routes, presets, storage formats or curriculum changes. Preserve unrelated work in this checkout. Do not revert to obsolete external reopen controls described in older specs.

Use three explicit test responsibilities:

1. Shared contracts: session transitions, dialog/focus, locking, cancellation and history. Exhaustively cover distinct behavior variants using small fixtures or representative real graphs.
2. Graph/content contracts: every supported graph restores meaningful edited state and resources; every authored scene has independent expected outcomes. Preserve synchronous multi-action execution and mathematical assertions.
3. Browser integration: actual JSXGraph, MathJax, production CSS, pointer/keyboard/touch behavior, browser history, routes and assets. Select samples for common behavior, retain exhaustive checks where input content/assets vary independently.

No browser case is deleted merely because a mock-based test calls `restoreState`. Do not reduce confidence to aggregate board counts: counts can stay constant while coordinates, callbacks, weights, selection or drawing are wrong. Cleanup observations must include appropriate live resources and post-restore interaction.

## Acceptance criteria

1. Map each removed assertion to its replacement test or an explicit reason it is redundant. Preserve an executable per-lesson smoke row and completeness checks against the available lesson catalog; new lessons cannot silently escape coverage.
2. Every graph used by lessons has real-graph repeated session coverage: change state, enter, navigate/apply actions, exit, compare meaningful state/drawing/controls, repeat, and demonstrate continued interaction. Completion retaining its final scene remains distinct from exit rollback.
3. Shared browser behavior is covered by a named feature matrix with a rationale for each sample. Include animation, observation, child-board integration, rational/curve state where relevant, reduced/non-reduced motion, keyboard and touch. Do not treat family names as proof of identical implementations.
4. Every authored scene retains independent mathematical/visual outcome checks. All required content frames remain reachable; do not confuse every step visited with every frame visited. Every lesson's rendered notation/calculation content is checked at narrow width with real MathJax. Preserve every frame's visible-point framing checks at both desktop and narrow widths, including explicitly intended exceptions. Shared desktop control/projection/enlarged-text coverage remains representative and explicit.
5. Every chapter activity retains launch/context/authored-scene coverage. Shared Back/Forward, reading focus, reset, refresh, independent ordinary scene and lesson handoff retain real-browser coverage at the chosen variants.
6. Resolve each existing excluded drawing scenario before relying on it for replacement coverage. Reproduce failures at a stable revision, preserve numerical meaning, and remove the corresponding exclusions only after drawing comparisons pass without filtering. Retain affected browser assertions while this remains incomplete.
7. Show replacements detect defects: run a bounded temporary fault for representative restoration, resource accumulation, transition and content cases; record the expected failure and revert it. Fixtures must first demonstrate an observable change, not pass against identical scenes.
8. Compare before/after on the same stable code/build inputs, browser, worker count and hardware. Record test counts, full suite wall time, summed test time, focused contract time and unit-plus-browser total. Repeat timing to expose noise; do not claim improvement from fewer named tests or from skipped assertions. If a consolidation slows overall verification or loses unique coverage, revise it.
9. Update `docs/smoke-tests.md` and relevant spec verification sections to describe the final ownership. Existing instructions requiring three browser scenarios for every lesson are superseded only when their replacement coverage is accepted. No CI deployment gate is weakened, no retries are added and no assertions are silently skipped.

## Verification and delivery

Begin with `just --list` and the command guide. Use focused unit checks while implementing, then typecheck, full unit suite, production build and the affected delegated smoke checks under the smoke-tester skill. Shared runtime changes require the full applicable checklist. Complete one final full production browser run after integrated edits settle; keep measurement runs at a stable build. Follow project delegation, independent review and commit/push rules at implementation time.

This planning change requires local Markdown-link and whitespace checks only. It does not certify the proposed replacement coverage or authorize reporting an unmeasured runtime improvement.
