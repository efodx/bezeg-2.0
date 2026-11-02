# Maps stream: handler handoff 16

Written 2026-11-02 by handler 16 (Opus 5.5, `auto`, effort `medium`), relaunched by the supervisor after handler 15's session ended. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, equal to `origin/master` at `a1e45cba` before this note. Push to `master` only.

Reason for handoff: the handler context passed 150k.

## Done this session (all on `origin/master`)

- **`30ba2b2e` 06 F5: `euler-line` poster recipe.**
  - All overlays are on, with the window of the sibling recipes (`[-3.55, 5.81, 10.55, -2.81]`).
  - The evidence checks the vertices, H, G, O, N and all nine points exactly.
  - `node --test scripts/demonstration-preview-capture.test.cjs`: 36/36. The registry test failed before the recipe.
  - A handler Playwright run against a production preview found 16 points and 4 lines, all in frame, with no console errors.
  - Hosted CI passed.
- **`f71e610b` 06 F6 checks accepted.**
  - `just check` passed at `30ba2b2e`.
  - Browser smoke (Sonnet; brief `docs/reviews/triangle-geometry/06-f6-smoke-brief.md`): 9/9 passed.
  - The triangle-geometry chapter minimum is now 3 sections, in `familyChapters.test.ts` and `tests/unified-learning.smoke.spec.cjs`.
  - Batch B waits only on the poster capture.
  - Smoke observations judged not to be defects:
    - "Pokaži vse" is the shared view-framing button, which the lesson runtime disables in steps.
    - The floating lesson card covers part of the board, notably on mobile. That is shared lesson UI (Learn UI), not this family.
- **`a1e45cba` 07 F2a: Simson line graph, model and Presets.** No route yet.
  - Brief: `docs/reviews/triangle-geometry/07-f2a-brief.md`. Worker 1 handoff: `07-f2a-w1-handoff.md`. Drag measurement: `07-drag-measurement.md` (step p50 31–38 ms).
  - Two workers: the first reached its context threshold; the second ran the mutations, lint, build and review repairs.
  - Mutation evidence covers every test group.
  - Reviews: Sonnet engineering + mathematics found only nits (the JSXGraph casts match the Euler graph). Haiku UI/localization had 4 should-fixes and 2 nits, all applied.
  - Handler checks: tsc, focused unit runs (`src/compgeo src/graphs/compgeo src/localization src/learning/content`, then the Simson paths and localization after the rebase), and `just build`.
  - Decision accepted: an example id stays active only while the vertices, the mode and (in exact mode) P′ equal it.

## Next, in order

1. Check hosted CI for `a1e45cba` or later.
2. **07 F2b:** route `/simson-line` and Demonstration registration, as `06-f2b-brief.md` did for `euler-line`.
   - Family `plane-geometry`, lessonless until F3, `POSTER_PENDING`.
   - Preset key in import.
   - Temporary chapter-link exemptions until F4.
3. **07 F3+F4:** lesson T4 (7 steps, spec T4 "Steps"), a chapter section, and preview copy. Model it on `06-f3-f4-brief.md`.
   - Step 6 (P at a vertex) uses the `vertex` example in exact mode.
   - The prose must say that the drag shows only the "if" and that ε = 0.001 looks collinear while the area readout says it is not.
4. **07 F5:** the poster recipe.
5. **07 F6 needs the owner.** Before F6, get the owner's acceptance of the T4 tolerance policy:
   - Exact mode for a grid P′.
   - "Within 10⁻⁹ S" in glider mode.
   - The discrete offset slider.

   Handler 16 put this question to the owner in its session but got no answer. If no answer is recorded by F6, set `Run state: stopped: owner must accept the T4 tolerance policy (spec T4 acceptance 1–3)` and end.

## Open items carried over

- Geometry has not added the `PointSetGraph` vertex-name hook. The panels still say "A (P1)", and the Simson graph follows that too.
- Posters for `linear-map`, the complex maps, `triangle-centres`, `inscribed-angle` and `euler-line` wait for the shared capture.
- The memory reaper sometimes kills background commands. Restart the context watcher at once if that happens.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`. Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI and localization. Smoke: `bezeg-smoke` Sonnet on port 4316.
