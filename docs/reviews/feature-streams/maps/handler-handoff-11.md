# Maps stream: handler handoff 11

Written 2026-11-01 by handler 11 (Opus 5.5, `auto`, effort `medium`) after the 150k context threshold. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, local branch `worktree-stream-maps` = `origin/master` after this note's commit.

## Git state

On `origin/master` from this run:
- `0418230f`: linear identity label overlap fix;
- `75a40cca`: F6 status in the linear, complex and stream task files;
- this note.

The Learn deep-link smoke minimum for `complex-maps` (2 sections) was also needed. Master's `514dce5c`, from another session, already carries the same change, so this run's own commit for it dropped out on rebase. `514dce5c` also moved `POSTER_PENDING` to `src/demonstrationPosterPending.ts`, which the smoke catalog parses as well.

## Done this run

- **Hosted CI:** `dd2cfc08` fixed "Learn opens chapters", but the complex-maps deep-link row then failed (min 5 sections vs 2). Fixed on master by `514dce5c`. Runs at `0418230f` and later are green.
- **Linear identity label overlap** (`0418230f`, `LinearMapGraph.tsx`):
  - `p = e₁+e₂`, so `Ap` always sits on `A(e₁+e₂)`. While the square and `p` are both shown, the Ap point's name is a function that returns `Ap=A(e_1+e_2)`, and the `A(e₁+e₂)` label is hidden. JSXGraph 1.14.1 labels call a function name.
  - The `e₁`, `e₂` and `p` labels step aside (below-left, left, above-left) while their image is less than 1 unit away. Labels sit about a unit off their point at normal scale, so 0.5 was too tight.
  - All 8 points stay visible, so the example-card inventory (`point: 8`) holds.
  - Checks:
    - browser screenshots at 1366 and 1920 px of the identity, a shear (1, 0.5)/(0.5, 1) and the shear with `p` hidden, in `.command-logs/h11-label/`;
    - EN after a live switch;
    - `just smoke-lesson linear-map` and `tests/unified-learning.smoke.spec.cjs` passed;
    - 34/34 linear unit tests and tsc on the rebased tree.
  - The probe's overlap list in `probe.cjs` is unreliable (it lists hidden labels), so judge by screenshots.
- **Complex 04 F6 checks** at `0418230f`:
  - `just check` green: 7464 unit tests passed, 1 skipped; build passed.
  - `bezeg-smoke` (Sonnet, medium), 7/7 passed. Report in `.command-logs/h11-f6-smoke/report.md`.
  - Smoke coverage:
    - restore on exit after a user edit (reciprocal SL, roots EN);
    - Preset save, reload and reopen; SVG and PNG export;
    - keyboard path to named inputs; presentation mode at 1920×1080;
    - `/learn/complex-maps` deep link and refresh; `/complex-multiplication` lesson unchanged;
    - zero console errors.
  - Downloads remain in `.command-logs/h11-f6-smoke/dl/` (untracked; the worker's delete was blocked).

## Blocker: posters (unchanged, needs the owner or the platform stream)

Linear 07 F6 and complex 04 F6 now wait only on the posters for `linear-map`, `complex-reciprocal` and `complex-roots`. The selective recapture stops at `scripts/capture-demonstration-previews.cjs:776` while other streams' Demonstrations have no retained poster. See handoff 10 for options (a)–(c). After capture, remove the three ids from `src/demonstrationPosterPending.ts` and update the Learn thumbnail count in `LearningPage.test.tsx`. Check the posters' framing.

## Next, in order

1. **Triangle 05** (Batch A release of the notable points and inscribed angle graphs), as in handoff 7 and `docs/tasks/triangle-geometry/`. Geometry has not yet answered the `PointSetGraph` vertex-name hook request (stream file, maps handler 7). Until it does, task 05 keeps the panel mapping "A (P1)".
2. Posters when the blocker clears (above).

## Observations (not blocking, not compared with master)

- Presentation mode at 1920×1080: header nav buttons have near-invisible light text on white, and the readout panel starts below the fold. Both look like app-shell issues; screenshots `c5-*.png` in `.command-logs/h11-f6-smoke/`.
- Handoff 10's M2 notes still stand: the preset select name is stale after scene edits, and the overlay covers the board top at 1440×900.
- Memory pressure stopped this run's background build and watcher once. `scripts/test-slots.cjs` now has a memory gate (`363e6c32` and later from another session).

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium`; reviewers `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet on port 4316 (preview: `just preview 4316`, positional port). Heavy `just` commands share test slots across worktrees; waits of up to an hour happened this run.
