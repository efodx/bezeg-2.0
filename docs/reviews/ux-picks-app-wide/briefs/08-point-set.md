# Brief: task 08 step 2 slice 3 — point-set base (PointSetGraph) declares what is generic

Role: `bezeg-worker` (Sonnet). Edit only the owned paths. Worktree root
`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`); never `cd` elsewhere,
never create a worktree, never commit or push.

## Goal

Slices 1-2 gave `BaseFunctionGraph` and `BaseCurveGraph` opt-in declarations (read `briefs/notes/08-base-function.md`
revision 2 and recipe, and `briefs/notes/08-curve-workspace.md`; all under `docs/reviews/ux-picks-app-wide/`). Do the same
for `src/graphs/compgeo/PointSetGraph.tsx` / `PointSetControls.tsx` (22 demonstrations), and convert one worked example:
**`polygon-area`** (`src/graphs/compgeo/PolygonAreaGraph.tsx`). Then write the per-subclass recipe for the lanes.

Scoping (from an explorer; verify): `PointSetControls.tsx` renders the mode `ChoiceSelect` (~205, hidden by
`showsModeToggle()`), the polygon `closed` checkbox (~209), one `BooleanField` per overlay (`overlayIds()`/`overlayLabel()`,
~211), the point collection and lists (~219-249), simplicity/selection sentences and refusals. No playback in the base.
The triangle-centres pilot (`NotablePointsGraph.tsx` ~346-408: legend, actions with `pressed`, `drawnObject`, `performAction`
via `runAs('learner')`) is the in-family example.

## Handler decisions (settled)

- Opt-in, as before: base declaration `undefined` unless a subclass opts in; a subclass with its own `declaration()` may spread the common part.
- Generic declaration: **marks** (every point `must`; the polygon outline as a `polyline` when closed), **legend** (points,
  plus each overlay that has a drawn object), **display switches**: each overlay and `closed` as an action with `pressed`.
  Placement by the 05 rule (`docs/tasks/ux-picks-app-wide/05-pucks.md`): board for what a student flips to compare while
  watching, tools otherwise; one line of reasoning each in the notes.
- **Stay in Orodja**: the mode choice (it changes what kind of set is edited: setup), example selects, the point list and
  add/remove/clear/Add mode, refusals. Points are board-owned (no point parameter kind).
- Readout rows only through the subclass (polygon-area's area/orientation values, if it shows any): mirror `functionPanel`
  rows if the base needs a hook for them.
- Wrap each Orodja control a declared action replaces so it is not shown twice (as slices 1-2 did).
- No contract change (stop and report if needed). No geometry edit.

## Acceptance (each with evidence)

1. Base hook + common declaration; unconverted subclasses unchanged: `just unit src/graphs/compgeo` passes.
2. `polygon-area` declares marks, legend, switches (and its rows); parity recorded **before** the change (`SAMPLES` in
   `src/graphs/base/declare/parity.test.tsx`, `BEZEG_PARITY_RECORD=1 just unit ...`), then `BEZEG_PARITY_CHECK=1` passes.
   `PolygonAreaGraph.declaration.test.tsx` (file name must start with the id without hyphens, e.g. `polygonarea`; check
   how `just graph-check` finds it): `checkDeclaration` empty, legend resolves, marks follow the points over >= 5 states
   (move, add, remove a point, open/close), switches flip `pressed`; break it once and report the observed failure.
3. Lesson frames for `polygon-area`: add `declare` only where the lesson file has a local `frame` helper (slice 1 pattern);
   otherwise list the files.
4. `just graph-check polygon-area --base http://127.0.0.1:4472/bezeg-2.0/` (rebuild first with `just build` only if the probe
   needs current sources; Git Bash: `MSYS_NO_PATHCONV=1`) and `just graph-check triangle-centres`;
   `just unit src/learning/content/declarationContract`; `npx tsc --noEmit --pretty false`; `just lint <changed files>`.
5. Recipe appended to your notes, same shape as slice 1's, naming which overrides (`workspaceEdit`, `showsModeToggle`,
   `beforeSettings`, `overlayIds`) need a per-subclass look.

Owned: `PointSetGraph.tsx`, `PointSetControls.tsx`, `PolygonAreaGraph.tsx` and its new test, its `SAMPLES` entry and
`__parity__/polygon-area.json`, its lesson file per item 3, a fragment `src/localization/fragments/<family>.ts` only for new
text. Do not edit all-graph suites, `sl.ts`/`en.ts`.

Iterate with path-filtered `just unit <file>` in the foreground with a long timeout; never bare `npm test`/`npx vitest`.
Send independent reads in one message. Delete any `__parity__/*.report.txt` the parity tool writes.

## Return

At most 400 words: per item pass/fail with log paths, the observed red failure, files changed, placement decisions (one line
each), what stays in Orodja. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-point-set.md`.
