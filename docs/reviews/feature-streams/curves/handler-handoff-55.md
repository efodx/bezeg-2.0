# Curves stream: handler handoff 55

Handler 55 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k and 215k thresholds fired. It replaces [handoff 54](handler-handoff-54.md).

## State

- **On `origin/master`:** everything through this note, including CG-B3-4a and the L6 lesson. `just check` passed on `2fb70103` (`EXIT=0`, 1347 s, 593 files passed, 3 skipped, 10891 tests passed, 8 skipped); only this note follows it. Hosted CI for this push was not read before handoff: read it first, by the `master` head SHA.
- The branch is local `worktree-stream-curves`; `curves-l6-envelope` is the backup branch and matches it. The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** about 12.8 GB free, with an owner `python` process at 9.4 GB; `just check` survived twice this session. Check free memory first anyway.
- Other sessions' `node` processes run on this machine (`capture-demonstration-previews.cjs` PID 32948, `c.cjs` PID 33224, Codex runtimes). They started hours before this session; leave them.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `70c21746`, `8c5b99aa` | CG-B3-4a fixes, Preset rejection tests, `scripts/envelope-gate-perf.cjs` | [CG-B3-4a](../../curve-geometry/cg-b3-4a-graph.md) |
| `ab24928b` | CG-B3-4a evidence; hosted CI run 42120455207 passed | Same |
| `5d771db8`, `c0a53ccf` | L6 lesson, 13 real-graph tests, view and English label fixes | [CG-B3-4b](../../curve-geometry/cg-b3-4b-lesson.md) |
| `2fb70103` | CG-B3-4b evidence, task rows, delegation log | Same |

`70c21746` alone fails five tests: a chained command committed despite the failure. `8c5b99aa` corrects it. Do not treat it as a good bisect point.

## Next steps, in order

1. **CG-B3-5:** cards and posters for `curve-offset` and `curve-envelope` in one capture, plus `curveGeometryPreviewCopy.ts` entries. The `curve-offset` recipe labels "Razdalja d" and "Osti vzporednice" have not been run. `curveEnvelopeExpectedFor` in `scripts/generate-guided-example-inventory.cjs` is a guess: it expects four segments, but the family is one curve element. The `curve-envelope` recipe window `[-1.4, 2.2, 2.4, -0.4]` is unrun too. `guidedExamplePreviews.test.ts` `pending` holds both cards; `POSTER_PENDING` holds both posters.
2. **CG-B3-6:** Batch 3 gate. Take in the layout findings of [CG-B3-3](../../curve-geometry/cg-b3-3-lesson.md#layout-findings-for-the-gate) and [CG-B3-4b](../../curve-geometry/cg-b3-4b-lesson.md#layout-findings-for-the-gate), and the caption overlaps in [CG-B3-4a](../../curve-geometry/cg-b3-4a-graph.md#review-and-smoke-findings). Whole-pixel pointers on the collinear drag were not run, nor was real touch.
3. Family 5 and the low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) steps 4 and 5, with its polish items.

## Open for the owner

- **Worked examples that never show.** Seventeen lessons of the closed Functions stream list a worked example on steps with no calculation frame. Details are in the [stream note](../../../tasks/feature-streams/curves.md#notes); `WORKED_EXAMPLE_NOT_SHOWN` in `lessonCatalog.test.ts` freezes the list. Someone must decide whether to reopen that stream.
- **Step 6 of L6** says the board and inspector state the collinear note; a narrow board omits it. One-shot text, left for the owner's rewrite.
- Unchanged from handoff 45: example card images are Slovenian-only; no performance budget for weak devices.

## Risks and notes

Handoff 54's "Risks and notes" and "Lessons for briefs" still apply, and handoff 51's through them.

- **A background `just check` notification reports the wrapper's exit code.** Read `EXIT=` in its output.
- **Gate commits on the check's exit code.** Never chain `just unit ...; git commit`.
- **The unit suite's jsdom boards have no size unless a test sets one,** so `unitX` is near zero. A value derived from pixels needs a guard for an unsized board.
- `gh` is not installed; read `https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>` with curl.

## Lessons for briefs

- Open at least one screenshot yourself. A smoke worker passed a curve drawn at an eighth of the board's width as a minor note.
- A placement rule needs both bounds: "keep it below the panel" produced a view far too wide, and the test that enforces the lower bound passed.
- A worker that mutates a file restores it with `git checkout`. Do not edit that file until it returns.
- Tolerances for a learner's drag are pixels, not 1e-9. Tests that move points exactly cannot see this; a real mouse drag at a second viewport did.
- Tell workers to keep scratch in `$CLAUDE_JOB_DIR/tmp`; a stale `fix.cjs` in the shared Temp folder ran by mistake.
- Check a smoke script's own assertions before believing a flag: `'\('` is `'('` in JavaScript.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-55.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
