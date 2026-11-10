# Stream: Families prep
Run state: active

Preparation of the fifteen families ranked in the [top-15 research note](../../research/lesson-family-candidates-2026-11-09.md), specs first. The owner scheduled the preparation on 2026-11-10, including the parked E5, E9 and E10. Rules and slice template: [feature streams](README.md). Port 4321. Handoffs and state note: `docs/reviews/feature-streams/families-prep/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

**Handler budget:** 1.5× (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`), the same as Controls: BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. The owner set it on 2026-11-10. Successors launched from this worktree inherit it. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on.

**Setup:** the first handler runs `npm ci` in the worktree (no `node_modules` junction, per [new-pc-setup](new-pc-setup.md)).

## Boundary with the Controls stream (owner decision 2026-11-10)

This stream prepares families without touching what [Controls](controls.md) is changing. Allowed:

- specs, F0 plans, ADRs and terms;
- F1 kernels: new pure TypeScript files with independent oracle tests, including the engine kernels;
- F2a graphs for **#1, #2, #5 and #6 only**, after their spec is accepted. Each is a new graph class using the shared controls in `src/inputs/` as they are, with no route. Expect a follow-up when Controls R1 settles readouts.

Not allowed until the named Controls step is `accepted` in [controls.md](controls.md):

- F2a for families with playback, steppers or step counters (#3, #4, #7, #9, #13, #14, #15) and for #11 and #12 (they extend `LinearMapGraph` and the complex graphs, whose panels step 5 sweeps): **step 5**;
- F2a for #8 and #10 (shared 3D view, performance measurement): **step 5**, then measure per the [performance plan](../../performance-plan.md);
- F2b registration, F3 lessons, F4 chapters and F5 media for every family: **step 7** (persisted scenes; steps 8–9 change scenes and registration), so lessons are not migrated twice.

Never edit `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, `GuidedLesson.tsx`, the lesson runtime, registration files (README "Shared files"), existing graph panels, `eslint.config.mjs` `controlExemptions`, `package.json` or the lockfile. Locale keys follow the README's shared-file rule.

When only gated work remains, set `Run state: stopped: preparation done; F2a (playback, 3D) waits on Controls step 5 and F2b–F5 on Controls step 7`, push, and end. The owner restarts the stream.

## Specs

Write one spec per family in `docs/specs/<family>-lessons.md`, following the existing family specs (for example [linear-maps-lessons.md](../../specs/linear-maps-lessons.md)): Problem Statement, Solution with release batches, reuse and new modules, Decisions needing an ADR, concept contracts with acceptance criteria per lesson, Terms, Implementation, Testing, Correctness Notes, Out of Scope. Add each spec to [new-lesson-families.md](../../specs/new-lesson-families.md) as it lands.

- Start from the research note's entry for the family. For E5, E9 and E10, start from the [expansion research](../../research/lesson-family-candidates-2026-10-31-expansion.md).
- Verify the matura catalogue anchors (PIK M-MAT-2026) that the research note left unchecked (#1, #2, #3, #8) before citing them. If the PDF cannot be read, say so in the spec instead of guessing.
- Record the owner decisions from the research note's "Ranking rules": seeded sampling with a visible seed and exact theory alongside (#4), extending the 3D surface view for solids (#8), and analytic geometry of lines without a standalone vectors lesson (#2).
- Handlers decide spec questions and record the reason. The owner reviews later, and lesson text stays one-shot.
- A spec counts as accepted after the handler's review against this section and a mathematical review of its concept contracts.

## Families

Order is the research note's rank. Specs can be written in any order or in parallel. F1 follows each accepted spec.

| # | Family | Spec | Ungated now | Status |
| --- | --- | --- | --- | --- |
| 1 | Trigonometry of the unit circle and triangle | [trigonometry-lessons.md](../../specs/trigonometry-lessons.md) | spec, F0, F1 (triangle solver incl. SSA), F2a | spec accepted; F0 done ([tasks](../trigonometry/README.md), ADR 0044) |
| 2 | Analytic geometry of lines | [analytic-lines-lessons.md](../../specs/analytic-lines-lessons.md) | spec, F0, F1 (exact line forms, projection, distance), F2a | spec accepted; F0 done ([tasks](../analytic-lines/README.md), ADR 0046) |
| 3 | Combinatorics and Pascal's triangle | [combinatorics-lessons.md](../../specs/combinatorics-lessons.md) | spec, F0, F1 (BigInt binomials, path enumeration) | spec accepted |
| 4 | Randomness and simulation | [randomness-simulation-lessons.md](../../specs/randomness-simulation-lessons.md) | spec, F0, F1 (seeded integer PRNG, samplers, exact comparators) | spec accepted |
| 5 | Isometries, similarity and symmetry | [isometries-lessons.md](../../specs/isometries-lessons.md) | spec, F0, F1 (isometry classification, frieze tiling), F2a | spec accepted |
| 6 | Circle geometry and constructions | [circle-geometry-lessons.md](../../specs/circle-geometry-lessons.md) | spec, F0, F1 (power of a point, radical axis, Apollonius, common tangents; reuse `src/compgeo/circle.ts`), F2a | spec accepted; F0 done ([tasks](../circle-geometry/README.md), ADR 0045) |
| 7 | Kinematics on curves | [kinematics-lessons.md](../../specs/kinematics-lessons.md) | spec, F0, F1 (velocity and acceleration from the curve kernel) | spec accepted |
| 8 | Solids and volumes | [solids-volumes-lessons.md](../../specs/solids-volumes-lessons.md) | spec, F0, F1 (solid meshes, plane section clipping, revolve) | spec accepted |
| 9 | Recursion and growth models | [recursion-growth-lessons.md](../../specs/recursion-growth-lessons.md) | spec, F0, F1 (cobweb iterator reusing fixed-point playback logic) | spec accepted |
| 10 | Level sets, gradient and optimization (E9) | [level-sets-optimization-lessons.md](../../specs/level-sets-optimization-lessons.md) | spec, F0, F1 (marching squares, gradient, LP vertex enumeration) | spec accepted |
| 11 | Eigen-directions and iterated maps | [linear-maps-lessons.md](../../specs/linear-maps-lessons.md) Batches B–C (L3–L5) already specified; add the power-method and trace–determinant lessons as a batch there | spec amendment, F0 task files, F1 (any kernel gap) | spec amendment accepted (Batch D: L6 power method, L7 trace–determinant) |
| 12 | Complex maps continued | [complex-maps-lessons.md](../../specs/complex-maps-lessons.md) Batches B–C (M3–M5) already specified; add de Moivre and Euler's formula as a batch there | spec amendment, F0 task files, F1 (Möbius and sampled-image kernels if missing) | spec amendment accepted (Batch D: M6 de Moivre, M7 Euler); Möbius and sampled-image kernels already exist |
| 13 | Phase portraits and dynamics (E5) | [phase-portraits-lessons.md](../../specs/phase-portraits-lessons.md) | spec, F0, F1 (RK4, trace–determinant classification, bifurcation sampling) | spec accepted |
| 14 | Waves, beats and sampling | [waves-sampling-lessons.md](../../specs/waves-sampling-lessons.md) | spec, F0, F1 (superposition, sampler, alias frequency) | spec accepted |
| 15 | Mechanical curves (E10) | [mechanical-curves-lessons.md](../../specs/mechanical-curves-lessons.md) | spec, F0, F1 (descent-time integrator with the endpoint substitution) | spec accepted |

## Notes
