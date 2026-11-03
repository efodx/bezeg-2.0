# Curves stream: handler handoff 33

Handler 33 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 32](handler-handoff-32.md).

## State

- Branch `worktree-stream-curves`, pushed to `origin/master`; the head is the commit that adds this note. Working tree clean.
- Nothing in flight: no workers, no preview (the 4314 preview was stopped).
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new UI.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `3556f036` | PS-B-4a1 P4 model `src/analysis/summaryStatisticsModel.ts` (Sonnet worker) and the P4 slice plan | PS-B-4a1 row in `docs/tasks/probability-statistics/README.md` |
| `82c23778` | PS-B-4a2 `SummaryStatisticsGraph`, `ValueListInput`, Presets `prob-summary` (Sonnet worker, Sonnet review, handler legend fix) | PS-B-4a2 row |
| `2bc90e9c` | PS-B-4b registration at `/bezeg-2.0/probability/summary`, `lesson: false` (handler-made) | PS-B-4b row |
| `0c773135` | Larger, captioned mean and median markers after the smoke; PS-B-4b smoke evidence (11/11) | PS-B-4b row |
| this commit | Stream row, evaluation record (curves handler 33), this note | `docs/agent-workflow/evaluation-log.md` |

Checks on the final tree: tsc, `just unit` over the graph host and localization, lint of the graph, build, and the handler's screenshot of the rebuilt preview (no console errors). On `2bc90e9c` after the rebase: tsc and 1942 tests over demonstrations, DemonstrationsPage, Routes, presets, learning, localization and preview assets (`--no-fsModuleCache`). Not run: `just check`, the full unit suite. The Node recipe test fails only on other streams' missing `monotone-*`/`voronoi*` recipes and the local VP9 metadata case.

## Next steps, in order

1. **PS-B-4c P4 lesson hooks** on `SummaryStatisticsGraph` (no `lessonFunctionActions` yet). Planned shape, following the least-squares `lsq` precedent in `src/learning/model.ts` (~line 376): a typed `summary` action kind with operations `set-value` (index, value), `set-values` (list), `add-value`, `remove-value`, all through the model's validated edits (refusals throw `DomainError`); `function-choice` names for the example (`school`, `outlier`, `even`), quartile rule and σ kind; `function-visibility` for the box plot and the σ band. Decide the refit rule per action (the lesson's step 2 moves 8 to 30, beyond the default view `[1, 11]`, so a value action must refit or the step must set a view). Host tests run the lesson sequence synchronously with exact readout strings; observe mutations failing. Template: commit `3a441122` (CLT hooks).
2. **PS-B-4d1 six-step P4 lesson** (spec P4 steps; one-shot text), then **PS-B-4d2 chapter section** in `probabilityChapter.ts`: separate workers. Drop `lesson: false` and the `lessonCatalog.test.ts` opt-out at 4d1, the `familyChapters.test.ts` `CHAPTER_LINK_PENDING` entry at 4d2. Acceptance 4 (prose names the quartile rule and σ, says calculators differ, and that "outlier" is a 1,5 IQR convention) belongs to the lesson.
3. Joint poster capture: `POSTER_PENDING` holds `prob-binomial-normal`, `prob-clt`, `prob-summary` (curves, recipes exist) and `monotone-partition`, `monotone-triangulation`, `voronoi`, `voronoi-degenerate` (no recipes yet), `polynomial-zeros`, `rational-function` (recipes exist). The capture needs every shipped id's recipe; check again, and follow the `curves.md` "To Geometry" note.
4. Batch A/B gates (F6) after the posters.
5. Low priority: P4 lower fence outside the fitted view in the outlier example (consider fitting fences when the box shows); pointer drag stops at the board edge; `importPresetData` clears the notice without its own render request (review nit); CLT legend keeps density wording in the CDF view; refused typed values stay in their field (shared); playback buttons give no reason when aria-disabled; CltGraph lifecycle tests; P2 visual notes from handoff 30 item 4.

## Lessons for briefs

- A graph slice with a new input component and about 60 keys used a full Sonnet budget (134k). Keep hooks out of graph slices.
- Smoke workers pass readability items too easily: ask for a pixel-size judgement per marker and view their screenshots before accepting.
- Other streams keep changing the same lists (lesson opt-outs, `CHAPTER_LINK_PENDING`, `POSTER_PENDING`, catalog counts); expect a mechanical conflict on every push and recheck the touched suites.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-33.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
