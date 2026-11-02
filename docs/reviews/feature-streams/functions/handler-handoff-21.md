# Functions stream: handler handoff 21

Handler 21 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 at its 175k soft threshold. The supervisor started it after the PC switch.

## Pushed this session (master)

- `db2d4519` feat: projective K4 five-point graph (07a, F2a), accepted after engineering + UI and math review repairs.
- `1c3d7368` feat: quadrature graph (numerical 06 F2a), accepted after review repairs (ratio from displayed errors, even-n hint).
- `dd3f8baf` docs: status, briefs, evaluation record.
- `58aff938` test: `interp-least-squares` added to `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`; curves `6a3a73eb` had left master red. Curves' I4 registration removes it.
- The WIP branch `origin/wip/functions-pc-switch` is superseded; its content is in the commits above. It may be deleted.

## Uncommitted in the stream worktree (two slices, both implemented)

`git status` shows both slices mixed in `sl.ts`, `en.ts` and `PresetCatalog.test.tsx`. Split per commit as handler 21 did: stage per-hunk patches with `git apply --cached`, and stage a per-slice copy of `PresetCatalog.test.tsx`.

### Numerical 06 F2b: quadrature route `/bezeg-2.0/analysis/quadrature` (brief `briefs/numerical-06-f2b.md`)

- Files: `src/demonstrations.ts`, `graphFactories.ts`, `demonstrationPosterPending.ts`, `scripts/demonstration-preview-recipes.cjs`, `src/learning/model.ts` (lesson parameters `quadrature-a|b|n`, choices `quadrature-function|rule`), `QuadratureGraph.tsx` (`lessonFunctionActions`), count/route tests, and `PresetCatalog.test.tsx` (`quadrature` moved from `PENDING_ROUTE_KEYS` to `FILE_CONTRACT_KEYS`).
- Checks by handler 21 on the combined tree: tsc 0 errors; `just unit src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/graphs/functions src/graphs/base/presets src/localization src/graphs/projective` passed (482 s). The worker observed the pre-change failure of the route and count tests and ran `just build`.
- Remaining: an engineering review (Sonnet `bezeg-reviewer`, against the root-finding registration `c5e75f50`), a focused smoke of the new route in both languages on port 4315 (`bezeg-smoke` Sonnet, after `just build`), and the open worker question of whether `scripts/generate-guided-example-inventory.cjs` needs the new lesson parameter names. Then commit, update `docs/tasks/numerical-methods/06-batch-b.md` and the stream file, and push.

### Projective 07b: K5 two-panel graph (brief `briefs/projective-07b.md`)

- New: `src/graphs/projective/threeViews{Model,Edit,Text}.ts`, `ThreeViewsControls.tsx`, `ThreeViewsGraph.tsx`, `threeViewsModel.test.ts`, `ThreeViewsGraph.host.test.tsx`. Edited: the `projective-three-views` parser in `projectivePresetCollection.ts`, `PresetImport.ts`, the `PENDING_ROUTE_KEYS` entry, and 19 `projective_three_views_*` keys per locale after `projective_five_point_deviation`.
- Worker checks: tsc 0, eslint clean, 556 projective/preset/localization tests passed, 5 observed mutation failures. Worst residual over 800 random points is 8.9e-15. Acceptance 2 (1e-12) holds; the spec's "< 1e-15" example claim does not. Record that in the task file.
- Both reviews are done. Math: no model error. Repairs still to send to a fresh `bezeg-worker` (Sonnet medium):
  1. A visible, localized note when part of the conic or P' lies outside the ±7 image window: the |c| = 0.9 hyperbola branch (far vertex Y = 10), the ellipse for |c| = 1.1–1.4 (far extreme 1/(|c|−1)), and P' off-window. Model tests assert `closed` or the clipping flag for |k| = 9 and 11–14. Consider rescaling the image panel instead, if it stays readable.
  2. `parseThreeViewsModel` (`threeViewsModel.ts:~34`) rejects unknown keys with an actionable message; add a test. K4's `parseFivePointModel` has the same gap, so fix both.
  3. Residual test bound: 1e-13, not 1e-14; drop the redundant 1e-12 assertion.
  4. Angle slider `aria-valuetext` (`ThreeViewsControls.tsx:~38`) through `formatNumber`/`t()`.
  Then the handler confirms the repairs, commits, sets 07b accepted in `docs/tasks/projective-conics/07-batch-b.md`, and pushes.

## Next, in order

1. Finish the two slices above.
2. 07c: drag measurement of the five-point graph per `docs/performance-plan.md`, with the numbers in ADR 0033.
3. Projective Batch B F2b (routes for five-point and three-views; remove their `PENDING_ROUTE_KEYS`), F3 lessons K4 and K5, F4, F5, F6.
4. Numerical Batch B F3 (lesson N4), F4, F5, F6. Then `school-function-graphs/06` and `fourier-series/05`.

## Lessons for the next handler

- Two workers in one worktree worked when each brief named the other worker's files and required targeted Edit calls on shared catalogs. Both 07b and F2b ran this way without a collision.
- A reported odd number ("ratio 19.25") was a wrong hard-coded test value, not a source bug. Have the fresh worker trace such numbers before changing source.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k. Workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Logs in the job tmp folder. Port 4315.
