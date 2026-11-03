# Curves stream: handler handoff 35

Handler 35 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 34](handler-handoff-34.md).

## State

- Branch `worktree-stream-curves`, pushed to `origin/master`. The head is the commit that adds this note, and the working tree is clean.
- Nothing is in flight: no workers, and the preview is stopped.
- Hosted CI on `master` is red only in `unit (2)`, on two `PresetCatalog.test.tsx` cases caused by Functions' `fourier-coefficients` collection (`39217a5e`). The Functions worktree (`stream-functions`) had the fix uncommitted. **First step:** run `gh run list --branch master --limit 5`.
  - If a later run is green, mark Batch A/B released in the PS-B-F6 row of `docs/tasks/probability-statistics/README.md`.
  - If `unit (2)` still fails on that key only, leave it to Functions.
  - When rebasing over their fix, the line in `PresetCatalog.test.tsx` that lists `prob-correlation` conflicts mechanically: keep both keys.
- Settings: the handler runs Opus with `--permission-mode auto` and `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers are `bezeg-worker` Sonnet medium, reviews `bezeg-reviewer` Sonnet, smoke `bezeg-smoke` (Haiku for narrow checks, Sonnet for broad checks or new UI).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `6e5ddf9b` | P5 plan (PS-C-5a1..F6 rows); refreshed "To Geometry" poster note; PS-C-5a1 model `correlationModel.ts` (Sonnet worker) | PS-C-5a1 row |
| `4c82f025` | PS-B-F6 gate row (Batch A/B; release waits for green CI) | PS-B-F6 row |
| `3e711627` | PS-C-5a2 `CorrelationGraph`, Presets `prob-correlation`, 48 keys per language (Sonnet worker, Sonnet review) | PS-C-5a2 row |
| `3c1c0bb8` | PS-C-5b registration at `/bezeg-2.0/probability/correlation`, `lesson: false`, `POSTER_PENDING`, recipe; browser smoke passed | PS-C-5b row |
| `8a80ae19` | PS-C-5c lesson hooks: kind `correlation` (`set-point`, `add-point`, `remove-point`), choice `correlation-example`, visibility `correlation-residuals`, `correlation-x-on-y` | PS-C-5c row |
| `7e4e8c23` | `perturbModel` case for `prob-correlation` (the full transient-state run failed before it, passed after) | evaluation record |
| this commit | stream row, evaluation record (curves handler 35), this note | `docs/agent-workflow/evaluation-log.md` |

Decision recorded in the PS-C-5a1 row: the P5 model allows 2–20 points, where the spec's graph needs say 3–20. Without this, acceptance 3's too-few state could not be reached on screen; r stays disabled below 3.

## Next steps, in order

1. Check CI (State).
2. **PS-C-5d1 / 5d2:** the six-step P5 lesson `prob-correlation` in `probabilityGuidedLessons.ts`, followed by the chapter section `correlation` in `probabilityChapter.ts`, in one commit. The ownership test needs the section once the lesson is owned. Follow the PS-B-4d1 / 4d2 row and use one-shot text.
   - **Steps (spec P5):**
     1. Scatter plot with residuals off; predict r.
     2. Residuals on: r 0,92338, line y = 0,9x + 0,9.
     3. `set-point` 3 → (3, 8): r 0,8468, y = 2,1x + 0,1, SSres 8,7.
     4. `correlation-example` parabola: r = 0.
     5. `correlation-x-on-y` on with the default data: x = 0,94737y − 0,63158; the product of the slopes is r².
     6. Free exploration.
   - The host test "one synchronous sequence follows the planned lesson" in `CorrelationGraph.host.test.tsx` already drives these exact actions.
   - **Acceptance 4 prose** must say:
     - r measures linear association only;
     - r = 0 does not mean independence;
     - a large |r| does not mean causation;
     - one outlier changes r (0,92338 → 0,84680);
     - squared vertical residuals are a modelling choice (I4);
     - the matura "preproste povezave" is met by the scatter plot and the sign of the slope.
   - **Also in that commit:**
     - drop `lesson: false` and the `lessonCatalog.test.ts` opt-out;
     - drop the `CHAPTER_LINK_PENDING` entry in `familyChapters.test.ts`;
     - add the preview-copy entry in `guidedExamplePreviewCopy.ts`;
     - update the chapter coverage counts.
   - **Checks:**
     - run `BEZEG_TRANSIENT_STATE=all just unit src/graphs/base/GraphTransientState` after dropping `lesson: false`;
     - run `just smoke-lesson prob-correlation`.
3. **PS-C-F6:** the Batch C gate. Run `just check`, then a family smoke of P5 in SL/EN at 1440 and 390, including the chapter section. Posters come later.
4. **Posters:** still blocked on the Geometry recipes (`monotone-partition`, `monotone-triangulation`, `voronoi`, `voronoi-degenerate`). Follow the "To Geometry" note in `curves.md`; `prob-correlation` is now in `POSTER_PENDING` with a recipe.
5. **Low priority:**
   - P5 line labels are crossed by the other line or a residual at 1440 and look large at 390 (smoke screenshots of `3c1c0bb8`);
   - a typed coordinate beyond ±20 is refused silently in its field (shared `NumberInput`);
   - the PS-C-5a2 notice-clear assertion has no mutation evidence;
   - the items carried over from handoff 34 (P4 fence view, pointer drag at the board edge, `importPresetData` render request, CLT legend wording, aria-disabled playback reasons, CltGraph lifecycle tests, P2 visual notes).

## Lessons for briefs

- After any registration or `lesson: false` change, run the full transient-state contract locally. It caught `prob-correlation` here before CI did.
- Before editing a shared test table, check other worktrees (`git -C <worktree> status -- <file>`) for an in-progress fix by the owning stream.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-35.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
