# Graph control first use: stream state

**Updated 2026-11-19.** The only stream in progress for 2026-11-20. Source: [spec](../../specs/graph-control-first-use.md), [route plans](../../tasks/graph-control-first-use/README.md). Prepared inputs: [source triage](triage-source.md) (138 rows: edit-order owner, control types, label references, blockers) and [fresh-visit baseline](baseline-fresh-visit.md) (138 rows, published site `index-4YFBiBaU.js`, desktop with 310 px inspector and 390 × 844 phone). Each route's decisions are in its task-page entry, found by its id.

## For the owner

- Nothing blocking. The daily scheduled run on 2026-11-19 passed.
- **Overlap with the graph-character stream.** Its implementation was reverted on master in `9e3154b0` and is kept on the `codex/graph-character-pilots` branch, so lane D is not blocked on master. If that branch returns to master during this stream, apply the rule below. [Its handoff](https://github.com/efodx/bezeg-2.0/blob/codex/graph-character-pilots/docs/reviews/graph-character/handler-handoff-1.md) changes the de Casteljau board mark, Voronoi and fastest descent (`mechanics-descent`). It also asks Random experiments to coordinate with this pilot. If both streams run, lane D waits for that stream's de Casteljau slice to land, or each stream owns separate methods of `DecasteljauGraph.tsx`: this stream owns `getGraphCommands`/Edit, that stream owns board drawing. The Voronoi and descent route batches go after its slices.
- Decisions settled on 2026-11-19 and recorded in the spec: the De Casteljau opt-in keeps the construction controls through curve selection, Simulation gets a `CountSetter` stepping 1–2–5 and a visible Seeds group, and Epicycles renames only the `epicycle_*` keys and rewrites `prompt_epicycles`.

## Lanes

The card limits a stream to two workers. Give shared files one owner. `sl.ts`/`en.ts` are touched by every lane: each lane edits only its own graph's key block, and pushes promptly after each accepted slice.

**Wave 1: pilots, start together**

| Lane | Owner | Owned paths | Acceptance |
| --- | --- | --- | --- |
| E · Epicycles | worker 1 | `EpicycleGraph.tsx`, its tests, `epicycle_*` and `prompt_epicycles` keys, the `epicycles` row of `scripts/demonstration-preview-recipes.cjs` (stable id for the cutoff slider) | [analysis.md#epicycles](../../tasks/graph-control-first-use/analysis.md#epicycles) and spec rollout row 1 |
| S · Simulation | worker 2 | `SimulationGraph.tsx`, its tests, `random_graph_*` keys, the `prob-simulation` recipe row if a label it uses changes | [probability.md#prob-simulation](../../tasks/graph-control-first-use/probability.md#prob-simulation). The randomness lessons (`src/learning/content/randomness*GuidedLessons.ts`) that say “field Generator seed” still work |
| D · De Casteljau | handler (shared base core) | `BaseCurveGraph.tsx` opt-in in its own commit, then `DecasteljauGraph.tsx` / `DecasteljauGraph2.tsx` | [bezier.md#decasteljau](../../tasks/graph-control-first-use/bezier.md#decasteljau). On ordinary Bézier, selection still leads to the point editor and curve operations. Hand D's tests to whichever worker frees first |

**Wave 2: decide on the phone companion control.** Use E and D to decide whether a graph-supplied companion slider joins the playback slot on phones (spec, Playback row). It changes shared workspace code, so it goes in a separate commit with Bisection rechecked.

**Wave 3: batches by blocker** (from the triage)

1. **Curve opt-in batch (20 routes)** after D lands: affine, repeated-subdivision, elevation, extrapolation, subdivision, uniform-parameterization, spline-parameterization, weighted-parameterization, rational-subdivision, rational-elevation, rational-decasteljau, circle, rational-extrapolation, farin, spline-g1, spline-g1-symmetric, spline-cn, ph-cubic, ph-quintic, rational. ph-cubic, ph-quintic and rational may keep selection first; decide per route from its plan. One worker, family by family.
2. **Local reorders (106 routes, blocker none):** split by family page across the two workers, one family per slice. Do a route's catalogue fix (17 listed in the triage) in the same slice as its reorder, so each graph file has one owner. Some “count in Slider” items may be a deliberate density choice: check the catalogue row before converting.
3. **Local selection or 3D condition (8 routes):** extrema, voronoi, point-set-triangulation, function-inverse, polynomial-zeros, patch-coons, patch-triangular, patch-tensor. The handler reviews each plan: the selection belongs in the task (README definition of done, step 1).
4. **Already meeting the check (35 in the baseline):** record and keep the layout. 28 of them are drag-first and were judged only by board visibility. Before recording, confirm that a handle is identifiable and that keyboard point entry is adjacent.
5. **rational/farin-points:** its Farin toggle is not in Edit on a fresh visit (baseline “No match”). Re-read its plan before batching.

## Known gaps in the prepared inputs

- The triage searched lesson prose only for labels that appear in preview recipes. Before a slice renames or moves a labelled control, grep that key's Slovenian and English text in `src/learning/content` and the host tests.
- Baseline control matching is by label. For drag-first rows it checked only that the board is in view.
- The baseline's raw JSON and screenshots were not kept. Regenerate them, or capture after a change, with `node scripts/controls-sweep/fresh-visit.cjs [ids|all] [--base <preview url>]`. Output goes to `.command-logs/fresh-visit/`.

## Handler chain

The owner started this stream on 2026-11-19. Handler 1 begins with wave 1: lanes E and S as two `bezeg-worker` Sonnet `medium` workers in their own worktrees, and lane D's `BaseCurveGraph` opt-in kept by the handler. Each handler rewrites this note at handoff and starts its successor (AGENTS.md, handler budget). Owner decisions that the spec and route plans do not settle go under “For the owner”. Do not decide them silently.

## Next slice brief inputs

Wave 1, lanes E and S: the owned paths and acceptance criteria above. Checks: focused `just unit` on the touched tests, `npx tsc --noEmit --pretty false`, `just build`, then a `bezeg-smoke` Haiku pass on the named route at desktop 310 px and 390 × 844, in Slovenian and English.
