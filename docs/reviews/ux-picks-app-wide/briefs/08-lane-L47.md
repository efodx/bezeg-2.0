# Dispatch: task 08 lane L47 (probability, 5 demonstrations), stream B

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`
(branch `lane-b`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, common misses); it is the authority for what this brief does not restate. Recipe:
`briefs/notes/08-base-function.md` "Recipe" (worked example `ExponentialFunctionGraph.tsx`). Finished `BaseFunctionGraph`
lanes: `git show --stat 7995cde3e` (quadrature) and `8f17c48a6` (interp-least-squares); also lane L50 (`briefs/08-lane-L50.md`,
notes `briefs/notes/08-lane-L50.md`) for the analysis graphs.

## Lane

From `inventory/08-partition.json` lane `L47`. Lessons: `src/learning/content/probabilityGuidedLessons.ts` (frames of your
demonstration only; lesson ids are the `id:` of each `const` lesson: densityArea l.40, binomialNormal l.211, centralLimit
l.378, summaryStatistics l.555, correlationLesson l.713). Routes: `src/graphs/probability/registration.ts`. First-task
test (all five): `src/graphs/functions/ProbabilityFirstTask.test.tsx`. All graphs are in `src/graphs/functions/`. One
demonstration per worker.

| id | graph class | files (besides the graph) |
|---|---|---|
| prob-density | `DensityAreaGraph` (`BaseFunctionGraph`) | `DensityAreaGraph.host.test.tsx`, `densityAreaMessages.ts`, `src/analysis/densityAreaModel.ts` |
| prob-binomial-normal | `BinomialNormalGraph` (`BaseFunctionGraph`) | `BinomialNormalGraph.host.test.tsx`, `binomialNormalMessages.ts`, `src/analysis/binomialNormalModel.ts` |
| prob-clt | `CltGraph` (`IterativeFunctionGraph`) | `CltGraph.host.test.tsx`, `cltMessages.ts` |
| prob-summary | `SummaryStatisticsGraph` (`BaseFunctionGraph`) | `SummaryStatisticsGraph.host.test.tsx`, `summaryStatisticsMessages.ts` |
| prob-correlation | `CorrelationGraph` (`BaseFunctionGraph`) | `CorrelationGraph.host.test.tsx`, `CorrelationGraph.refusal.test.tsx`, `correlationMessages.ts` |

Shared tests that name these ids (read, edit only to follow a moved control): `src/graphs/base/sharedControls.graphs.test.tsx`
(prob-density rows l.84-85, the sliders that may become pucks), `src/graphs/base/realGraphScenes.ts`,
`src/graphs/base/presets/PresetCatalog.test.tsx`. `src/graphs/functions/BaseFunctionGraph.authority.test.tsx` is also
touched by lane L46 (stream A): only add to it, never reorder or reformat. **Not owned**: `BaseFunctionGraph.tsx`, shared
function panels. `IterativeFunctionGraph.tsx` (prob-clt) is shared with L42/L50: opt-in hook only, no behaviour change
for undeclared graphs (as `HullTraceGraph.declaresHullWorkspace()` in `fa98874c4`); anything more stops and is reported.

## Settled rules (check each before reporting)

- Before declaring, grep shared tests (`src/workspace`, `src/graphs/base`, `src/graphs/curves`, `src/graphs/functions`)
  for the id and class as an "undeclared graph" fixture (my search found no such use for the five; recheck for yours). A hit is
  moved or replaced with a graph outside the lane, with a comment naming its lane, as `src/graphs/curves/typedPointPaths.test.tsx:88`.
- Record parity first; mark unmarked readout sentences `data-readout`/`data-readout-note` (text unchanged).
  `src/graphs/base/declare/parity.test.tsx` counts declared notes and rows as shown; a caption moved into a row or note
  gets an `<id>Accepted` entry with a reason. Golden re-record only when notes, rows or legend moved to cards (report
  differences; the handler re-records).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover everything the learner watches (bars, shaded area, normal curve, sample mean markers, regression line).
  Board captions are not marks. **Owner 2026-11-27:** remove board caption lines that repeat a legend entry or readout row;
  quote each removed line and the card entry in the notes; keys out of `sl.ts`/`en.ts` in lockstep.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key.
- `ProbabilityFirstTask.test.tsx`: a control that becomes a puck updates its own case; a "pucks" test queries
  `#board-card-tools` after `openTools()`, and is shown red first.
- Playback that writes a puck's parameter (prob-clt Play) uses an animation lease (`useLease`, ADR 0064, as curve-parametric);
  `src/graphs/ExportPausesPlayback.test.tsx` stays green unchanged.
- A lesson morph that writes a parameter as `animation` must not set the view intent in that write (see
  `GeometricSeriesGraph.tsx` ~193, which skips the refit when `currentWrite()?.source === 'animation'`).
- Drag handlers that write state: `runAs('learner', ...)`; tests writing a bound key wrap likewise (every declared graph binds
  `view`). `src/inputs/sharedControlBehaviour.tsx:166` now blurs as the learner.
- Slovenian prose for a moved control: imperatives ("povečaj", "premakni", "vklopi"); pucks "s krmilnikom X" (bare name, no
  quotes); Orodja controls "v kartici Orodja vklopi/izberi X"; readouts "v kartici Odčitki"; no "drsnik", "gumb". Quote each
  reworded sentence, old and new, sl and en.
- Grep `tests/*.spec.cjs` for the id and route; run each match. Smoke probes reading readouts read `#board-card-readouts`
  (`open: ['readouts']`). Stale rows in `scripts/demonstration-preview-recipes.cjs`, `scripts/demonstration-clip-rows/probability.cjs`
  are only listed in the notes (stream A repoints them).
- Red check per new assertion (value, `pressed`, a mark or `followView`).

## Checks

Shared brief step 4 and 8, plus `just unit src/graphs/functions src/graphs/ExportPausesPlayback.test.tsx src/learning/content src/localization src/graphs/base/declare src/workspace src/graphs/base/sharedControls.graphs.test.tsx`,
`just unit FirstTask`, `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>`,
`just graph-check <id> --route <route>`, `npx tsc --noEmit --pretty false`, `just lint`, `just build`,
`just smoke-lesson <lesson id> --port 4395 --workers=1`, and the browser caption check (`<route>?learn=1`, Next clicks 2, 5,
a middle one, the last; 1440x900 and 1280x720 on `http://127.0.0.1:4484/bezeg-2.0/`; adapt `.command-logs/l49-comb-cap.cjs`);
view every image: watched object under a card, label on label, clipped, curve size. Do not start or stop servers.
Foreground, each command under 10 minutes; long output to `.command-logs/l47-<id>-*.log`.

## Return

At most 300 words per the shared brief. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L47.md` (one section per
demonstration, written as you go; on `HANDOFF` stop, write done, unverified and next, return partial).
