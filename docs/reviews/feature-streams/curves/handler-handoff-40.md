# Curves stream: handler handoff 40

Handler 40 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 39](handler-handoff-39.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` at `ac565f6b` plus this note. Clean tree. No preview server, worker or watcher of this handler is running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Haiku for narrow checks, Sonnet for new UI or when Haiku's scripts are inconclusive).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `752a07ad` | BS-B-5 posters: joint selective capture of `bspline-extraction` and Geometry's `fortune` (Geometry handler 46 asked for it and was told the commit). The extraction window was reframed to `[-0.35, 2.55, 4.8, -0.6]`. `DemonstrationsPage.test.tsx` now exempts `POSTER_PENDING` instead of a stale hand list. | Posters viewed; mutation; hosted CI green (run 41650359004) |
| `dac9730c`, `f395ecde` | BS-B-6 Batch B gate **passed**; Batch B released. The audit found L3 acceptance 3 tested only for m = 2, so a kernel test for m = 1..4 was added. | [audit](../../b-splines-nurbs/bs-b-6-criterion-audit.md); `just check` at `992b2c20` (9900 tests); smoke-lesson 4/4; browser smoke (Haiku, then a Sonnet recheck); details in the README row BS-B-6 |
| `b64648f4` | Batch C planned: BS-C-2a1, 2a2, 3, 5, 6, and L6 open (optional) | [task plan](../../../tasks/b-splines-nurbs/README.md) |
| `2d2da56c`, `5417e1f9`, `ac565f6b` | BS-C-2a1 L5 graph core `BSplineNurbsGraph` (+ scene, model) with validated weights | Mathematical and engineering reviews, handler and worker repairs, mutations; README row BS-C-2a1 |

## Next steps, in order

1. Check hosted CI on `ac565f6b` or later.
2. BS-C-2a2: register `bspline-nurbs` (`/bezeg-2.0/bspline/nurbs`, `lesson: false`), factory, shared collection, `POSTER_PENDING` entry and preview recipe (window around the unit circle with the control square, e.g. `[-1.9, 1.45, 1.9, -1.45]` at 720:440), then a route smoke. Template: `d255e87c` (extraction registration). Recompute chapter/preview-copy counters if a rebase conflicts on them.
3. BS-C-3: L5 lesson and its `b-splines` chapter section and preview copy (lessons need an owning section). Acceptance (5) wording; step (5) names the four-arc circle from `rational-curves`. Remember the `lessonDefaultState` rule (already implemented in the graph).
4. BS-C-5 poster, BS-C-6 gate (as BS-B-6), then the L6 decision.
5. Low priority, carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34; `BSplineNurbsGraph.importPresetData` builds the scene twice (nit).

## Risks and notes

- `/learn/b-splines` section cards have no guided-example images for any B-spline section; the `/learn` family card uses the poster. Not a Batch B regression; an owner may want highlight images later.
- The 390×844 lesson card covering most of the board (shared lesson runtime) is still open for an owner look.
- Locally, `scripts/demonstration-preview-capture.test.cjs` fails one VP9 `bt709` test with the local FFmpeg; known environment gap.

## Lessons for briefs

- Haiku smoke scripts guessed selectors and reported script failures as product failures; a Sonnet recheck with "read controls by role first" resolved all of them. Name the lesson's "Naslednji okvir" button (not "Naslednji namig") and the "Vodeni primer" links in lesson smoke briefs.
- Give spec tolerances verbatim in briefs (the brief said 1e-3 where the spec says 1e-4).

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-40.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
