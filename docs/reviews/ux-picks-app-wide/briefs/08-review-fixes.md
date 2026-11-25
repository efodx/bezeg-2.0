# Task 08: fixes from the Fable review (2026-11-25), before lane round 2

Source: a read-only Fable xhigh review of `40e06cf4..HEAD` (the owner asked for it). Findings are quoted with the reviewer's
file:line (`~` = counted from diff hunks; verify). Three batches, run in order, one worker each (shared files have one owner).
Common rules for every batch: `bezeg-worker` (Sonnet), worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`), never `cd` elsewhere, never create a worktree, never commit or push; every new assertion observed
failing once (quote it); path-filtered `just unit` in the foreground with long timeouts, `npx tsc --noEmit --pretty false`,
`just lint <changed files>`; never bare `npm test`/`npx vitest`; mathematics untouched. Return at most 300 words; notes appended
to `docs/reviews/ux-picks-app-wide/briefs/notes/08-review-fixes.md` under the batch's heading.

## Batch B — bases and runtime (first)

1. `BaseCurveGraph.curveViewMarks` (~338-358): samples `curve.eval(i/24)` on [0,1]; B-spline (`src/bezeg/impl/curve/bspline-curve.ts:163-171`,
   raw domain parameter, refuses outside) and Bezier splines (`bezier-spline.ts:72-89`, knot domain) differ. Sample over each curve's
   own domain, catch per sample (as `BSplineBlossomGraph.viewMarks` does), drop polylines with < 2 points, and add knots and degree
   (whatever changes the curve without moving points) to the memo key. Test with a B-spline and a spline subclass instance opted in
   inside the test (do not opt the real subclasses in).
2. `BaseFunctionGraph` `FunctionPanel.plotted` (302-314): allow a list of plotted functions plus optional `must` points; guard each
   `plotted(x)` with try/catch; omit a polyline with < 2 points. Keep the single-function form working (exponential). Then make
   `FunctionInverseGraph` use it and delete its copied sampling loop (~362-380), keeping memoized identity.
3. `IterationController.play()` (106-110): clear `interrupted` only when the driver actually starts (a refused play while the learner
   holds a key must keep `paused`). Add the refusal case to `iterationController.lease.test.ts`.
4. `src/learning/runtime/animation.ts:113-114` `acquireLease` silently drops unbound keys: throw in development/test (`import.meta.env.DEV`
   or the project's existing dev check) naming the key; production unchanged.
5. Typed ids: `ElevationGraph.tsx:18-31` and `BSplineBlossomIds` declare sections their Ids say `never`. Make declarations typed
   (`GraphDeclaration<Ids>` where the contract offers it; export base id types from `BaseCurveGraph`/`PointSetGraph`/`BaseFunctionGraph`
   for spreading) so tsc catches it; fix the two graphs' Ids.
6. Guide `docs/guides/converting-a-graph.md:11`: say a subclass of a declaring base delegates unknown ids to `super.performAction` /
   `super.drawnObject` instead of throwing.
7. Nits: memoize `PointSetGraph.pointSetViewMarks` (the director serializes marks per read, `viewDirector.ts:438-442`); move
   `BaseCurveGraph.tsx:71-76` constants above the class doc comment; correct `BaseGraph.tsx:282` comment.
Checks: `just unit src/graphs/base src/graphs/curves src/graphs/functions src/graphs/compgeo src/learning/runtime src/learning/content/declarationContract`.

## Batch A — tooling and baselines (second)

1. `scripts/graph-check.cjs:43-46`: declaration tests matched by `startsWith(bare)` and parity by `<id>(-[a-z0-9-]+)?` catch other
   demonstrations (`circle` vs `circle-construction`; also rational, arc-length, subdivision, extrapolation, decasteljau, bezier).
   Resolve exactly: the graph file from `08-partition.json` / the runtime registry, its declaration test by that file's basename,
   per-mode recordings listed explicitly (mode ids from the recording's `demonstration` field). Test both a collision pair and a
   per-mode graph (linear-map).
2. Parity n/a (`parity.ts:~220-222`, `parityApplicable.test.tsx:26-28`): n/a only when the demonstration's golden file shows no rows,
   notes or outputs in every state AND the declaration shows nothing across its lesson scenes. Otherwise a recording is required.
3. Golden pre-pass: 52 of 125 `*.golden.json` hold no rows/notes/outputs (list in the review: 21 empty, 31 captions only; recompute with
   a node count). For each, find whether its present panel shows values or sentences without `data-readout`/`data-readout-note`
   markers; add the markers (text and layout unchanged; markup only) to those panels, then re-record their golden files with
   `BEZEG_PARITY_GOLDEN_RECORD=1` (filtered per id). Report which stay empty because they truly show nothing. This edits graph
   files: no lane is running.
4. Partition (`08-partition.cjs:~107`): emit `sharedTests` per lane (tests naming the lane's graph class or id outside its ownTests:
   e.g. `BsplineFirstTask.test.tsx`, `FunctionsFirstTask.test.tsx`, `PatchFirstTask.test.tsx`, `standaloneSceneLifecycle.test.tsx`),
   and have `graph-check` run the lane graph's shared tests filtered to its cases where possible (or the files whole). Remove unused
   `isSuite` (:29). Check whether L45 (`learning/chapter/activities.ts`) and L55 (`learning/chapter/guidedExamplePreviews.ts`) are
   registries wrongly used as lesson files; if so exclude them and recompute.
5. Reorder rounds so each step-2 base and the lease are exercised by round 3: L38 (IterativeFunctionGraph), one point-set lane and
   L46's first session into rounds 2-3; keep the script's assertions. Update the lane table; mark round 1 lanes done.
6. Round acceptance: add an all-ids golden check command (`just` recipe or documented env line) to the 08 task file step 7.
Checks: script tests if any; `just graph-check circle --route <r>` and `just graph-check circle-construction --route <r>` show their
own files; `just graph-check linear-map`; golden check on all ids passes.

## Batch C — round 1 graphs (third)

1. `BSplineBlossomGraph.tsx:55-58` local `BlossomDomainError` with English text: use the shared `DomainError` with catalog/fragment
   text (Slovenian and English), so puck refusals are localized.
2. Tagging rule (put it in `briefs/08-lane.md`): DOM event handlers rely on `learnerInputTagging`; `runAs('learner')` only for non-DOM
   entry points (JSXGraph drags, tests, imperative calls). Make blossom and function-inverse consistent with it (`setDegree`,
   `editPoint` paths; confirm what `learnerInputTagging` covers before changing anything).
3. Elevation: the elevated-points overlay forces the control polygon on (~88-96), so the base's control-polygon puck fights it. Add
   a base hook letting a subclass veto base pucks (e.g. `curveDisplayPuck(toggle, index)` default as now) and use it; put `elevate`
   on the board (it is the graph's main action); give the elevated points a legend entry.
4. Function inverse: empty `inspector-group` / labelled `role="group"` left when pucks own its children (~284-293): render the group
   only when it has content. Legend: entries for P and P' markers (the guide asks one per marker) besides the connector.
5. Lane brief additions (`briefs/08-lane.md`): the red check must break a value, `pressed` or visibility, not an id; run the family
   directory's tests and the lane's `sharedTests`; the function example is function-inverse (legend, actions, two curves).
6. Record round-1 measurements (minutes, worker sessions, repairs, files per demonstration: from `briefs/notes/08-lane-L0*.md`) in the
   08 task file step 8 / Estimate.
Checks: graph-check for the three with `--route`, golden checks, own and shared tests, the declaration tests updated.

Localization item not yet verified: blossom and polygon-area pass language-formatted strings as message placeholders; check that
the presenters re-read the declaration on a language switch (switch language in a unit test and compare a row). Batch C checks it.
