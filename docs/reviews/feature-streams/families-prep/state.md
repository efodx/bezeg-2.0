# Families-prep state note

Handler 8 handed off on 2026-11-11 to handler 9. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots: `just check-changed` took 35 min once, a publish about an hour. Run long checks in the background.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <id,...>`, then check `just publish --status`. Pushed hashes differ from local ones. Wait for a pending publish before you start one that depends on it (a background `while ... pending; sleep 30; done` loop that then starts the next publish works). After a push, watch the hosted run (`gh run list --workflow browser-smoke.yml`, `gh run watch <id> --exit-status`): the owner asked that this stream keep master's CI green.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree, rebase only your new commits with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, and publish on the new base.
- Run `git diff --cached --check` before committing. When two slices share the locale files, stage one slice's lines through `git update-index --cacheinfo` with a blob built from HEAD (handler 8 did this for `41b13bda`).
- To check a fix in isolation, `git worktree add ../<name> HEAD`, copy the files, and junction `node_modules` (`New-Item -ItemType Junction`); remove the junction with `cmd //c rmdir` BEFORE `git worktree remove --force`.
- Remind reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs. Broad smoke goes to Sonnet (a Haiku smoke stalled on selectors). Working smoke scripts: `.command-logs/f2b-rk-smoke/scripts/` (Reset "Ponastavi", Save tab "Shrani", import button "Zamenjaj zbirke in uvozi", delete confirm "Da", debounced status read after about 2 s).

## Done

- F0, F1, F2a for all fifteen families (handlers 2–6); F2b for trigonometry, lines, isometries, circle geometry, combinatorics (handler 7).
- Handler 8 (local id → pushed):
  - F3 opening views of line geometry and isometries at ±10 `41b13bda` → `bf465ddc` (line foot off view now in the status; isometry captions shrink and stack on narrow boards).
  - CI repair `3b734a30` + `89ba5e4c` → `c7552e58`: hosted browser smoke was red since `31135acc` (catalogue page listed feature-registered rows after every family; counting-tree draws only text). The catalogue now renders family by family (`src/DemonstrationCollection.tsx`); the smoke counts board text for `counting-tree` (`TEXT_SCENE_IDS` in `tests/demonstrations.smoke.spec.cjs`). CI green at `c7552e58`.
  - F2b randomness + kinematics `5c500930` → `8c106849` (`/probability/simulation`, `/curve-geometry/kinematics`); evidence `notes/f2b-random-kinematics.md`, smoke `notes/f2b-random-kinematics-smoke.md`.
  - Browser timings of those routes `bd26e7c1` → `1f6f2d12` (`docs/bezier-performance-results.md#f2b-simulation-and-kinematics-browser-timings--2026-11-11`): two phone-profile misses, owed (below).
  - F2b recursion + waves `b3ad79d0` (publishing at handoff; `/analysis/recursion`, `/analysis/growth`, `/functions/waves`); evidence `notes/f2b-recursion-waves.md`, smoke `notes/f2b-recursion-waves-smoke.md`. It also fixes the Preset file-import view in the simulation and kinematics graphs. Before it, handler 8 rebased the branch onto `origin/master` (`10e3df2e`), resolving one conflict with the controls-visual reduced-motion commit `acbfa998`: waves uses master's `reducedMotionReason` text and its `describedBy` slot for a visible reason under Play.
- **F2b pattern**: recipe in `notes/f2b-trig.md`; the full file set of one slice is `git show --stat 5c500930`. Feature-local registration (`registration.ts`, `collections.ts`, `runtime.ts`, composition test; a subdirectory in a legacy directory, e.g. `src/graphs/functions/waves/`); a Preset collection per graph keyed by the id, checked by the model parser; rows `lesson: false` with the pending lists. Feature-registered rows sit at the end of their family (the waves row follows `arc-length`, not the trigonometric functions).
- **Lessons from the F2b slices** (put them in every brief):
  - Framing: frame in the sync after a build, never inside `buildScene`; in `syncReplacedScene` build first, then mark the frame key; do not reset the drawn-frame key in build/dispose (it re-frames every rebuild and adds tick labels); `initialize()` frames once where the mount box differs.
  - Preset FILE import with `boardState` and non-default data lost its view in five graphs (fixed: frame mark or a `keepNextFrame` latch in `importPresetData`). Test this path for every new graph.
  - Non-geometric plots: `equalAxisUnits` false; then `showInitialView` still passes keep-aspect true, so recursion graphs override it (a reviewer called the override redundant; it is not).
  - `board.update()` does not re-evaluate function-valued `visible`: `fullUpdate()` only when a visibility result changes; guard test "a switch redraws with fullUpdate, a time change does not".
  - Captions: run the opening-view check at 1280x800 and 390x844 in sl AND en; wrapped captions must stack by their line count (`captionLines` in KinematicsGraph/WavesGraph), and caption bands sit outside the data.
  - Cross/plus/x markers are stroke-only; stroke them in their colour, test `strokecolor`.

## In flight at handoff

- Publish `b3ad79d0` on base `10e3df2e` (check `just publish --status`; on success watch the hosted CI run). This state note is committed after it; publish it with base `b3ad79d0` once that is ok (handler 8 started a background loop that does this; check status before starting another).
- No worker is running. The local branch now sits on master's history (published commits replaced by their master versions), so the next publish base is the last local commit that `just publish --status` reports ok.

## Owed (also in each family's task file)

- Randomness: galton 10^5 blocks about 0.5 s at 4× CPU (prefix re-simulation; profile before a fix); markov state box overflows at 390 px.
- Kinematics: Play runs at 30 fps at 4× CPU (board update 12–13 ms; profile before a fix); captions over the y-axis tick labels.
- Waves: browser sinc timing; the plot is smaller at 390 px since the caption band grew; the "view changed" status note is gone after a Preset import (box is right). Cobweb has no step-back control (design question for F3). Isometries: default captions crowd the origin at 390 px. Lines F3 view done; isometries view done.
- LatticePath `dragging` flag doubt; counting arrow at 390 px; circle Tab order (`notes/f2b-circle-combinatorics-smoke.md`).
- From F2a, still owed at F2b of their families: browser frame times for solids and level sets (ADR 0051, 0053); the frieze NaN-break render check (isometries Batch C); the phase-portraits curve updates; the level-sets `JsxSurfaceView` update; `LessonAction` union entries for new scene actions (linear maps, complex maps, level sets, recursion); a browser look at every legend.

## Next

1. Confirm pending publishes and the hosted CI run of the last push.
2. F2b for the remaining families, two per worker, each followed by a Sonnet engineering review, the opening-view check (sl and en), the Preset file-import view test, and a Sonnet smoke: mechanical curves (02), phase portraits (03), solids (03, with browser frame times), level sets (04, with browser frame times), complex maps Batch D (09: ComplexPowerGraph, EulerCircleGraph), linear maps 11 (extends the existing `linear-map` route; check its task file). Placements come from each family's ADR or spec; otherwise decide and record an "F2b decisions" bullet with the rejected alternative.
3. Then F3 for the registered families per `docs/tasks/<family>/` release-batch files (split them per batch first).

Rules to keep: at most two workers in the stream at once; never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
