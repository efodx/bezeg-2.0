# Curves stream: handler handoff 42

Handler 42 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 41](handler-handoff-41.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` at `f09be357` plus this note. Clean tree. No preview server, worker or watcher of this handler is running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- The Sonnet weekly limit was hit on 2026-11-03 and reset on 2026-11-05. A worker that stops on the limit keeps its tree edits; resume it with `SendMessage` once the limit resets.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `1e19b30b` | BS-C-L6b: `BSplineBlossomGraph` + scene + model | 18 tests, worker mutations of every group; Sonnet engineering review (no findings); Sonnet math review: one finding (the outside-the-segment text claimed inequality on the default parabola) fixed by the handler with a `coincides` relation and a test that fails against the old code; full `just unit`, build |
| `619cd657` | BS-C-L6c: `bspline-blossom` at `/bezeg-2.0/bspline/blossom` | Registering exposed two contract failures, fixed: `bsplinePresetCollection.checkGraphState` accepts `args`, and the blossom figure state keeps the stored segment/args/Bézier switch. Focused unit run (158 files), lint, build, Sonnet route smoke 10/11 (family pages are not routes) |
| `34c6b877`, `f09be357` | BS-C-L6d: L6 lesson, sixth section, preview copy; recount after rebase (coverage 121, preview copy 107/114) | [evidence](../../b-splines-nurbs/bs-c-l6d-l6-lesson.md): mutations of every action, `smoke-lesson`, Sonnet review (no findings), Sonnet walk sl 1440×900 / en 390×844 |

## Next steps, in order

1. Check hosted CI on `f09be357` or later (`just ci`).
2. BS-C-L6e: the `bspline-blossom` poster. It is in `POSTER_PENDING`, with the recipe window `[-0.45, 2.6, 4.45, -0.4]` (the `bspline-deboor` window, aspect ≈ 720:440). Earlier posters were captured by the geometry handler (`94076b31`); find the capture command in `docs/commands.md` or ask that stream's latest handoff.
3. BS-C-L6f: the L6 gate, the same as BS-C-6 ([audit template](../../b-splines-nurbs/bs-c-6-criterion-audit.md)): spec L6 acceptance (1)–(4) mapped to tests, plus `just check`.
4. After L6f the B-splines chapter is complete. Update `docs/tasks/feature-streams/curves.md` row 2 and decide the stream's next family from that file.
5. Low priority, carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, and `BSplineNurbsGraph.importPresetData` building the scene twice (nit).

## Risks and notes

- **Pre-existing failure on master, from another stream:** `src/learning/chapter/guidedExamplePreviews.test.ts`, "publishes the school-function-graphs example cards" (geometric-series/sl preview undefined). The handler reproduced it with the L6c commit reverted, so it is not curves work. The functions stream owns it; recheck before treating it as new.
- Rebases keep conflicting in `familyChapters.test.ts` `CHAPTER_LINK_PENDING`, `lessonCatalog.test.ts` (the opt-out list), `lessonMathNotation.test.ts` and the smoke `LESSONS` row, and they change the count tests. These are mechanical: keep both sides, then rerun `just unit src/learning src/demonstrations src/Routes src/graphs/base` (~13 min).
- A blossom Preset with a stored `segment` index invalid for its data draws no blossom (snapshot undefined). `checkGraphState` checks only the shape, not data consistency. This is only reachable through a hand-edited file.
- Carried over: the NURBS board draws no control-polygon lines; family pages are not routes; the 390×844 lesson card covers the board (shared lesson runtime, owner look); the local FFmpeg VP9 test gap.

## Lessons for briefs

- A lesson-slice worker (L6d) hit its 135k budget at 56 turns, before writing its evidence note. Have the worker skip the full suite and the evidence note, and let the handler run the suite and write the note.
- Python edits must handle CRLF files: detect `\r\n` before matching.
- `just unit` across learning, demonstrations, Routes and graphs/base takes about 13 minutes; run it in the background.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-42.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
