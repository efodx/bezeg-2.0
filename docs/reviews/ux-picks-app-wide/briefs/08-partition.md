# Brief: task 08 step 4 — partition the remaining demonstrations into lanes and rounds

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push. A heavy `just check-changed`
is running: run no unit tests, builds or browsers; this is a planning task with small Node scripts only.

## Inputs

- Task: `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md` steps 4, 6, 8 and "Lane table".
- Triage: `docs/reviews/ux-picks-app-wide/inventory/08-triage.md` (classes per demonstration, section (b) components) and
  its data `inventory/inventory-2026-11-25.json` / `08-triage.tmp.json`; the inventory script that produced them (find it from
  `docs/reviews/ux-picks-app-wide/inventory/` README or `tools/`). Rerun the inventory only if it is a quick Node script.
- Step 2 is done (commits `c21078608`, `650ccf4bf`, `c88ffc88e`): `BaseFunctionGraph`, `BaseCurveGraph`, `PointSetGraph`
  each have an opt-in, so their files are no longer shared edits: a lane converts a subclass by opting in in the subclass file.
  Worked examples converted: exponential-function, bezier, polygon-area; pilots: taylor, function-transformation, decasteljau,
  linear-map, phase-portrait, projective-cross-ratio, patch-coons, triangle-centres, bisection.

## Rules (handler decisions)

1. A lane is a set of demonstrations whose **lesson files** connect them (frames are edited in the lesson file): use the
   "lesson files only" components. A component of more than 6 demonstrations is split into consecutive sessions of the same
   lane (2-3 demonstrations per session), never across parallel lanes.
2. Shared non-hub files (graph files or panels with at most six users, and own tests naming several demonstrations) that two
   lanes both need: those two lanes never run in the **same round**. Base classes with step-2 opt-ins
   (`BaseFunctionGraph`, `BaseCurveGraph`, `BaseBezierCurveGraph`, `PointSetGraph`, `PointSetControls`, `FunctionReadout`,
   `FunctionStatus`, `CurvePointControls`, `CurveWorkspaceControls`, `Commands`) are not shared edits: lanes do not edit them.
   Other shared bases that step 2 did not convert (`BaseSurfaceGraph`, `TensorPatchGraph`, `IterativeFunctionGraph`,
   `BaseSplineCurveGraph`, `BaseRationalCurveGraph`, `BasePhBezierCurveGraph`, `KnotEditor`, ...): assign each one owner lane
   that converts it first (in its first session), and put every other lane needing it in a later round.
3. A round has at most 3 lanes; each round must be publishable by itself (no lane in a round depends on an unfinished lane).
4. Order rounds: round 1 = small, plain lanes (good to measure the per-demonstration cost, step 8); surfaces and the
   contract-precedent cases (second board, 3D camera, vector parameters) later.

## Deliverables

- `docs/reviews/ux-picks-app-wide/inventory/08-partition.json`: lanes (id, demonstrations, sessions with 2-3 demos each, owned
  files: graph files, lesson files, own tests, shared bases it owns first), rounds (lane ids), and the conflict edges used.
- The script that computes it: `docs/reviews/ux-picks-app-wide/inventory/08-partition.cjs` (reproducible).
- Replace the "Lane table" section in `08-convert-all-graphs.md` with: Round | Lane | Demonstrations | Files owned (short) |
  Status ("not started"), one row per lane, and two lines on how it was computed. Keep the file readable: list long file sets
  as "graph files + `<lesson file>`" and point to the JSON.
- Check: every one of the 138 demonstrations appears exactly once, either in a lane or as already declared (list those
  separately); no two lanes in one round share an owned file (the script asserts it).

## Return

At most 250 words: lane and round counts, round 1's lanes, any demonstration that fits no rule, and the assertion output.
