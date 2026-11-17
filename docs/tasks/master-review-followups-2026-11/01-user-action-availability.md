# 01 — Enforce current user-action availability

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#user-action-availability--r1-r2), UA1–UA5. Findings R1/R2. Dependencies: none.

## Outcome and scope

Preset commit handlers and lesson-sensitive playback obey current session permissions even when forms persist or controls move. Own the affected changes in BaseGraph, PresetSelector, PresetLockContext, DemonstrationWorkspace and shared PlaybackButtons/placement. Start from the real graph and lesson callers, not a new global command framework.

## Work

1. Reproduce open Save/Delete → start Bézier lesson → hide card → confirm/Enter, comparing storage and scene snapshots. Inventory rename and overwrite routes too. Reproduce keyboard Next step under Bisection's open card in the relocated layout.
2. Identify the existing owner of current lesson/operation state. Define the smallest shared availability interface, with one decision used by UI feedback and the user-command commit path. Record which checks and stale callback assumptions disappear.
3. Guard each persistent mutation immediately before writing. Apply content-mode playback locking to the actual relocated group and command routes. Preserve unavailable reasons, drafts and focus handling.
4. Prove authored preparation and multi-action scenes still execute synchronously. Preserve allowed hide/observe interactions and unlock behavior on exit/completion under the existing lifecycle. Update architecture guidance for the changed ownership.

## Verification and completion

- UA1/UA4: durable PresetSelector and real GraphHost lesson regressions cover Save, overwrite, rename, delete, Enter and already-open forms. Verify unchanged stored bytes and real graph state on refusal, plus successful free-exploration operations.
- UA2/UA3/UA5: keyboard/pointer checks at 699/701 px width and 499/501 px height, an ordinary desktop, a narrow browser and a 310 px inspector. Check model/board before and after Next/Play/Reset, resizing, hiding/showing the card and leaving the lesson; inspect focus.
- Use focused `just unit` for changed owners, then the relevant scene replacement, synchronous actions, checkpoint and Preset contract checks and `just check-changed`. Localization edits also need the production build.
- Obtain engineering and UI/accessibility review. Use `$smoke-tester` and the full shared-workspace browser checklist, including the two exact reproductions. Keep code ownership with one implementer while dependent controls change.
- Close UA1–UA5 with the removed caller rules, observed pre-fix failures and verified revision.
