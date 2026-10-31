# Feature streams

Status: planned 2026-10-31 against `master` at `499b264`; no stream started. Supersedes the ten-task queue from earlier the same day (commit `7a5275f`). That queue completed only the playground and six of the ten architecture tasks.

**Authorization.** On 2026-10-31 the owner asked for full features rather than a task queue. That request schedules every feature below. It includes the fifteen [new lesson families](../../specs/new-lesson-families.md), whose specs said implementation was not yet scheduled. [Guided example highlights](../../specs/guided-example-highlights.md) is the exception: its spec says implementation is not authorized, so stream `learn-ui` runs it only after the owner confirms (see [stream file](learn-ui.md)).

## Model

A **stream** is a sequence of complete features with one owner. Its owner is a chain of Claude handler sessions linked by [handler handoffs](../../agent-workflow.md#handler-context-budget-claude). Each stream:

- works in its own worktree and branch (`stream-<id>`), and pushes each accepted slice to `master` as a fast-forward under AGENTS.md;
- keeps its own queue and status in `docs/tasks/feature-streams/<id>.md`. It edits no other stream's file and does not edit this README;
- writes handoff notes to `docs/reviews/feature-streams/<id>/handler-handoff-<n>.md`;
- runs at most **two** workers at once, plus short review and smoke workers. Each stream uses its own `SMOKE_PORT` (table below).

The owner waived the session-usage limit behind the workflow's three-worker cap on 2026-10-31. The binding limits are now this machine and merge conflicts. Heavy `just` commands share 2 machine-wide test slots (16 GB, 12 threads) and queue, so six streams with two workers each mostly wait on tests rather than on each other. If the machine stays saturated (tests waiting more than about 10 minutes), drop to one worker per stream first.

| Stream | File | Features, in order | Port | Provides gate |
| --- | --- | --- | --- | --- |
| Platform | [platform.md](platform.md) | Architecture deepening backlog, all ten tasks | 4311 | `G-REG`, `G-CURVE`, `G-FN` |
| Learn UI | [learn-ui.md](learn-ui.md) | Bézier drawing playground → Learn landing visual alignment → guided example highlights (pending owner confirmation) | 4312 | `G-HL` |
| Geometry | [geometry.md](geometry.md) | Convexity and hulls → triangulations and Voronoi → sweep-line algorithms | 4313 | `G-CG` |
| Curves | [curves.md](curves.md) | Geometry of curves → B-splines and NURBS → interpolation and approximation → distributions/CLT/correlation → advanced Bézier topics | 4314 | — |
| Functions | [functions.md](functions.md) | Numerical methods → function graphs for the matura → projective conics → Fourier series | 4315 | — |
| Maps | [maps.md](maps.md) | Linear maps → complex maps → triangle geometry and inversion | 4316 | — |

Chains follow the [family dependencies](../../specs/new-lesson-families.md#dependencies-and-order): each family's prerequisites sit earlier in its own stream or behind a gate.

Size: about 165–190 worker slices in total. Platform has about 13, Learn UI about 16, and each family about 9–12 (template below).

## Gates

A gate is a set of accepted, pushed tasks. Before a stream starts a gated slice, it checks the provider's stream file on `origin/master`.

| Gate | Satisfied when | Gates these slices | Why |
| --- | --- | --- | --- |
| `G-REG` | Platform A9 and A10 accepted | Every family's graph/registration (F2) and lesson (F3) slices | A9 changes how lesson actions are authored, and A10 changes how Demonstrations and lessons are registered. Content written before them would be migrated twice. |
| `G-CURVE` | Platform A4 and A6 accepted | Curves: curve-geometry comb on existing curves (F2), B-spline graph (F2) | They share the spline adapter and curve-editing gesture code. |
| `G-FN` | Platform A7 and A8 accepted | Functions: every F2 slice that adds or changes a function model or graph | A7 and A8 make one owner for function-model rules and shared drawing. |
| `G-CG` | Convexity Batch 0 accepted: predicate module, robustness ADR, point-set/polygon graph, step-trace model (Geometry) | Triangle geometry kernel and later (Maps); advanced Bézier hull tests (Curves) | They build on its robustness policy, exact predicates and point-set graph instead of duplicating them. |
| `G-HL` | Highlights tasks 01 and 05 accepted | Media slices (F5) of families accepted after it | After 01, examples author highlight recipes. After 05, chapters may not contain `figure` items. |

**Before a gate opens**, a stream does ungated work: F0 plans and F1 kernels for its *later* families, which are pure TypeScript with oracle tests. If nothing ungated remains, it writes a handoff note marked `waiting on <gate>` and ends with a paste-ready continuation prompt. Platform does A9, A10, A4 and A6 first so that this case should be rare.

## Family template

Each lesson family follows its spec's **release batches**. Most specs have a Batch 0 (or A) foundation of kernel plus ADR, then lesson batches, each with its own acceptance gate. F0 runs once per family. F1–F6 are the kinds of slice inside each batch: a foundation batch is mostly F1, and a lesson batch is mostly F2–F4. Release each batch as soon as its gate passes. F0 is handler-only; the others go to `bezeg-worker` (Sonnet 5.5 `medium`; raise effort for robust predicates, de Boor/NURBS or Möbius mathematics, and record why).

| Slice | Content | Review |
| --- | --- | --- |
| F0 Plan | Create `docs/tasks/<family>/` from the spec's release batches and concept contracts, mark the spec *scheduled*, and decide its *Decisions needing an ADR* (with recorded alternatives) and its Slovenian terms from the spec's table | Handler |
| F1 Kernel | The spec's new kernel(s): pure TypeScript, independent oracle tests, robustness policy where the spec requires it | Mathematical |
| F2 Graph | Graph family, Presets, route, catalog registration, measured drawing approach for rendering-heavy views ([performance plan](../../performance-plan.md)) | Engineering + UI/accessibility |
| F3 Lessons | One slice per two or three lessons: scene actions plus [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31) | Kernels, constructions, readouts and scene actions only; prose is not reviewed |
| F4 Chapter | Bilingual chapter in Learn with chapter-owned guided examples | Engineering; notation test |
| F5 Media | Catalog preview clip and example card images (highlight recipes once `G-HL` is met) | Visual comparison (Haiku) |
| F6 Acceptance | Each release batch's acceptance gate, `just check`, smoke of the family's routes in both languages, hosted CI after push | Handler |

A family may be pushed per release batch. Under the [release policy](../../guardrails.md#release-policy--owner-decision-2026-10-24), implemented drafts count as released.

## Shared files

These files are touched by several streams. A rebase conflict stops the stream (AGENTS.md), so the rules below exist to avoid conflicts, not to resolve them.

- **Locale catalogs `sl.ts`/`en.ts`:** a feature puts its keys in one block, created the first time at its own anchor: after the last key of the area it belongs to, never at the end of the file. Positions match in both files. Push promptly after each slice that adds keys.
- **Registration** (`demonstrations.ts`, `graphFactories.ts`, `learningChapters.ts`, `familyChapters.ts`, guided-example registries, catalog `manifest.json`, `scripts/demonstration-preview-recipes.cjs`, routes): edit only in a family's F2 or F4 slice, keep the edit minimal, and push it as soon as it is accepted. A10 may derive some of these. Follow whatever it leaves.
- **Family content:** keep chapters and lessons in per-family files, as the Bézier patches family did (`patchChapter*.ts`), not in the shared content files.
- **Media:** regenerate the catalog manifest with its script after rebasing; never merge it by hand. Media capture is heavy, so start it only when the stream's other workers are idle.
- **Dependencies:** only Platform changes `package.json` or the lockfile. Another stream that needs a dependency records it in its stream file and stops that slice. Worktrees share the main `node_modules` through a junction; delete the junction before removing a worktree.
- **Shared app code:** a family that must change shared host code (`BaseGraph.tsx`, `GraphSession.ts`, the lesson runtime) does it in a separate commit and names Platform's affected task in its stream file. Platform rebases over it.

## Test load

With six streams, heavy test runs are the shared bottleneck. Heavy runs queue on the machine-wide slots, so contention costs wait time, not wrong results. Each stream keeps its share small:

- **While iterating:** `just unit <path>` only. Path-filtered runs skip the slot queue.
- **Once per slice:** the full unit suite, or the slice's listed checks. Production build after localization changes.
- **Smoke:** filtered to the slice's own spec files and routes (`just smoke-built <spec> --grep …` on the stream's port). The full browser checklist runs only when a slice changes the shared app shell, workspace or lesson runtime: mostly Platform A3, A9 and A10.
- **`just check`:** once per feature at F6 (Platform: once per task) at a stable checkpoint, not after every slice.
- **CI:** hosted CI runs on every push to `master`. A push that fails CI is fixed by the stream that pushed it before that stream pushes anything else.

If a stream sees its heavy runs waiting for more than about 10 minutes repeatedly, it records the wait in its stream file and drops to one worker.

## Handler loop

Every stream handler, every session:

1. At start, run `python tools/agent-usage/claude_worker_watch.py --self --until 150000` in the background (see [handler context budget](../../agent-workflow.md#handler-context-budget-claude)). Read the stream file, the latest handoff note and `git status`. Rebase the stream branch onto `origin/master`.
2. Take the next slice whose dependencies and gate are met. Write a `handoff-v12` brief, dispatch it, and start the worker watcher.
3. Accept: diff against acceptance, observed pre-change failure of new tests, [review routing](../../agent-workflow.md#review-routing), focused `just` checks, and smoke where the change alters a route, control, lesson or rendering path.
4. Commit with explicit paths, fetch, rebase onto `origin/master`, recheck, `git push origin HEAD:master`. Update the stream file's status in the same push.
5. At the soft threshold, finish integrating and write the handoff note. At `--until 215000` (Opus) or `190000`, launch the successor from the stream worktree: `claude --bg -n "<id> handler <n+1>" --agent claude --model <own model> --permission-mode <own mode> "Continue docs/tasks/feature-streams/<id>.md from docs/reviews/feature-streams/<id>/handler-handoff-<n>.md under AGENTS.md."`
6. When the stream's last feature is accepted, write a final note and launch nothing.

**Stop and report** with a paste-ready prompt on any of these: a rebase conflict; an owner decision (for example a performance miss that a spec says must go to the owner before release); a failed step that would repeat; a suspected defect that a failing test cannot confirm; a break of stored Presets or routes without a recorded reason; or a needed dependency change.

## Launch

From the main checkout, start each stream as its own background session:

```text
claude --bg -n "platform handler 1"  --agent claude --model opus --permission-mode <mode> "Create worktree stream-platform, then run docs/tasks/feature-streams/platform.md under AGENTS.md."
claude --bg -n "learn-ui handler 1"  --agent claude --model opus --permission-mode <mode> "Create worktree stream-learn-ui, then run docs/tasks/feature-streams/learn-ui.md under AGENTS.md."
claude --bg -n "geometry handler 1"  --agent claude --model opus --permission-mode <mode> "Create worktree stream-geometry, then run docs/tasks/feature-streams/geometry.md under AGENTS.md."
claude --bg -n "curves handler 1"    --agent claude --model opus --permission-mode <mode> "Create worktree stream-curves, then run docs/tasks/feature-streams/curves.md under AGENTS.md."
claude --bg -n "functions handler 1" --agent claude --model opus --permission-mode <mode> "Create worktree stream-functions, then run docs/tasks/feature-streams/functions.md under AGENTS.md."
claude --bg -n "maps handler 1"      --agent claude --model opus --permission-mode <mode> "Create worktree stream-maps, then run docs/tasks/feature-streams/maps.md under AGENTS.md."
```

Start Platform first; the others can follow at once. To lower machine load, start Platform, Learn UI, Geometry and Functions first, and add Curves and Maps when tests stop queueing.
