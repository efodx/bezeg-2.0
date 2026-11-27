# Dispatch: task 08 lane L43 (interpolation), round 14, session `<S>`

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**,
**common misses**). Recipes: `briefs/notes/08-curve-workspace.md` and `08-point-set.md` (curve and point-set graphs), `08-base-function.md` for the Runge function graph. Conversion guide `docs/guides/converting-a-graph.md` by section.

Closest finished lanes: find the latest converted curve graph with `git log --oneline --grep "board workspace" -- src/graphs/curves` and read one as the pattern; `fd9072f80` (waves, L39) for lesson frames and prose; `89e4245ee` for framing (must-marks on key points, a tight `followView`).

Lessons from earlier rounds (all still apply):
- Frames may highlight only rows present when the step opens. Never write the canvas-sized `fitBoundingBox` result as the view intent.
- The puck snaps off-grid typed values: assert the snap. A `*FirstTask.test.tsx` case for a control that became a puck moves to the strip.
- Owner, 2026-11-27: drop board caption lines that only repeat a legend entry or a readout row; a formula shown only on the board becomes a declared row. Captions that name a drawn line's style become declared legend entries (Legenda card), not board text (`git show HEAD~0 --stat` on the board-legends commit, logistic/growth/cobweb). Board text a step names stays clear of every card at 1440x900 and 1280x720: anchor it in user coordinates inside the marks.
- Before declaring a graph, grep `src/workspace` and `src/graphs/base` tests for it being used as an "undeclared graph" fixture; move such a fixture to another undeclared graph.
- Delete retired catalog keys from `sl.ts`/`en.ts` in lockstep (you own them for this session) after grepping src, tests, e2e, scripts; don't exempt them.
- Run `npx eslint` on every changed file and tsc before returning; leave no unused binding.
- List every new file in your report: the handler stages them.

## Lane (`inventory/08-partition.json`, lane L43)

- Session 1: `interp-hermite` (`src/graphs/curves/hermite/HermiteGraph.tsx`), `interp-lagrange` (`src/graphs/curves/interpolation/InterpolationGraph.tsx`). Session 2: `interp-runge` (`src/graphs/functions/RungeInterpolationGraph.tsx`), `interp-subdivision` (`src/graphs/curves/subdivisionCurves/SubdivisionCurveGraph.tsx`). Do only your session's demonstrations.
- Lessons: `src/learning/content/interpolationGuidedLessons.ts`.
- Own tests: `graphs/curves/hermite/HermiteGraph.test.ts`, `HermiteGraphReal.test.tsx`; `graphs/curves/interpolation/InterpolationGraph.test.ts`, `InterpolationGraphReal.test.tsx`, `SharedPointDecisions.test.tsx`; `graphs/curves/pointCountSceneLifecycle.test.tsx`; `graphs/curves/subdivisionCurves/SubdivisionCurveGraphReal.test.tsx`; `graphs/functions/RungeInterpolationGraph.host.test.tsx`; `learning/content/interpolationSubdivisionLesson.test.ts`.
- Shared tests (standing owner permission: wrap untagged writes in `runAs('learner', ...)`, values unchanged): `graphs/base/presets/ConsumerPreparation.test.tsx`, `PersistedEntryParity.test.ts`, `graphs/curves/InterpolationFirstTask.test.tsx`, `learning/content/interpolationGuidedLessons.test.ts`.
- Shared file used, not owned: `graphs/curves/interpolation/BasisPlot.tsx` (change only if a check forces it; say why).
- Pucks: only for what a lesson step asks the learner to set, flip or compare; name the step for each. Choices have at most 4 options. Setup stays in Orodja. Mathematics untouched.
- Do not touch `src/graphs/base/declare/parity.ts` or `src/graphs/base/realGraphTestHarness.tsx` (another worker). Add your parity SAMPLES entry in `parity.test.tsx` only.

## Checks (per demonstration)

Foreground, one heavy command at a time. Dev server `http://127.0.0.1:4483/bezeg-2.0/` (running; do not start servers).

1. tsc, then eslint on changed files.
2. The declaration test `<Graph>.declaration.test.tsx`; observe it red once and quote the failure.
3. `just graph-check <id> --route <route>` (no leading slash; find the route in the graph family's `runtime.ts` or the catalog).
4. Golden: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t <id>`; report the diff per state; never re-record.
5. `just unit src/graphs/curves src/graphs/functions/Runge src/learning/content/interpolation src/learning/content/declarationContract src/localization`.
6. `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`.
7. Browser shots of each lesson's view-changing steps at 1440x900 and 1280x720 (`just shot`) to `.command-logs/l43-*.png`. Look at each and state what you see: nothing a step names under a card; board framed at least about two thirds as large as on master (https://efodx.github.io/bezeg-2.0/). If the lesson-mode free column between the lesson card and Odčitki is too narrow for the content (known open owner decision, director zoom-out limit 2.2), report it with the measured width instead of working around it.
8. `just build`, `just smoke-lesson <id> --port 4391 --workers=1`, then every `tests/*.spec.cjs` that mentions the id or route (`just smoke <spec>`). If smoke refuses a stale build because another worker changed files, rebuild and retry once, then note it.

## Return

- At most 300 words, with `file:line`.
- Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L43.md`, written as you go.
- On `HANDOFF`, write done/unverified/next and return partial.
- Delete scratch files by explicit name, never with globs.
