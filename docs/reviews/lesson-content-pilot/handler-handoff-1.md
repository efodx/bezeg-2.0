# Lesson content pilot: handler handoff 1 (model comparison)

Reviewers must not read this file: it holds the blind key.

## State

The pilot is complete and pushed (`docs/reviews/lesson-content-pilot.md`; spec `docs/specs/lesson-content-pilot.md`). The owner then asked for a **writer-model comparison**:

> Try rewrites with different models so we can see how that affects the scores. You can use Opus up to high, sonnet up to high, haiku up to max, and Fable on low.
>
> I want you to keep the best rewrites from them so I can judge at the end and see if it's worth using better models.

The owner also asked whether blind reviewers give similar scores for the same text. The answer so far: the three personas agreed within 1–3 of 27 points on each text, but same-persona repeat reliability was never measured. **Owed: a repeat-scoring check** (below).

## Design (decided)

- **Writers:** every writer uses `model-comparison/writer-brief.md`, a single-shot rewrite from the r0 script, round-1 reviews and style brief v2. Writers must not read the r1/r2 scripts, change logs or later rounds.
- **Blind configs:**

  | Config | Writer |
  | --- | --- |
  | w-a | Opus high |
  | w-b | Sonnet high |
  | w-c | Haiku max |
  | w-d | Fable low |
  | w-e | Sonnet medium (baseline) |

  Agent tool: `subagent_type: bezeg-worker`, plus `model` and `effort`.
- **Budget:** writers hit the worker budget (135k; Haiku 78k), so dispatch **one lesson per writer**. Opus continues from its own `drafts/w-a/handoff.md` plan. Haiku workers get **no source access** (labels from the r0 *Na grafu* lines plus known facts) and still barely fit. Record both as confounds.
- **Known screen facts to hand writers:**
  - Control points are labelled lowercase \(p_0\)…\(p_3\) (`PointStyles.ts:127`); scheme points \(p_i^r\).
  - The cut button is labelled "Subdiviziraj".
  - The curvature readout sits top-left on the graph.
  - κ is signed and N is the left normal.
- **Reviewers:**
  - Sonnet medium `bezeg-worker` with `reviewer-brief.md`, blind, reading only the named draft files.
  - Rotation: each reviewer agent gets 4 drafts, one per lesson, each from a different config, so no reviewer sees two versions of one lesson. Each draft is scored by all three personas.
  - That is 15 reviewer agents for 5 configs. Write reviews to `model-comparison/reviews/<config>.<lesson>.<persona>.md`.
  - Tell reviewers that the generic finish screen is app chrome, and to score Ending on the last step.
- **Repeat-scoring check:** 3 fresh reviewers (one per persona) re-score the four `scripts/*.r0.md` with the round-1 instructions. Compare against the `round-1/` scores to get the noise level per persona and text.
- **Output:**
  - `model-comparison/results.md`: scores per config and lesson, cost per config, the noise level, and a verdict on whether better models are worth it.
  - Copy the top-scoring draft per lesson to `model-comparison/best/<lesson-id>.md` (the owner's request), noting its model. Keep all drafts.
  - Mention the new defect in the shipped curvature lesson: "N points into the bend" is false for κ<0.
- **Concurrency:** at most 3 workers at once.

## Draft status

- **Done:** `w-a/bezier-pilot.md`, `w-b/{bezier-pilot,subdivision-guided,curve-curvature-guided}.md`, `w-c/bezier-pilot.md`.
- **Running at handoff:** w-b polynomial-zeros and w-c subdivision. Check that `drafts/w-b/polynomial-zeros-guided.md` and `drafts/w-c/subdivision-guided.md` exist. If either is missing, re-dispatch it.
- **To do:**
  - w-a: subdivision, curvature (from the handoff plan) and zeros.
  - w-c: curvature and zeros (no source).
  - w-d Fable low: all 4, one per writer.
  - w-e Sonnet medium: all 4, one per writer.
  - Then the reviews and the repeat-scoring check.

## Cost log (subagent tokens and wall time)

| Config | Attempt | Tokens | Time | Outcome |
| --- | --- | --- | --- | --- |
| w-c Haiku max | all 4 | 102k | 345s | failed at budget, 0 lessons |
| w-c Haiku max | bezier, with source | 115k | 405s | failed at budget, 0 lessons |
| w-c Haiku max | bezier, no source | 156k | 735s | 1 lesson |
| w-b Sonnet high | all 4 | 144k | 985s | 3 lessons |
| w-a Opus high | all 4 | 144k | 1272s | failed at budget, plan only |
| w-a Opus high | bezier, from plan | 49k | 276s | 1 lesson |

Add the rest from the task notifications (`subagent_tokens`, `duration_ms`).

## Git

- Worktree: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\lesson-content-pilot`, branch `worktree-lesson-content-pilot`.
- Pushed through `4d5155ca`.
- Commit the model-comparison files and push to `origin/master` (fetch, rebase, `git push origin HEAD:master`).
