# Controls handler handoff 3

Written at `BUDGET SOFT`, 2026-11-07. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue.

## State

- **Worktree and branch:** `.claude/worktrees/stream-controls`, branch `worktree-stream-controls`. `Run state: active`.
- **On `master`:** task 0; task 1 slices 1a, 1b, 2a (`98426280`; CI green via the superseding run for `66b63ac6`) and 2b (`69969eef`). Slice 2b's Browser smoke run 42416522986 was in progress when this note was written: confirm with `just ci 69969eef` (prefix `PATH="/c/Program Files/GitHub CLI:$PATH"` in Bash). A cancelled run means a later push superseded it; check the newest master run instead.
- **Records:** spec decisions 13–17 and the user impact for slice 2, evidence [2a](foundation-2a.md) and [2b](foundation-2b.md), two evaluation entries, and the stream row ("slice 3 next").
- **Running:** nothing from this stream. No preview or worker is left.

## Next: task 1 slice 3, announcements (C21)

Spec row C21 in the [spec](../../../specs/shared-graph-controls.md#capability-catalogue); slice 3 in [01-foundation.md](../../../tasks/shared-graph-controls/01-foundation.md). Brief inputs:

- `src/graphs/curves/LiveReadout.tsx` holds `SettledReadout` (500 ms settle) and `LiveReadout` (`data-readout-live`), used by six curve graphs. Move it to a shared place (`src/inputs/` or `src/graphs/base/controls/`), add the one mute-during-Play rule (Sequence and De Boor have no gate today; "silent during Play" is hand-written six times: grep it), and keep one marker that `controlsSignature` (`src/graphs/base/realGraphTestHarness.tsx:192`) reads. Compgeo's hidden per-step paragraph and the functions' visible status group that re-reads every line are the other two patterns to fold in or pilot.
- **Carried from 2a:** a `NumberInput` hint is a `<p role="status">` mounted with its text, so insertion may not be announced. A per-field always-present region was tried and withdrawn: `src/learning/playground/LookUnderneath.test.tsx` pins one live region per controls area, and `TensorDerivativesGraph.test.tsx` queries a single status. Decide field-hint announcement here, within that rule.
- **Live-region count:** 2a added one always-present status region in `CountSetter` (`data-count-status`), and 2b added one `RefusalNotice` per function graph and B-spline basis graph. Count them against the one-region rule when deciding.
- `controlsSignature` reports `element.disabled` only; since 2a the count buttons use `aria-disabled`, and buttons without `aria-pressed` are not in the signature at all. Decide whether the marker work should cover it.
- Ask for screenshots in the light, presenting and forced-colours themes, waiting ≥800 ms after toggling `is-presenting` (Bootstrap button transitions; 2a's recheck misread a mid-transition shot). The inspector is hidden while presenting, so presenting shots of inspector content need the page's own presenting layout, not a class toggle on a hidden panel.
- Name smoke consumers in the brief, and the order tests that pin inspector children (`DarbouxGraph.test.ts`, `DefiniteIntegralGraph.test.ts` "Edit order").

Then slices 4 and 5, task 2 (smoke `interp-fifth-point-added` and `hermite-locality-six`), and the queue in [controls.md](../../../tasks/feature-streams/controls.md).

## Open items

- In the presenting theme the *enabled* count-setter button in a tools list shows a faint glyph on the cream panel fill (`.workspace-inspector .tools .btn` against `.is-presenting .workspace-inspector .btn`). Older than slice 2; see [2a evidence](foundation-2a.md).
- No screen reader has been run on any slice. The checkbox variant, switch help and a disabled switch still lack browser coverage until slice 5's fixture.
- No shipped graph can reach a refused `axisPoint` drag; that path is tested through a subclass only.

## Risks and working notes

- **`master` moves every few minutes,** and a runtime publish gate takes 16–50 minutes under load. The gate leaves the checkout rebased when it fails at push: rerun with `--base <new parent> --commits <rebased id>`, or rebase by hand, check the incoming diff for your files, rerun focused checks and push. Keep the checkout clean while the gate runs (an untracked brief failed one recheck); write the next brief under `.command-logs/` until the push lands.
- Evaluation-log entries conflict with other streams' appends: keep both sides.
- **Ports:** 4317 belongs to Codex; use 4327–4329. Stop previews you start.
- **Workers run out of budget during repair rounds** (2a's worker did, before mutations and smoke). Ask for the expensive checks once, at the end, and complete the remainder yourself.

## Settings

Successor: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card. Each handler launches its own successor at handoff and passes this rule on.
