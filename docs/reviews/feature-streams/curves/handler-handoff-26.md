# Curves stream: handler handoff 26

Handler 26 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-02 at 157k context, before starting a new slice. It replaces [handoff 25](handler-handoff-25.md).

## State

- Branch `worktree-stream-curves` is pushed to `origin/master`; the head is the commit that adds this note. The working tree is clean.
- Nothing is in flight: no workers or preview servers. I stopped this stream's leftover capture processes. Port 4315 belongs to another stream's preview.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`.
  - Workers: `bezeg-worker` Sonnet `medium`.
  - Reviews: `bezeg-reviewer` Sonnet.
  - Smoke: `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new-UI checks.
- Test slots are shared and slow. A scoped unit run over `src/learning src/graphs/functions src/graphs/base/presets src/analysis src/localization src/demonstrations` took 605 s.

## Done this session

1. **CI:** the hosted run at `19aef2ba` was green in full (both unit jobs, all four chromium jobs, deploy). It covers IA-B-2d and IA-B-3b. Earlier runs were cancelled by newer pushes.
2. **I4 route browser smoke** (`a520f02e`):
   - 5/6 checks passed. Evidence is in the IA-B-2d row of `docs/tasks/interpolation-approximation/README.md`.
   - Gap: at 200% text on 390 px, the shared point-list row and legend overflow horizontally (scrollWidth 596). `/interpolation/lagrange` does the same, so the fix belongs to the shared `PointListInput`, not to I4.
3. **IA-B-3b, I4 guided lesson** (`25fec0a1`, `90b7f617`, `19aef2ba`):
   - Six steps. The `lsq` action has operations set-point, set-degree, set-mode, set-line and set-overlay. The lesson text is in `src/learning/content/interpolationLeastSquaresLesson.ts`.
   - Readout nits fixed: "≈" before inexactly rounded values (relative tolerance), and a best-fit note on the normal equations in manual mode.
   - Deferred under the one-shot lesson-text rule: steps 1 and 3 state the answer before the prediction, and step 3's scene applies the outlier up front.
   - Evidence is in the task README row IA-B-3b.
4. **I4 poster: blocked.** Details are in the curves.md Notes (`53c8237d`). A joint capture of `interp-least-squares`, `inversion` and `quadrature` is needed after `inversion` has a recipe; the capture tool is not `POSTER_PENDING`-aware.
5. Evaluation record: `docs/agent-workflow/evaluation-log.md` (curves handler 26).

## Next steps, in order

1. **I4 poster:** take part in the joint capture once Maps has added the `inversion` recipe (check `scripts/demonstration-preview-recipes.cjs`). Coordinate through the curves.md Notes; do not change the shared capture tool without that stream's agreement. Inspect the I4 image when it exists.
2. **Interpolation chapter (F4):** move the I1–I5 lessons (`interp-lagrange`, `interp-runge`, `interp-hermite`, `interp-least-squares`, `interp-subdivision`) out of the interim owner `bezier-curves/geometric-properties` (`src/learning/chapter/guidedLessonOwnership.ts`) into their own chapter. Read the family spec's chapter section first, and mirror BS-A-4 (chapter `b-splines`).
3. **Family 4 (PS) graphs** (`G-FN` open), per handoff 18. They reuse the I4 kernel `src/analysis/leastSquaresModel.ts` for regression.
4. Shared follow-up, low priority: point-list and legend overflow at 200% text (point 2 above). It touches several graphs, so it needs its own slice.
5. Deferred, low priority: handoff 24 item 4.

## Lessons for briefs

- A slice that adds a Preset collection runs `just unit src/graphs/base/presets` before push (handoff 25).
- After a rebase, rerun every count test the slice touched. `guidedExamplePreviewCopy.test.ts` conflicted silently, because both sides changed 81→82.
- Before a poster capture, check that every `POSTER_PENDING` id has a recipe.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-26.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium.
