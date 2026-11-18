# 01 — Enforce current user-action availability

Status: done, 2026-11-19, commits 15b68050 and c6b20420 (import confirmation found in review); engineering and UI review, verified by focused unit tests, `just check-changed` at bdb27583 and browser smoke (all seven A2 viewports; observe mode only at 1280 px, 310 px inspector not checked). Source: [specification](../../specs/master-review-followups-2026-11.md#user-action-availability--r1-r2), UA1–UA5. Findings R1/R2. Dependencies: none.

## Outcome and scope

Preset commit handlers and lesson-sensitive playback obey the specification's mode/action table even when forms persist or controls move. Own the affected changes in `src/graphs/base/{BaseGraph,PresetSelector,DemonstrationWorkspace}.tsx`, `src/graphs/context/react/PresetLockContext.ts` and shared `controls/PlaybackButtons.tsx`/placement. Start from the real graph and lesson callers, not a new global command framework. This task owns the shared decision consumed later by the Bisection formula pilot.

## Work

1. Reproduce open Save/Delete → start Bézier lesson → hide card → confirm/Enter, comparing storage and scene snapshots. Inventory rename and overwrite routes too. Reproduce keyboard Next step under Bisection's open card in the relocated layout.
2. Identify the existing owner of current lesson/operation state. Map every row of the source mode/action table to that authority, with one decision used by UI feedback and the user-command commit path. Record which checks and stale callback assumptions disappear; do not mirror lesson state or add a caller-controlled bypass.
3. Guard each persistent mutation immediately before writing, including calls through a callback retained before lesson entry. Apply content-mode playback locking to the actual relocated group and command routes. Preserve unavailable reasons, drafts and focus handling, and the existing select/import/workspace-reset locks.
4. Prove authored preparation and multi-action scenes still execute synchronously. Preserve allowed hide/observe interactions and unlock behavior on exit/completion under the existing lifecycle. Update architecture guidance for the changed ownership.

## Verification and completion

- UA1/UA4: durable PresetSelector and real GraphHost lesson regressions cover Save, overwrite, rename, delete, Enter and already-open forms. Call retained command callbacks after the lock changes as well as testing UI activation; disabled markup alone is insufficient. Verify unchanged stored bytes and real graph state on refusal, preserved drafts and successful free-exploration operations.
- UA2/UA3/UA5: keyboard/pointer checks at 699/700/701 px width and 499/500/501 px height, varying each breakpoint independently and then together, plus an ordinary desktop, a narrow browser and a 310 px inspector. Check model/board before and after Next/Play/run Reset, resizing, hiding/showing the card and leaving the lesson; inspect focus. Confirm lesson-card actions still work while ordinary graph playback is locked, and completion releases permissions only through the existing lifecycle.
- Use focused `just unit` for changed owners, then the relevant scene replacement, synchronous actions, checkpoint and Preset contract checks and `just check-changed`. Localization edits also need the production build.
- Obtain engineering and UI/accessibility review. Use `$smoke-tester` and the full shared-workspace browser checklist, including the two exact reproductions. Keep code ownership with one implementer while dependent controls change.
- Close UA1–UA5 with the removed caller rules, observed pre-fix failures and verified revision.
