# Brief: task 08 step 2 slice 2 — curve workspace base (BaseCurveGraph) declares what is generic

Role: `bezeg-worker` (Sonnet). Edit only the owned paths. Worktree root
`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`); never `cd` elsewhere,
never create a worktree, never commit or push.

## Goal

Slice 1 gave `BaseFunctionGraph` an opt-in declaration (read `docs/reviews/ux-picks-app-wide/briefs/notes/08-base-function.md`:
plan, revision 2, recipe; code in `src/graphs/functions/BaseFunctionGraph.tsx` `functionPanel`/`commonDeclaration`). Do the
same for the curve workspace (`src/graphs/base/BaseCurveGraph.tsx`, `CurvePointControls.tsx`, `CurveWorkspaceControls.tsx`,
`Commands.tsx`, `BaseBezierCurveGraph.tsx`; 32 demonstrations), so a curve subclass converts with a few lines, and convert
one worked example: **`bezier-curve`** (`BezierCurveGraph`, structured editing). Then write the per-subclass recipe that
becomes the lanes' shared brief.

Scoping notes from an explorer (verify, they are partial): curve picker and commands are inherited; point count, typed point
list and move/add/delete editing modes are opt-in (`workspaceTypedPoints`, `workspaceUsesStructuredEditing`);
`workspaceGraphDisplay` holds a point-labels toggle and per-curve `CurveDisplayControls`. The De Casteljau pilot
(`src/graphs/curves/bezier/DecasteljauGraph.tsx` ~311-389: legend entries, `drawnObject`, `viewMarks` with control points as
`must` and curve samples as `nice`) is the in-family example of a declaration.

## Handler decisions (settled; report contradictions in code, don't work around them)

- Opt-in, as slice 1: the base's declaration is `undefined` unless a subclass opts in, so the 30 unconverted subclasses keep
  today's fallback. A subclass that already overrides `declaration()` (De Casteljau) keeps its own and may spread the common part.
- What the base declares generically, from its own curves: **legend** (curve, control polygon, control points per curve, with
  `drawnObject` resolving the elements), **marks** (control points `must`, sampled curve `nice`, the De Casteljau logic lifted),
  and **display switches** (point labels and each `CurveDisplayControls` toggle a student flips while watching) as actions
  with `pressed`. Choose board vs Orodja for each by the guide (`docs/guides/converting-a-graph.md`, "placement" and the 05
  rule in `docs/tasks/ux-picks-app-wide/05-pucks.md`: pucks for what is flipped or compared a lot, setup stays in Orodja).
- **Points** are board-owned (triage decision): no point parameter kind; the typed point list, point count (add/remove) and
  editing-mode buttons stay in Orodja as the editor. Do not declare one row per control point by default; a subclass may add
  readout rows (e.g. a selected point) through the hook.
- Wrap each Orodja control a declared action replaces so it is not shown twice (see how `PuckOwned` is used in
  `ExponentialFunctionGraph.tsx`; find the equivalent for actions in the pilots).
- No contract change. If one is needed, stop and report.
- Mathematics untouched: no geometry edit.

## Acceptance (each with evidence)

1. Base hook + `commonCurveDeclaration()` (names your choice, mirror slice 1); undeclared subclasses unchanged:
   `just unit src/graphs/base src/graphs/curves` passes.
2. `bezier-curve` declares legend, marks, switches; parity recorded **before** the change (add a sample to `SAMPLES` in
   `src/graphs/base/declare/parity.test.tsx`, `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx`),
   then `BEZEG_PARITY_CHECK=1 ...` passes. A `BezierCurveGraph.declaration.test.tsx` (copy the exponential one's shape):
   `checkDeclaration` empty, legend resolves to drawn objects, marks follow the control points over >= 5 states, switches
   flip `pressed`; break it once and report the observed failure.
3. Lessons that show `bezier-curve`: add frame `declare` only if the lesson file has a local `frame` helper as in slice 1;
   otherwise report which lesson files would need it. If a lesson frame changes, `src/learning/chapter/guidedExamplePreviews.test.ts`
   may fail on a fingerprint: report it, don't regenerate.
4. `just graph-check bezier-curve --base` and `just graph-check decasteljau --base` pass (Git Bash: `MSYS_NO_PATHCONV=1`);
   `just unit src/learning/content/declarationContract`; `npx tsc --noEmit --pretty false`; `just lint <changed files>`.
5. Recipe: append "Recipe: converting one curve subclass" to your notes file, same shape as slice 1's recipe (owned files,
   steps, checks), including which hooks (`workspaceEdit`, `workspaceGraphDisplay`, `getGraphCommands` overrides) need a
   per-subclass look.

Owned: `src/graphs/base/BaseCurveGraph.tsx`, `BaseBezierCurveGraph.tsx`, `CurvePointControls.tsx`, `CurveWorkspaceControls.tsx`,
`Commands.tsx`, `CurveDisplayControls` (wherever it lives), `src/graphs/curves/bezier/BezierCurveGraph.tsx` and its new test,
the `SAMPLES` entry in `parity.test.tsx` and its `__parity__/bezier-curve.json`, lesson files only per item 3, a fragment
`src/localization/fragments/<family>.ts` only for new text (never `sl.ts`/`en.ts`). Do not edit all-graph suites.

Iterate with path-filtered `just unit <file>` in the foreground with a long timeout; never bare `npm test`/`npx vitest`.
Send independent reads in one message. Delete any `__parity__/*.report.txt` the parity tool writes (explicit paths).

## Return

At most 400 words: per acceptance item pass/fail with log paths, the observed red failure, files changed, decisions you made
(one line of reasoning each), what you left in Orodja. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-curve-workspace.md`.
