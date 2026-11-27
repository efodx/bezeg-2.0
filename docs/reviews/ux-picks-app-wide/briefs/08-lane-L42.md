# Dispatch: task 08 lane L42 (conic-focal, geometric-series), round 14, demonstration `<D>`

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. One demonstration per session.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (rules, owned paths, steps, checks, report, **tough choices**, **common misses**). Recipe: `briefs/notes/08-base-function.md`. Guide `docs/guides/converting-a-graph.md` by section.

Closest finished lanes: B's L50 analysis graphs, in particular sequence and fixed-point (`git log --oneline --grep "lane L50"`): they use `IterativeFunctionGraph`, which geometric-series shares. Interp-runge (`git log --oneline --grep "interp-runge"`) for a function graph with choice pucks; waves `fd9072f80` for lesson frames and prose.

Rules learned (all apply):
- Frames highlight only rows present when the step opens. Never write the canvas-sized `fitBoundingBox` result as the view intent. Board text a step names stays clear of every card at 1440x900 and 1280x720: anchor it in user coordinates inside the marks (`marks.must`), measure label room against `this.boardView.intent().box`.
- Drop board caption lines that repeat a legend entry or readout row; a formula shown only on the board becomes a declared row; captions naming a line's style become legend entries.
- Puck snaps off-grid typed values: assert the snap. A `*FirstTask.test.tsx` case for a control that became a puck moves to the strip. Check `src/graphs/base/sharedControls.graphs.test.tsx` when a slider becomes a puck. Tests that use a control moved into the folded Orodja card must open it.
- Tests that write a declared parameter outside a write source run under `runAs('learner', ...)`, values unchanged (standing owner permission).
- Before declaring a graph, grep `src/workspace` and `src/graphs/base` tests for it as an "undeclared graph" fixture.
- `IterativeFunctionGraph.tsx` is shared (L47, stream B, later): opt-in hooks only, default off, no behaviour change for other users; list any change.
- Delete retired catalog keys from `sl.ts`/`en.ts` in lockstep after grepping src, tests, e2e, scripts (you own them this session).
- After your last code edit, rerun the declaration test and the unit dirs. eslint on every changed file and tsc before returning; no unused bindings.
- List every new file in your report.

## Lane (`inventory/08-partition.json`, L42)

- `conic-focal`: `src/graphs/functions/ConicFocalGraph.tsx`. `geometric-series`: `src/graphs/functions/GeometricSeriesGraph.tsx`.
- Lessons: `src/learning/content/schoolFunctionGraphsBatchCGuidedLessons.ts`.
- Own tests: `ConicFocalGraph.host.test.tsx`, `GeometricSeriesGraph.host.test.tsx`, `schoolFunctionGraphsBatchCGuidedLessons.test.ts`. Shared: `FunctionsFirstTask.test.tsx`.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step); choices at most 4 options; setup in Orodja; mathematics untouched.

## Checks

Dev server `http://127.0.0.1:4483/bezeg-2.0/` (running; do not start servers). Foreground, one heavy command at a time.

1. tsc, eslint on changed files.
2. Parity recorded before the conversion (SAMPLES entry in `parity.test.tsx`, `BEZEG_PARITY_RECORD=1 BEZEG_PARITY_ID=<id>`), then the declaration test `<Graph>.declaration.test.tsx`, observed red once.
3. `just graph-check <id> --route <route>`.
4. Golden: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t <id>`; report the diff per state; never re-record.
5. `just unit src/graphs/functions src/graphs/base src/learning/content src/localization`; `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`.
6. Per-step lesson shots at 1440x900 and 1280x720 (`just shot`, `.command-logs/l42-*.png`); state what you see. If the lesson-mode free column is too narrow for the content (open owner decision), report the measured width; don't work around it.
7. `just build`, `just smoke-lesson <id> --port 4391 --workers=1`, every `tests/*.spec.cjs` naming the id or route (`just smoke <spec>`).

## Return

≤300 words with `file:line`; notes in `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L42.md` as you go; on `HANDOFF` write done/unverified/next and return partial; delete scratch by name.
