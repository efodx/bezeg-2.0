# Maps stream: handler handoff 18

Written 2026-11-02 by handler 18 (Opus 5.5, `auto`, effort `medium`), which continued from [handoff 17](handler-handoff-17.md).
- Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`.
- Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`.
- `origin/master` is at `1d40b2cf`. The branch is one commit ahead, `d4ea091c` (the unreviewed inversion model), and is pushed to `origin/maps-handoff-18`, **not** to master (`origin/worktree-stream-maps` holds old diverged history; I did not force it). After step 1 lands on master, delete `origin/maps-handoff-18`.
- This note is the next commit on the branch.

Reason for handoff: the handler context passed the 150k soft threshold while the 08 F2a model worker ran. Its slice was integrated and verified; no new step was started.

## Done this session

- **Hosted CI** passed at `6d2149f6`, which contains 07 F3+F4 (`2c031c89`).
- **`a142bf70` 07 F5: `simson-line` poster recipe** (on master).
  - All overlays are on, as in the defaults. The window is `[-4.2, 6.6, 11.2, -2.81]`, because the foot E = (2.40, 6.00) is above the sibling window.
  - The evidence checks the vertices exactly, and P and D, E, F to 1e-6.
  - `node --test scripts/demonstration-preview-capture.test.cjs` passed 36/36.
  - A diagnostic capture (`PREVIEW_IDS=simson-line`) against a production preview framed all 20 objects with no console errors.
- **`1d40b2cf` 07 F6: checks passed** (on master).
  - `just check` passed at `a142bf70`.
  - Browser smoke (Sonnet, brief `docs/reviews/triangle-geometry/07-f6-smoke-brief.md`): 11/11 passed with no console errors. All nine offset stops behave per the owner decision.
  - Observed, not a Batch C defect: at 390 px the shared lesson panel covers most of the board until "Skrij" is used.
  - Batch C now waits only on the poster from the shared capture.
- **08 kernel check:** the `invertExact` vs `circleInversion` 1e-12 test already exists (`src/compgeo/circle.test.ts:324`). Nothing to add.
- **`d4ea091c` 08 F2a slice 1: inversion model** (branch only).
  - Files: `src/compgeo/inversionModel.ts` and its 20 tests. Brief: `docs/reviews/triangle-geometry/08-f2a-model-brief.md`.
  - Handler verification: `just unit src/compgeo/inversionModel` passed 20/20, and tsc passed. Drawn images come only from `circleInversion`/`inversionImage`. Lines 310–311 are tangent points, not an inversion.
  - Worker deviations, accepted pending review:
    - `INVERSION_DRAW_CAP = 30`. `BOARD_COORDINATE_CAP` can never trigger on grid inputs.
    - Example `angle` uses `which: 1` for Q ≈ (2.134, 0.5). The brief's index was wrong.
    - At exactly ±90° the signed angle wraps instead of negating.
    - Exact lines are `a x + b y = c` with coprime integers.
    - The tangent secant uses a relative tolerance of 1e-12.
  - Not mutated: the recursive finiteness assertions and the line-iff-through-centre check.

## Next, in order

1. **Mathematical review of `d4ea091c`** (`bezeg-reviewer`, Sonnet `medium`).
   - Check the exact image form against `complexMobius.ts:306-330` (real-coordinate form A|z|² + 2 Re(conj(B) z) + C).
   - Check the signed-angle convention and its ±90° wrap.
   - Check the secant-product sign, and that the tangent points are a tangent, not an inversion.
   - Check that no double inversion is re-implemented.
   - Repair, then rebase onto `origin/master` and push it to master (with this note).
2. **08 F2a slice 2: the inversion graph.** Brief to write, modelled on `07-f2a-brief.md`. Decisions to make there:
   - The graph base. The scene is not a triangle. Candidates: a `PointSetGraph` subclass, as with the Simson/Euler siblings, or a standalone board like `src/graphs/complex/ComplexReciprocalGraph.tsx`. Prefer whichever gives owned draggable C, X, P and the source centres without changing `PointSetGraph`, which Geometry owns.
   - The view, and whether the cap of 30 fits it.
   - The overlays: inversion circle, point, gallery, secant, tangent, angle.
   - The Presets key `compgeo-inversion`, the locale block (`inversion_*`), the centre-point message, and an edge marker for far images.
   - Host tests and a drag measurement.
3. Then 08 F2b (route `/inversion`, `POSTER_PENDING`), F3+F4 (lesson T5, with complex maps lesson 1 linked; the chapter's fifth section), F5 and F6, as for Batch C.

## Open items carried over

- Geometry has not added the `PointSetGraph` vertex-name hook. The panels still say "A (P1)".
- The posters for `linear-map`, the complex maps, `triangle-centres`, `inscribed-angle`, `euler-line` and `simson-line` wait for the shared capture (Curves BS-A-5b).
- Content nits from handoff 17 are still not applied.
- The memory reaper sometimes kills background commands. Restart the context watcher at once if that happens.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet 5.5 `medium`.
- Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI, localization and content fidelity.
- Smoke: `bezeg-smoke` Sonnet on port 4316.
- The production preview the handler started on port 4316 is stopped at handoff.
