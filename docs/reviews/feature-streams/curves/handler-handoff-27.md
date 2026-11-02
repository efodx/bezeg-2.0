# Curves stream: handler handoff 27

Handler 27 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-02 at about 185k context, after the soft threshold (175k, owner override) fired while PS-A-2b ran. It replaces [handoff 26](handler-handoff-26.md).

## State

- Branch `worktree-stream-curves` is pushed to `origin/master`; the head is the commit that adds this note. The working tree is clean.
- Nothing is in flight. The PS-A-2b worker reported that it left background work running (probably a `just preview` server); check for a stray preview or node process on this worktree and stop it if it is ours. Port 4315 belongs to another stream.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k.
  - Workers: `bezeg-worker` Sonnet `medium`.
  - Reviews: `bezeg-reviewer` Sonnet.
  - Smoke: `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new-UI checks.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `da1877d3` | IA-F4: Learn chapter `interpolation` after `b-splines`, owning I1–I5. **Breaking:** the interim ids `lesson.bezier-curves.geometric-properties.interp-*` are gone. | [ia-f4-chapter.md](../../interpolation-approximation/ia-f4-chapter.md). Handler fixed "formula above" to "below" (the formula renders after the paragraphs), plus the Chebyshev and QR wording. Checks: unit learning + demonstrations (406 s), tsc, lint, build, `smoke-built unified-learning -g interpolation` 1/1, `smoke-lesson` for all five lessons 10/10. |
| `90332447` | PS-A-2a: `prob-density` graph core (P1). | [ps-a-2a-graph.md](../../probability-statistics/ps-a-2a-graph.md). The worker stopped at its budget, and the handler finished the checks. Sonnet review found nothing blocking; the handler fixed the live region and the acceptance-5 wording. |
| `02d73ff6` | PS-A-2b: route `/bezeg-2.0/probability/density` in the new family `/bezeg-2.0/probability` (after `analysis`, chapter pending), `lesson: false`, `POSTER_PENDING`, recipe `[-4, 0.5, 4, -0.08]` (not rendered). | Row PS-A-2b in `docs/tasks/probability-statistics/README.md`. Rebase conflict in `lessonCatalog.test.ts` resolved mechanically; count tests and build rerun. |

Evaluation record: `docs/agent-workflow/evaluation-log.md` (curves handler 27).

## Next steps, in order

1. **PS-A-2b browser smoke** (`bezeg-smoke` Sonnet, new UI) on a production preview of master: `/bezeg-2.0/probability/density` in sl and en with a live switch; drag a and b (snap 0.01); typed a and b with the keyboard; μ and σ sliders; the example select N(100; 15), which must read 81,86 %; fit view; the a>b and a=b statuses; Reset; Preset save, restore and export/import; catalog card; 390×844 and 200 % text; no console errors. Record the results in the PS-A-2b row.
2. **Joint poster capture**, now unblocked: `inversion` has a recipe (`697739a9`). `POSTER_PENDING` should hold `interp-least-squares`, `quadrature` and `prob-density` (check, because Maps may have captured `inversion` already). See the curves.md Notes and handoff 26 for the env flags. Inspect every image by eye, `prob-density` especially, since its window is unrendered. Post in the Notes before starting, so Maps and Functions do not capture in parallel.
3. **PS-A-3a, P1 lesson** (six steps from spec P1). The lesson parameter names are a closed type, so extend them with μ and σ, and decide whether a fit-view action is needed (open question from PS-A-2a). Brief lesson: put checks and docs in the last quarter, or split them off, because the PS-A-2a worker ran out at 37 turns.
4. Then PS-A P2 (binomial to normal): graph core, registration, lesson. After that the `probability` chapter (F4).
5. Low priority: the shared `PointListInput` overflow at 200 % text (handoff 26); handoff 24 item 4.

## Lessons for briefs

- A chapter brief should say that `withExample` renders the formula after the paragraphs, so the prose says "below".
- After a rebase, rerun every count test the slice touched (again true this session: `lessonCatalog.test.ts`).

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-27.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
