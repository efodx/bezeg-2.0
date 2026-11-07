# Stream: Controls
Run state: active

Owner of the [shared graph controls queue](../shared-graph-controls/README.md) (spec: [shared-graph-controls.md](../../specs/shared-graph-controls.md)). The owner confirmed C1–C30 and decisions 1–11 on 2026-11-07, then handed further decisions to the handlers. Rules: [feature streams](README.md). Port 4317. Handoffs: `docs/reviews/feature-streams/controls/`.

## Queue

| Step | Task | Notes | Status |
| --- | --- | --- | --- |
| 0 | [Inventory](../shared-graph-controls/00-inventory.md) | Read-only. The handler decides exceptions and Reset removals | accepted 2026-11-07: [inventory](../shared-graph-controls/inventory.md), [evidence](../shared-graph-controls/00-inventory.evidence.md) |
| 1 | [Foundation](../shared-graph-controls/01-foundation.md) | New graphs comply from here on | in progress: slices 1a and 1b accepted 2026-11-07 (evidence: [1a](../../reviews/feature-streams/controls/foundation-1a.md), [1a smoke](../../reviews/feature-streams/controls/foundation-1a-smoke.md), [1b](../../reviews/feature-streams/controls/foundation-1b.md), [1b smoke](../../reviews/feature-streams/controls/foundation-1b-smoke.md)); slice 2 next |
| 2 | [Shared point controls](../shared-graph-controls/02-shared-point-controls.md) | Pilots: PointSet, Interpolation, curve workspace | pending |
| 3 | [Contracts task 2](../mathematical-runtime-contracts/02-correlated-trace-types.md), then [task 3](../mathematical-runtime-contracts/03-shared-trace-playback.md) | Taken into this stream 2026-11-07: the sweeps edit the same panels and C24 uses this policy. Update their status in the [contracts queue](../mathematical-runtime-contracts/README.md) | pending |
| 3a | [Rendered graph style contracts](../../specs/rendered-graph-style-contracts.md) | Added 2026-11-07. Write its task file from the spec first. Before the sweeps, so they run with the appearance checks in place | pending |
| 4 | [Family sweeps](../shared-graph-controls/03-family-sweeps.md) | After step 3 | pending |
| 5 | [Remaining controls](../shared-graph-controls/04-remaining-controls.md) | Closeout of the spec's acceptance | pending |
| 5a | [Lesson panel findings](learn-ui.md#notes-from-other-streams) | Added 2026-11-07. Geometry's three findings: Next loses focus, exit focus from a chapter-launched lesson, the card covers the board at 1280×720. Start only when Codex's [stable lesson navigation](../../specs/lesson-navigation-stability.md) is on `origin/master`, because it is rewriting `GuidedLesson.tsx` and its CSS; until then skip this step and return to it. Recheck each finding on current `master` first and fix only what remains | pending |
| 6 | [Phone playback](../mobile-graph-playback/graph-adjacent-controls.md) | Approved 2026-11-06. Before starting, check on `origin/master` that no other session has taken it | pending |
| 7 | [Lesson-authoring workstream 5](../../specs/lesson-authoring-architecture.md#5-persisted-scene-validation-and-projection) | Approved once this scope settled. Write its task file from the spec first. Last of the steps above, so it shares no `BaseGraph.tsx` seam with them | pending |
| 8 | [Lesson-authoring workstream 4](../../specs/lesson-authoring-architecture.md#4-owned-standalone-scenes) | Added 2026-11-07. Blossom and NURBS only. Write its task file from the spec first. After step 7: the two must not change `BaseGraph` replacement hooks at the same time | pending |
| 9 | [Lesson-authoring workstream 3](../../specs/lesson-authoring-architecture.md#3-feature-local-registration) | Added 2026-11-07. Projective conics pilot, then stop. Write its task file from the spec first. After step 7, whose collections it references, and after [Contracts step 4](contracts.md), whose owner identities it consumes | pending |

## Decisions

The owner handed all decisions in this stream to its handlers on 2026-11-07: ask for no confirmation, and do not stop for an owner decision. Decide, record the choice with its reason and rejected alternative in the relevant spec, and continue. The owner asks for a change later if a result is unwelcome. The README's other stop conditions still apply: a step that keeps failing, a suspected defect no failing test can confirm, or a needed dependency change that cannot be avoided. Git and engineering rules in AGENTS.md are unchanged.

## Shared files

Steps 1 and 2 change shared inputs and `BaseGraph.tsx`-level seams, so push each slice promptly. Steps 3 and 4 touch `sl.ts` and `en.ts`; follow the [shared-file rules](README.md#shared-files).

## Notes

- **Port:** on 2026-11-07 Codex's `lesson-navigation-prototype` dev server held 4317 with `--strictPort`. Check the port before a preview. If it is taken, use a free port outside 4311–4317 and leave that server running.
- **`node_modules`:** this worktree uses its own `npm ci`, following [new-pc-setup](new-pc-setup.md). The [README](README.md#shared-files) still describes a shared junction, which that guide forbids; this stream does not edit the README.
- **Worker sizing:** inventory parts of about 10k lines reached the worker budget. Keep read-heavy slices smaller.
