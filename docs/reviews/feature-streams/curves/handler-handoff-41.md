# Curves stream: handler handoff 41

Handler 41 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 40](handler-handoff-40.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` at `4e06a52d` plus this note. Clean tree. No preview server, worker or watcher of this handler is running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `e0911cac` | BS-C-2a2: `bspline-nurbs` registered at `/bezeg-2.0/bspline/nurbs` | Focused unit run, build, Sonnet route smoke 9/9; README row |
| `8d26fb1b` | BS-C-3: L5 lesson (`nurbs-circle` actions), fifth `b-splines` section, preview copy | Full unit suite, Sonnet numeric/engineering review (no findings), `smoke-lesson`, Sonnet lesson walk sl/en; [evidence](../../b-splines-nurbs/bs-c-3-l5-lesson.md) |
| (`94076b31`, geometry 48) | BS-C-5: the `bspline-nurbs` poster (the recipe window was widened to `[-2.37, 1.45, 2.37, -1.45]`) | Viewed by the handler |
| `162544e8` | BS-C-6: Batch C gate **passed**; added a test that the readout is a 1001-sample maximum | [audit](../../b-splines-nurbs/bs-c-6-criterion-audit.md); `just check` at `8d26fb1b` (10100 tests) |
| `0802c8c2` | L6 decided: ship. Planned as BS-C-L6a–f | README rows |
| `4e06a52d` | BS-C-L6a: blossom kernel `blossom.ts` | 11 tests, 4 mutations, Python recomputation; handler read it |

## Next steps, in order

1. Check hosted CI on `4e06a52d` or later (`just ci`).
2. BS-C-L6b: the graph core `BSplineBlossomGraph` (+ scene, model) on the L2 example, per its README row. Templates: `BSplineNurbsGraph` (BS-C-2a1, commits `2d2da56c`..`ac565f6b`), `DeBoorGraph` for the triangle drawing. Use the kernel's `blossom(u, k, P, segment, args)` and its `triangle.levels`. Have a mathematical review and an engineering review, as for BS-C-2a1.
3. BS-C-L6c registration: template `e0911cac`, with counts 106 → 107 at the time of writing (recount after a rebase). BS-C-L6d lesson: template `8d26fb1b`. When registering, check the poster window aspect against 720:440 (handler 48's note: the capture does not force equal units).
4. BS-C-L6e poster, BS-C-L6f gate (as BS-C-6).
5. Low priority, carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, and `BSplineNurbsGraph.importPresetData` building the scene twice (nit).

## Risks and notes

- The NURBS board draws no control-polygon lines. It builds its curve the same way `BSplineInsertionScene` does, so this is a shared display default, not an L5 defect. An owner may want to look.
- `/bezeg-2.0/bspline` (the family page) does not list Demonstration cards, the same for all B-spline routes.
- The 390×844 lesson card covering the board (shared lesson runtime) is still open for an owner look.
- Locally, `scripts/demonstration-preview-capture.test.cjs` fails one VP9 `bt709` test with the local FFmpeg; this is a known environment gap.
- The `just check` count (10100) differs from a plain `just unit` (10784, 3 skipped); both passed. This is not investigated.

## Lessons for briefs

- In lesson walk briefs, name "Naslednji okvir" and the "Vodeni primer" links; the Sonnet walker then needed no selector guessing. The language control is a `<select>`.
- `just preview` takes a positional port (`just preview 4791`), not `--port`.
- Do not mutate source while `just check` runs; run mutations after it.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-41.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
