# Families-prep state note

Handler 7 handed off on 2026-11-11 to handler 8, near the end of its context. The worktree is on branch `worktree-stream-families-prep-2`. No worker of handler 7 is running. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take two minutes or more while agents run. Give commits about 300 s and tsc about 200 s, and prefer the file tools for reading.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <id,...>`, then check `just publish --status`. Pushed hashes differ from local ones. Wait for a pending publish before you start one that depends on it (a background `for` loop on `just publish --status` that then starts the next publish works).
- If a publish fails at `reconcile` (rebase conflict), abort the rebase in the kept publish worktree (`git -C ../publish-<id> rebase --abort`), rebase only your new commits with `git rebase --onto origin/master <last published local commit>`, resolve mechanically (keep both sides), and publish on the new base. Handler 7 did this once for `scripts/probe-demonstration-clip-routes.cjs`.
- The publish gate runs `git diff --check`; run `git diff --cached --check` before committing. CRLF warnings on CircleConstruction files and `isometries-lessons.md` are harmless (git normalises to LF).
- Edit spec text with the Edit tool; for an inserted paragraph `sed -i '<line>r <file>'` from a heredoc file is safe.
- Remind reviewers in the brief: never bare `npx vitest`/`npm test`/playwright (one reviewer ran bare vitest).

## Done

- F0, F1, F2a for all fifteen families (handlers 2–6); see `notes/f2a-*.md`.
- Handler 7 (local id → pushed):
  - Controls-compliance repairs `bedb5fb6` and complex maps 09 were published by handler 6 as `3af80573` (with the EulerCircle hint fix `1e3344c7`).
  - UI recheck repairs of the earlier F2a graphs `680dbc37` and trigonometry F2b `1dd7aa74` → `31135acc`.
  - Analytic lines + isometries F2b `58160d20` → `5424d6c6`.
  - Drag baseline of the four geometry routes `b88453ba` → `af05cead` (`docs/bezier-performance-results.md#f2b-geometry-routes-drag-baseline--2026-11-11`; no budget miss).
  - Circle geometry + combinatorics F2b `1dbe6ed9` → publishing at handoff (check `just publish --status`; if it failed, fix and republish on base `b88453ba`).
  - This state note and the circle/combinatorics smoke note: one docs commit published after `1dbe6ed9` (check status).
- **F2b pattern** (stream file Notes; recipe in `notes/f2b-trig.md`, then `notes/f2b-lines-isometries.md`, `notes/f2b-circle-combinatorics.md`): feature-local registration per ADR 0059 (`registration.ts`, `collections.ts`, `runtime.ts`, composition test; in a legacy directory use a subdirectory such as `src/graphs/compgeo/circleConstruction/`); a Preset collection per graph keyed by the id and checked by the model parser (F2a shipped none); rows with `lesson: false` and explicit pending entries (lessonCatalog opt-out list, POSTER_PENDING, MOTION_PENDING, CHAPTER_LINK_PENDING, lessonLookup characterization, PresetCatalog keys, PRESET_DATA_STATE_KEYS, realGraphScenes perturbModel when the helper cannot perturb the state, FAMILY_CHAPTER_PENDING for a new catalog family). Fix sweep failures in the graph, never exempt.
- **Lessons from the F2b slices** (put them in every brief):
  - Cross/plus/x/+ marker faces are stroke-only; stroke them in their colour (`strokeOnly`), and test `strokecolor`, not `fillcolor`. Found white (invisible) in UnitCircle, CircleConstruction, Isometry and LineGeometry.
  - `board.update()` does not re-evaluate function-valued `visible`; use `fullUpdate()` only when a visibility-driving field changes.
  - Framing: frame in the sync after a build, never inside `buildScene`; in `syncReplacedScene` build a changed view first, then mark the current key framed, so a restored checkpoint or Preset keeps its view.
  - Run an opening-view check at 1280x800 after registration (`.command-logs/view-diag/box.cjs`, screenshots); handler 7 found tiny figures on huge fixed views (lines, isometries) and overlapping board text (counting table).
  - Smoke scripts: Reset is "Ponastavi"/"Reset"; Preset import goes through the Save tab dialog; touch drag at 390 px needs CDP touch events (`.command-logs/view-diag/drag390.cjs`). A working runner is `.command-logs/f2b-li-smoke/` and `.command-logs/f2b-cc-smoke/run.cjs`.

## Owed (also in each family's task file)

- First F3 item of analytic lines: shrink the fixed view to ±10 (decided; `docs/tasks/analytic-lines/03-release-batches.md`). First F3 item of isometries: initial view about ±10, decide the `VIEW_HALF` handling (`docs/tasks/isometries/04-release-batches.md`).
- LatticePath: the `dragging` flag clears only on "up" (doubt, `notes/f2b-circle-combinatorics.md`); counting: the current-row arrow sits tight to the label at 390 px; circle Tab order vs two-column layout unconfirmed (`notes/f2b-circle-combinatorics-smoke.md`).
- From F2a, still owed at F2b of their families: browser frame times for solids and level sets (ADR 0051, 0053); the frieze NaN-break render check (isometries Batch C); the waves sinc cost; the phase-portraits curve updates; the level-sets `JsxSurfaceView` update; the `LessonAction` union entries for new scene actions (linear maps `set-start`/`step`; complex maps; level sets); a browser look at every legend.
- Controls-stream gaps stay filed in `docs/tasks/feature-streams/controls.md`.

## Next

1. Confirm the two pending publishes.
2. F2b for the remaining families, two families per worker, each followed by an engineering review (Sonnet), an opening-view check and a Haiku smoke: randomness (03), kinematics (02), recursion (02), waves (02), mechanical curves (02), phase portraits (03), solids (03, with browser frame times), level sets (04, with browser frame times), complex maps Batch D (09: ComplexPowerGraph, EulerCircleGraph, new routes). Linear maps 11 extends the existing `linear-map` route (modes in `LinearMapGraph`), so it needs no new route; check its task file for any registration or Preset step. Placements come from each family's ADR or spec proposal; where none exists, decide and record it in the spec's "F2b decisions" bullet with the rejected alternative.
3. Then F3 for the registered families (trigonometry, lines, isometries, circle geometry, combinatorics), starting with the owed view items, per `docs/tasks/<family>/` release-batch files (split them per batch first, as each file says).

Rules to keep: at most two workers in the stream at once; never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
