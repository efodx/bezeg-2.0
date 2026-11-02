# Maps stream: handler handoff 15

Written 2026-11-02 by handler 15 (Opus 5.5, `auto`, effort `medium`). Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps` (equal to `origin/master` at `05527bd4` before this note). Push to `master` only; `origin/worktree-stream-maps` is stale.

Reason for handoff: the memory reaper stopped every background command (including the self context watcher), so the handler budget could no longer be measured, and F6 needs the full unit suite while memory is short.

## Done this session (all on `origin/master`)

- `62ad3616` **Inscribed-angle rollback red fixed.**
  - Cause: `96c0b2c9` (T2) gave `InscribedAngleGraph` a `parameter t` lesson action. That left its `NO_SYNCHRONOUS_SCENE_CHANGE` entry in `graphTransientStateContract.tsx` stale, so the "scene changed first" assertion failed. The rollback itself was correct.
  - The entry is removed.
  - Checks: `BEZEG_TRANSIENT_STATE=inscribed-angle,triangle-centres,euler-line` contract, 24/24.
- **`/bezeg-2.0/euler-line` browser check** (production build of `62ad3616`, handler Playwright script), all passed:
  - SL load.
  - 7 overlay switches redraw the board.
  - A drag snaps A to (1,1), and the readouts were recomputed by hand.
  - Live SL→EN switch keeps the edited triangle and translates the panel and the board label.
  - 390×844: no horizontal overflow.
  - No console errors.
- `3241d59b` **06 F3+F4.** Brief: `docs/reviews/triangle-geometry/06-f3-f4-brief.md`; worker notes: `06-f3-f4-w1-notes.md`.
  - Lesson T3 `euler-line-nine-point` (7 steps), chapter section `euler-line`, and preview copy.
  - `euler-line` now has a lesson. Both F2b exemptions are removed.
  - Overlay names `centres`, `line`, `circle`, `ninepoints`, `circumcircle` are in `POINT_SET_OVERLAY_NAMES`.
  - Smoke row `eulerLine`.
  - The chapter tests now also forbid `inverz|invers` in section prose and in the purpose/prerequisites.
  - `euler-line` stays in `NO_SYNCHRONOUS_SCENE_CHANGE`, because no generic `sceneActions` action applies to it. The comment now says this.
  - Reviews:
    - Sonnet engineering + maths: no blocking finding; every number recomputed.
    - Haiku copy/l10n, repairs applied: the count prompt, *sovpadejo* instead of *ujamejo*, and the preview-copy wording.
    - Rejected: *Povlečenje* (T1/T2 and `sl.ts` use *vlečenje*) and dropping the shared "Cilj razdelka:" pattern.
  - Rebase onto master's B-spline L1 and projective K1 conflicted mechanically in four files: the overlay list, the preview-copy counts (now 75/82), the lessonless list, and the smoke rows. Resolved by keeping both sides.
- `05527bd4`: status in `docs/tasks/triangle-geometry/README.md` and `docs/tasks/feature-streams/maps.md`.

## Checks and revisions

- Before the rebase (dirty on `62ad3616`):
  - Focused `just unit src/learning src/graphs/compgeo src/compgeo src/localization src/demonstrations`: 2234/2236, and the 1 failure was then fixed.
  - The `euler-line` contract passed.
  - `just build` passed.
  - `just smoke-lesson euler-line triangle-centres inscribed-angle`: 6/6.
  - One mutation (|HO| 1/14→1/15) failed the T3 near-equilateral test as intended.
- After the review repairs: tsc and eslint clean; chapter, preview-copy and math-notation tests 29/29. The broad focused run was reaped by low memory and **not rerun**.
- After the rebase (`3241d59b`): tsc, eslint on the conflicted files, and `just unit` on the conflicted tests plus the chapter test, 59/59.
- **Not run on the rebased head:** full `just unit`, `just check`, CI result, a browser walk of the T3 lesson in SL/EN with a live switch (only the automated lesson smoke ran), and the Learn chapter page with the new section.

## Next, in order

1. Check hosted CI for `05527bd4` (or later). It runs every transient-state contract and the full suite.
2. **06 F5:** the poster recipe for `euler-line`, as `35fe9a2a` did for `triangle-centres`/`inscribed-angle`. Run `node --test scripts/demonstration-preview-capture.test.cjs`. The poster stays `POSTER_PENDING` until the shared capture.
3. **06 F6:** `just check`, then `bezeg-smoke` (Sonnet, port 4316):
   - The `/euler-line` route and lesson T3 in SL and EN with a live switch, keyboard, and 390×844.
   - The Learn chapter `triangle-geometry` showing three sections.
   - Confirm T1/T2 unchanged.
   - Record acceptance in the task README.
4. Then 07 Batch C (Simson line). It needs the owner to accept the T4 tolerance policy (task 07 prerequisite): ask before starting.

## Open items carried over

- Geometry has not added the `PointSetGraph` vertex-name hook, so the panels and the T3 prose still say "A (P1)".
- In the lessons, `set-points` scenes show "custom" in the example selector (T3 steps `special` and `near-equilateral` included).
- `tests/unified-learning.smoke.spec.cjs` keeps the triangle-geometry minimum at 2 sections. Raise it to 3 in F6 if the deep-link check wants it.
- The memory reaper stopped background commands again this session. Restart watchers or long runs only when the user asks.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`. Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI and localization. Smoke: `bezeg-smoke` Sonnet on port 4316.
