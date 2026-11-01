# Platform stream: handler handoff 10

Written 2026-11-01 21:15Z by platform handler 10 at the 150k soft context threshold (by estimate: the memory reaper killed the self watcher). Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 6. Task: [A3](../../../tasks/architecture-deepening-backlog/03-scene-replacement-path.md). Previous: [handoff 9](handler-handoff-9.md).

## State

- **Location:** worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **On `master`:** step 5 accepted and pushed (A2 `e67afd89`, `e58a38a3`; A5 `db04b1a4`; acceptance docs `9172bfa8`). Owner-requested master fix `a8407d3b` (below). Master CI was green at `a8407d3b`.
- **Branch only** (on top of the pre-fix master; rebase drops nothing, since `a8407d3b` is a cherry-pick of `286ccb01`):

| Commit | Content | Review |
|---|---|---|
| `7730f0fe` | A3 S1: `src/graphs/base/sceneReplacementContract.test.tsx` (5 entries x3 on bezier, derivative, PH cubic with and without a selected curve; reload x3 on 9 more families); `BaseGraph.sweepSceneBoardObjects()` seam returns what it removed | handler: seam behavior-neutral; mount baseline added on request |
| `5c54804a` | platform.md step 6 progress, memory-reaper load note | — |
| `286ccb01` | the master fix (same content as `a8407d3b`) | — |
| `bb8f475b` | **A3 S2, unreviewed**: new `src/graphs/base/SceneReplacement.ts` (`replaceScene(host, plan)`); every entry in `BaseGraph.tsx` plus the patch lesson scene in `patches/BaseSurfaceGraph.tsx` goes through it; `BaseCurveGraph.importPresetData` no longer disposes; `disposesBeforeNonFigureImport()` (true only for curves) keeps lesson/mount disposal per family; contract test asserts disposal counts | **none yet** |
| (this commit) | this note | — |

- Backup pushes: `origin/worktree-stream-platform-13` (`5c54804a`). Push this commit to `-14`. Never force-push; the classifier rightly refused a `--force-with-lease` to `-12`.

## Findings from S1 (inventory: [a3-inventory.md](a3-inventory.md))

- The sweep removes objects only for point set (18 per reload), cross ratio (43) and pascal (59); all other tested families 0. These need their own teardown in S3.
- Remounting a used PH graph throws in `PhBezierCurveControls.tsx:57` (`getFirstJxgCurveAsPHCurve()` undefined before the new mount rebuilds the curves). Two `it.fails` cases in the contract; the whole test is `it.fails`, not only the throw (not split). S3 or a small fix flips them.
- Hermite, Interpolation and Parametric call their own `removeScene()` inside `importPresetData`, so they still tear down twice on the figure path (S2 left them).
- Tick labels are excluded from object counts (JSXGraph pools them).

## Owner-requested master fix (`a8407d3b`)

The owner asked to fix the red master tests. Registering `triangle-centres` and `inscribed-angle` (geometry stream `4aad3d12`) put them into the `GraphTransientState` parts, where 4 tests failed: they keep `model` in Preset data, and nothing a lesson tick can change alters their scene (no lesson actions; their collections fix `gridStepExponent` at 0). Added both to `PRESET_DATA_STATE_KEYS` and `NO_SYNCHRONOUS_SCENE_CHANGE` in `src/graphs/base/graphTransientStateContract.tsx`; 16 cases pass. A `guided-lessons` arc-length 390x844 smoke failure in the `9172bfa8` run (lesson panel not visible in 10 s) did not recur at `a8407d3b`: treated as a CI flake.

## Checks run

- `just check` passed at `d7e42cf0` (pre-rebase A2/A5). After rebases: typecheck; `just unit` on `src/graphs/base src/localization src/graphs/curves/ph` (`c6cf7956`), curvature/parametric/functions (`c6cf7956`), `src/learning` (844 s), compgeo, presets, Routes, Demonstrations (`5c54804a`): all passed.
- Browser smoke for A2/A5 at `d7e42cf0`: passed (evidence in the A2 and A5 evidence files).
- S2 worker (at `286ccb01` + S2): typecheck, eslint, contract test, `src/learning/runtime`, `sceneContentAgainstGraphs`, `src/graphs/patches` passed; `src/graphs/base src/graphs/curves` had 5 failures, 3 files of which re-passed after its Subdivision fixture fix, and the transient ones were the master bug fixed above. **Not run on S2:** the full `src/graphs/base src/graphs/curves` set after the fix, other `src/graphs` families, `just build`, browser.

## Next steps, in order

1. Start the self watcher. Fetch and rebase onto `origin/master` (the `286ccb01` commit should drop as already applied).
2. Verify S2: `just unit src/graphs` (split into runs under 10 min, foreground: background shells get reaped when the session idles), `just typecheck`, `just build`.
3. Review S2 (`bb8f475b`) with parallel `bezeg-reviewer` Sonnet runs: engineering constraints (ordering, ADR 0015 transient contract, A2 signal contract in `FigureExportOperation.ts`, `isCurrent` cancellation, one batched board suspend), and a disposal/teardown review (the `disposesBeforeNonFigureImport` choice; `BaseSurfaceGraph` sixth entry). Repair, then commit.
4. S3: family teardown for PointSet (+ its four subclasses), CrossRatio, Pascal, PolePolar; Hermite/Interpolation/Parametric double `removeScene`; PH remount throw; then make the sweep a checked fallback (tests assert it removes nothing). S4 only if S3 shows zero removals everywhere.
5. Accept A3: evidence file, full browser checklist (curve, spline, PH, function routes with Preset reload, figure batch and lesson exit), status lines, do-log, push to master.

## Delegation telemetry (this handler)

| Assignment | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| A2/A5 smoke (`bezeg-smoke` Haiku) | 18:48Z | ~47k / 25 / 7.6 min | passed; 2 A5 gaps covered by handler scripts |
| A3 inventory (`bezeg-worker` Sonnet, read-only) | ~19:10Z | ~47k / 13 / 1.9 min | good; missed the patch lesson entry |
| A3 S1 (`bezeg-worker` Sonnet) | ~19:12Z | ~85k / 41 / 34 min | done; one follow-up (mount baseline) |
| A3 S2 (`bezeg-worker` Sonnet) | ~20:15Z | ~87k / 64 / 60 min | done, unreviewed |

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`.
- Workers: `bezeg-worker` Sonnet `medium`, one at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku with exact locators; preset controls sit behind the "Shrani" tab, which hides the curve picker, and PH routes start with no saved Preset. Port 4311.
- Next backup branch name: `-15` after `-14`.
