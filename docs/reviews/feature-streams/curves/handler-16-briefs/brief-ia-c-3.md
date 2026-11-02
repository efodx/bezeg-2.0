Brief handoff-v12 — IA-C-3: guided lesson I5 (Chaikin and four-point subdivision), curves stream

Role: implementation worker; edit permission in the worktree C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.claude\worktrees\stream-curves (branch worktree-stream-curves). Do not commit, push or delegate.

Goal: a guided lesson for Demonstration `interp-subdivision` (registered with `lesson: false`), spec docs/specs/interpolation-approximation-lessons.md "I5" (lines 105-119) plus common rules (line 39). Templates: the I1 lesson (commit 302c7383) and the I3 lesson just accepted (same file src/learning/content/interpolationGuidedLessons.ts; add I5 there). Graph: src/graphs/curves/subdivisionCurves/SubdivisionCurveGraph.tsx (nextStep/play/pause/resetRounds at :185-209; SUBDIVISION_ANIMATION_ID in subdivisionModel.ts:9).

Acceptance:
1. Six steps as the spec's Steps (1)-(6); each guided step asks for a prediction before its reveal; step 6 is free exploration with a closed polygon.
2. Add SUBDIVISION_ANIMATION_ID to LESSON_ANIMATION_IDS (src/learning/model.ts:79) and wire lesson actions to the graph's nextStep/play/pause/resetRounds, plus minimal actions for rule (Chaikin/four-point), closed toggle and limit overlay, validated with clear errors as I1 does.
3. Quoted numbers, each asserted by a unit test through the graph or the imported kernels so a wrong number fails: four-point inserts (2, 2.8125) on edge p1p2 of (0,0),(1,2),(3,3),(4,0); Chaikin replaces p1p2 by (1.5,2.25),(2.5,2.75); the midpoint identity (1.125,1.875) = uniformQuadraticSegment(P0,P1,P2,1/2) against the kernel; vertex count 2^k·n after k rounds (closed); the round cap MAX_SUBDIVISION_ROUNDS stated with its value.
4. Prose states: open Chaikin keeps its end points; open four-point is linear at the ends (the graph's end rule — read it, quote it accurately); Chaikin limit is the uniform quadratic B-spline (C^1). Four-point with w = 1/16: the handler verified the source — state that the limit is C^1 (Dyn, Gregory, Levin, CAGD 4 (1987) 257-268 prove C^1 for 0 < w < 1/8) and do not claim C^2. Do not write "to verify" in shipped text. Four-point keeps old vertices; it can overshoot (no numbers unless tested).
5. Playback: stopped by default; scene actions that change the polygon/rule pause it; Reset restores the lesson default polygon and round 0.
6. One-shot lesson text (docs/specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), SL and EN in lockstep; terms subdivizijska krivulja, Chaikinov postopek, štiritočkovni postopek (check docs/localization.md#choosing-new-terms and existing graph labels; keep them consistent). Math notation per AGENTS.md; lessonMathNotation.test.ts passes.
7. Scene unit test runs each step's actions in one synchronous sequence and checks graph state; Reset after a modified step returns to default; checkpoint restore keeps a modified state.
8. Registration flips `interp-subdivision` to a lesson; interim ownership as I1/I3 (comment why); count tests +1; smoke row in tests/guided-lessons.smoke.spec.cjs with one readout probe per numeric step (do not run smoke).

Scope: interpolationGuidedLessons.ts(+test), src/learning/model.ts, SubdivisionCurveGraph.tsx (lesson actions only, minimal), guidedLessons.ts / guidedLessonOwnership.ts / guidedExamplePreviewCopy.ts(+test) / lessonMathNotation.test.ts / lessonCatalog.test.ts / demonstrations.ts / the smoke spec. No locale keys unless unavoidable. Another worker may edit src/graphs/curves/bspline/** and sl.ts/en.ts concurrently: ignore typecheck errors only from those paths and do not touch them.

Checks (only through `just`): `just unit src/learning src/graphs/curves/subdivisionCurves` (log to file), `just typecheck`, lint on touched files. One observed failure per numeric-assertion family by deliberate mutation (cap 4); confirm the mutation applied and read the vitest summary in .command-logs, not only the wrapper line.

Return (≤300 words): files, checks, mutations, any spec contradiction or graph gap with file:line. Logs to C:\Users\NonFriedMotherBoard\.claude\jobs\96603abf\tmp\ia-c-3-*.log.

Budget: grep -l/-c first, ≤150 lines per read, never whole files >300 lines, logs to files. Past about 30 turns before acceptance, or on HANDOFF, stop at a consistent point, write C:\Users\NonFriedMotherBoard\.claude\jobs\96603abf\tmp\ia-c-3-handoff.md and return partial.
