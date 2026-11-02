# Curves stream: handler handoff 28

Handler 28 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 27](handler-handoff-27.md).

## State

- Branch `worktree-stream-curves` is pushed to `origin/master`; the head is the commit that adds this note. The working tree is clean.
- Nothing is in flight: no workers, no preview (port 4314 is free; this handler stopped its own preview processes).
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k.
  - Workers: `bezeg-worker` Sonnet `medium`.
  - Reviews: `bezeg-reviewer` Sonnet.
  - Smoke: `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new-UI checks.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `4cb5ed9e`, `8c9821ef` | Capture claim; PS-A-2b browser smoke passed (13/13, Sonnet) | PS-A-2b row in `docs/tasks/probability-statistics/README.md`. Notes, not blocking: 390 px a/b axis labels partly clipped; 200 % text overflow in the shared function inspector. |
| `ffe0bc38` | Joint poster capture: `prob-density`, `interp-least-squares`, `inversion`, `quadrature`, `projective-five-point`, `projective-three-views`; `POSTER_PENDING` emptied; absolute-path test tightened | curves.md Notes ("Done (curves handler 28)") with visual notes to Functions. |
| `640ff006` | PS-A-3a: `density-*` lesson actions on `DensityAreaGraph`; no fit-view action; step 4 uses σ=0.85 (0.7 leaves the view) | PS-A-3a row. |
| `bfba61b1` | PS-A-3b: P1 guided lesson, interim owner `functions-and-calculus`/`integrals`, smoke row | PS-A-3b row; `smoke-lesson prob-density` passed. |

Evaluation record: `docs/agent-workflow/evaluation-log.md` (curves handler 28).

## Next steps, in order

1. **PS-A-4a1, P2 model** (row in the probability README; spec P2). Decision taken: \(p\) at 0 or 1 is refused with a message. The kernel (`src/analysis/distributions.ts`) already has `binomialPmf/Masses/Cdf`, `poissonPmf/Cdf`, `binomialNormalCdf(n,p,k,correction)`, `BINOMIAL_N_MAX`. Pattern: `densityAreaModel.ts` and its test. Keep the slice to model and oracle tests (the P1 graph-core worker ran out at 37 turns when model and graph were one slice).
2. PS-A-4a2 graph, PS-A-4b registration + smoke, PS-A-5a/5b lesson hooks and lesson. Each new Demonstration joins `POSTER_PENDING`; at capture, empty the list and the `DemonstrationsPage.test.tsx` poster exemptions and rebuild *before* running the capture.
3. Then the `probability` chapter (F4), moving P1 (and P2) from the interim owner.
4. Low priority: shared function-inspector overflow at 200 % text (μ number field past the inspector edge, header overlaps "Strni"; seen on `/probability/density`), the shared `PointListInput` overflow (handoff 26), handoff 24 item 4.

## Lessons for briefs

- After a rebase, rerun every count test the slice touched; `lessonCatalog.test.ts` conflicted for the third session running (other streams change the opt-out list).
- Smoke workers must open every screenshot they report a verdict from.
- State geometric premises in briefs as assertions to test (the σ=0.7 premise was wrong and the test caught it).

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-28.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
