# Stream: Controls visual polish
Run state: active

Started 2026-11-11 at the owner's request, after the [controls stream](controls.md) completed. It owns `src/inputs/` and `src/graphs/base/controls/` from now on. Spec: [control-visual-polish.md](../../specs/control-visual-polish.md). Rules: [feature streams](README.md). Worktree `.claude/worktrees/stream-visual`, branch `worktree-stream-visual`. Port 4322. State: [state.md](../../reviews/feature-streams/controls-visual/state.md).

## Queue

| Step | Task | Notes | Status |
| --- | --- | --- | --- |
| 1 | Audit (spec, Approach 1) | `bezeg-smoke` Sonnet, all Demonstration routes, three views, Slovenian; ranked findings table | done: [audit.md](../../reviews/feature-streams/controls-visual/audit.md) |
| 2 | Finalise acceptance criteria, tokens, prototype on `/bezier/curve` | Handler finalises the spec from the audit first; before/after screenshots; UI and accessibility review | criteria and tokens finalised in the spec; prototype in progress |
| 3 | Rollout by component kind | One slice per kind; shared CSS first, then remove per-graph overrides; smoke the routes each slice reaches | not started |
| 4 | Carried controls items | The five families-prep notes moved from [controls.md Notes](controls.md#notes): inspector `NumberInput` 40 px on touch (fold into step 3), shared checkbox group, shared reduced-motion subscription, graph-supplied reduced-motion Play reason, `PlaybackButtons` `describedBy` slot (then drop `src/graphs/linear/StepCounter.tsx`) | not started |
| 5 | Test consolidation | Owner request 2026-11-11: remove per-Demonstration tests the shared controls and all-graph sweeps now cover. Inventory in the state note; rules in [verification throughput, phase 5](../../specs/verification-throughput.md#phase-5-guardrails-for-the-controls-stream-apply-before-task-3). Record each deletion's covering test in the commit message; report the test-time delta per slice (`just test-cost`) | slice 1 done (arrow-key contract, two default round trips); next: hit zone (8), typed refusal (7), Reset-at-origin (6), aria-disabled focus (3+3), projective live region and inspector focus (2 × 3) |

Steps 4 and 5 are independent of steps 1–3 and may run alongside them in disjoint files.

## Decisions

Handlers decide without owner confirmation (owner standing direction): decide, record the choice with its reason and rejected alternative in the spec, and continue. The README's stop conditions still apply.

## Notes

- `node_modules` is this worktree's own `npm ci` (2026-11-11), following [new-pc-setup](new-pc-setup.md).
- A production build of `origin/master` at `dc746cff` is in the clean worktree `.claude/worktrees/agent-a18d8a9709fec93af` (`dist/`); the controls stream's [state note](../../reviews/feature-streams/controls/state.md#risks-and-working-notes) lists working Playwright patterns and the preview recipe there.
