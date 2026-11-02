# Maps stream: handler handoff 20

Written 2026-11-02 by handler 20 (Opus 5.5, `auto`, effort `medium`). The supervisor started it after the stream had no live session. It continued from [handoff 19](handler-handoff-19.md).
- Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`.
- Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, rebased on `origin/master`.
- **08 F3+F4 is uncommitted in the worktree** (15 files plus `08-f3-f4-brief.md` and `08-f3-f4-w1-notes.md`). This note, `08-f3-f4-brief.md` and `08-f3-f4-w1-notes.md` are committed and pushed; the F3+F4 code is left unstaged in the worktree for the successor.

Reason for handoff: the handler context passed its 175k soft threshold while the F3+F4 review and checks ran.

## Done this session

- **`5044f380` 08 F2a slice 2: the inversion graph** (on master). The `wip:` commit was squashed into this `feat:` commit.
  - Repairs confirmed. A Sonnet engineering re-review confirmed the marker, the listener ownership and the angle tangents.
  - Its new finding is fixed: a wheel or button zoom fires no pointer `up`, so the view never settled. There is now a 150 ms settle after `boundingbox`, and a new host test failed under mutation.
  - Item 7 (Shift+arrow) failed under mutation, as expected.
  - Full `just unit` passed. tsc, lint and `just build` passed.
  - Not fixed (low): with the image overlay off, one extra resync can follow a state change. Recorded in `08-f2a-graph-repair-handoff.md`.
- **`4372782a` 08 F2b: route `/inversion`** (on master).
  - Brief `08-f2b-brief.md`, smoke brief `08-f2b-smoke-brief.md`; smoke 9/9 passed after a fix.
  - The fix: smoke found the panel said "zunaj pogleda" for an image beyond `INVERSION_DRAW_CAP` (never drawn at any zoom). It now says "predaleč za risanje" / "too far to draw" (key `inversion_beyond_cap`).
  - Rebase conflict with Curves' `interp-least-squares` registration and Geometry's Delaunay lesson. It was mechanical: both sides kept, catalog total 84, `POSTER_PENDING` = `['interp-least-squares', 'inversion']`.
- **08 F3+F4 implemented, not accepted** (uncommitted). Two Sonnet workers; the first stopped on budget. Notes: `docs/reviews/triangle-geometry/08-f3-f4-w1-notes.md`.
  - Worker 2: the brief's unit paths, the transient-state contract and lint passed after its fixes. Mutations are recorded in its notes.
  - `en.ts` showed only a line-ending change; I restored it.

## Next, in order

1. Read the F3+F4 review and check results below. Repair any accepted findings with one worker.
2. Run `just smoke-lesson inversion`, or the new `inversionLesson` row and "Inversion extras" test in `tests/guided-lessons.smoke.spec.cjs`, against a fresh build on port 4316. Neither has run yet. It relies on the field labels `X: x` / `X: y`.
3. Commit F3+F4 with explicit paths, update `maps.md` and `docs/tasks/triangle-geometry/README.md` (F3+F4 done), rebase, and push.
4. 08 F5: the `inversion` poster recipe (`scripts/demonstration-preview-recipes.cjs`, as `a142bf70` did for `simson-line`) and example cards if T4 had them. Then 08 F6: `just check`, smoke of `/inversion` and lesson T5 in both languages, hosted CI. Batch D then waits only on the poster.
5. When Batch D is accepted, the triangle geometry family and the stream are complete apart from the shared poster capture. Decide then whether `Run state` becomes `complete` or `waiting`; the posters belong to Curves BS-A-5b.

## F3+F4 review and checks (filled in at handoff)

- **Sonnet review** (actions, scenes, mathematics, tests, smoke labels): no blocking findings. The reviewer recomputed every number independently. Orientation reversal is stated, and "conformal" appears only with that qualification. The ±60° signs match `analyseAngle`. Two optional items, worth applying in step 1:
  - `InversionGraph.tsx:254`: `set-x` with a missing or non-object `point` relies on `isInversionPoint` tolerating `undefined`. Add a record check so content errors give the clear message.
  - The Slovenian section purpose in `triangleGeometryChapter.ts` has a missing connector: "krožnico devetih točk Simsonovo premico".
- **Handler checks on the uncommitted tree:** tsc, `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations src/Routes src/DemonstrationsPage` (460 s) and `just build` passed on top of `4372782a`. Only the browser smoke and the two optional items remain before the commit.

## Open items carried over

- `origin/maps-handoff-18` is stale (its commit is on master); auto mode blocked deleting it. The owner may delete it, along with the older `maps-*` remote branches.
- Geometry has still not added the `PointSetGraph` vertex-name hook. The inversion graph renames `P1` itself.
- The posters for `linear-map`, the complex maps, `triangle-centres`, `inscribed-angle`, `euler-line`, `simson-line` and `inversion` wait for the shared capture.
- The content nits from handoff 17 are still not applied.
- `NO_SYNCHRONOUS_SCENE_CHANGE` still lists `inversion`, because `sceneActions` has no candidate for the new `inversion` action kind.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`; handler self-watch at 175k (owner memory).
- Workers: `bezeg-worker` Sonnet 5.5 `medium`. Lesson slices exceed one worker's budget; split lesson code from tests up front.
- Reviewers: `bezeg-reviewer` Sonnet.
- Smoke: `bezeg-smoke` Sonnet on port 4316. The preview is stopped.
- `just preview` takes the port as a plain argument (`just preview 4316`).
- When squashing or resetting, note that another session's fetch may have moved `origin/master` since your rebase. Rebase first.
