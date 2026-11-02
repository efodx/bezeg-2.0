# Stream: Platform
Run state: complete

Owner of the [architecture deepening backlog](../architecture-deepening-backlog/README.md) (spec: [architecture-deepening-backlog.md](../../specs/architecture-deepening-backlog.md)). Rules: [feature streams](README.md). Port 4311. Handoffs: `docs/reviews/feature-streams/platform/`.

Per-task evidence stays next to each task file, as that README asks. Update the task's status in the backlog README as well as here.

## Queue

The order differs from the backlog README's waves: tasks that gate other streams come first. Each step runs at most two tasks in parallel; pairs are file-disjoint.

| Step | Tasks | Notes | Status |
| --- | --- | --- | --- |
| 1 | A1 preset storage ∥ A9a typed lesson-action vocabulary, review-field decisions, one pilot content file | A9's decisions go in the Guided lessons spec. A9a owns `model.ts` in this step | accepted 2026-10-31: A1 (`df45cb9`, `a3c8d6a`) and A9a (`ac30c2f`) |
| 2 | A10 derived registration ∥ A9b scripted migration of the remaining content files (incl. `patchChapter*.ts`) | A10 owns `model.ts` in this step; A9b edits content files only. Review A9b by search, not by reading. **Opens `G-REG`** once A9a and A10 are accepted, without waiting for A9b | accepted 2026-10-31: A10 (`1b847578`), A9b (`a628ceca`) |
| 3 | A4 generic spline changes ∥ A7 function-model rules (convexity pilot, then the other ten) | Disjoint: spline adapter vs. analysis models. A7 rebases over A9 (reverses the backlog's soft 9-after-7 order) | accepted 2026-11-01: A4 (`c620ad48`) and A7 (pilot `be74f83e`, slices `f9b40c0d`–`19829899`; [evidence](../architecture-deepening-backlog/07-function-model-rules.evidence.md#a7-verification-2026-11-01)) |
| 4 | A6 curve gesture mathematics ∥ A8 function graph sharing | A6 after A4; A8 after A7. **Opens `G-CURVE`** (A4 + A6) and **`G-FN`** (A7 + A8) | accepted 2026-11-01: A6 (`a467c526`, `4b908534`, `2d5b0a80`) and A8 (`47434ed2`, `a5910b23`, `d1162c43`; S3 no change). Function p95 settled by interleaved runs; evidence beside each task file |
| 5 | A2 figure export operation ∥ A5 PH auxiliary board | A2 after A1 (`BaseGraph.tsx`, `PresetSelector.tsx`) and after A7/A8 (shared function-graph test files) | accepted 2026-11-01: A2 (`60321820`, fixture follow-up `53e9ef8e`) and A5 (`89a1dcb4`). Browser smoke by handler 10; evidence beside each task file |
| 6 | A3 one scene replacement path | After A2, A5 and A8 (shares `BaseFunctionGraph.tsx` with A8). Full browser checklist. Slices S1–S4 from the [inventory](../../reviews/feature-streams/platform/a3-inventory.md) | accepted 2026-11-02: S1 `dc071674`, S2 `f0bfebd9` + repair `d1367a9a`, S3a `b7469beb`, S3b `6980e53e`, S4 `37e10c41`, review repair `ea1025a8`. Full browser checklist passed; [evidence](../architecture-deepening-backlog/03-scene-replacement-path.evidence.md). Queue complete |

Line ranges in the task files date from `2f602d0` (2026-10-25); locate code by search. Families in other streams may have added graph families since. A3, A7 and A8 must cover every graph family on `master` when they start, not only the families that existed on 2026-10-25.

## Gates provided

| Gate | Status |
| --- | --- |
| `G-REG` (A9a + A10) | open (2026-10-31) |
| `G-CURVE` (A4 + A6) | open (2026-11-01) |
| `G-FN` (A7 + A8) | open (2026-11-01) |

A *Worth exploring* task (A3, A6, A8, A10) may end in "no change" after its inventory, with the reason recorded. That counts as accepted and opens its gate.

## Load notes

- 2026-11-01 (handler 10): Claude Code's memory reaper killed an idle-session `just check`, the preview and the watchers at about 19:30Z (2.7 GB free afterwards). Run the push-gate checks in the foreground in chunks under 10 min.
- 2026-11-01 (handler 9): `just build` and `just unit` each waited 20 min at the memory gate (1.0–1.9 GB free) during step 5. The stream drops to one worker after A2/A5.
