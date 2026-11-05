# Curves stream: handler handoff 54

Handler 54 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 53](handler-handoff-53.md).

## State

- **On `origin/master`:** everything through `f023f658`: the L5 lesson, its fixes and records. Hosted CI run 42111263794 passed on it.
- **Not on `master`:** the `curve-envelope` graph and this note. They are on local `worktree-stream-curves` and backed up on the remote branch `curves-l6-envelope`. The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it. `curves-l5-offset` and `curves-b3-offset` are superseded.
- **`just check` has not run on the envelope commit.** It last passed on `d34765ab` (`EXIT=0`, 1336 s, 590 files, 10820 tests passed, 8 skipped), the tree pushed as `32bf6405`.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 12.9 GB free before `just check`, with an owner `python` process at 9.5 GB; the run survived. Check free memory first anyway.

## Done this session

| Commit | Work | Checks |
| --- | --- | --- |
| `c0575183` | L5: lower `OFFSET_VIEW`, step 5's prompt names the speed factor graph, session close test | `src/learning/content`; close test fails with the close removed; browser reshoot |
| `32bf6405` | Catalog test: a step's worked example needs a calculation frame | Fails with L5's frame removed |
| `f023f658` | [CG-B3-3 evidence](../../curve-geometry/cg-b3-3-lesson.md), L6 decision, task rows, delegation log | `just check`, `just smoke-lesson curve-offset`, hosted CI |
| next commit | CG-B3-4a `curve-envelope` kernel, graph, registration (`lesson: false`, poster pending) | Handler: tsc, lint, `src/graphs/curves/envelope` and registration tests. Worker: 36 tests, 4 mutations each failed tests |

**L6 ships:** decided in the [task file](../../../tasks/curve-geometry/README.md), with CG-B3-4a, 4b, 5 and 6 split there.

## `curve-envelope` as built

Files are in `src/graphs/curves/envelope/`. The last de Casteljau level gives the segment tangent at \(B(t)\) at any degree, so nothing assumes a quadratic. The family is one JSXGraph curve with NaN breaks, \(t_i=(i+1)/(N+1)\).

- State: `envelopeT`, `envelopeLineCount` (integer, 1 to 200), `envelopeLinesShown`, `envelopeCurveShown`, `envelopeTouchShown`.
- Lesson actions: `envelope-t`, `envelope-lines`, and `curve-visibility` with targets `envelope-lines`, `envelope-curve`, `envelope-touch`.
- Default curve \((1,0),(0,0),(0,1)\), view about `[-1.4, 2.2, 2.4, -0.4]`.

Worker's open items, none checked in a browser:

- The Bézier curve is hidden with `setAttribute({visible})`, reapplied after each scene import and replacement. Only jsdom ran this.
- The inspector's collinear note follows the settled readout, so it arrives after the 500 ms quiet period.
- No test covers the Preset check rejecting bad stored values. Add one.
- The inspector offers no degree elevation; the test calls `elevate()` directly.

I read the kernel and the registration diff, not the overlay or the graph class.

## Next steps, in order

1. **Review and browser-check CG-B3-4a.** One `bezeg-reviewer` Sonnet on the envelope commit, including the overlay and graph class. First browser check by `bezeg-smoke` Sonnet at 1440×900 and 390×844 on a production preview at port 4314: curve hidden and shown, 200 lines, sliders, collinear readout, caption fit, Reset, the middle point's drag. Have it take full-page shots and scroll the inspector; see Lessons for briefs.
2. **Attach the measurement note** that spec item 2 requires: drag at 200 lines. Adapt `scripts/offset-gate-perf.cjs`.
3. **Write `docs/reviews/curve-geometry/cg-b3-4a-graph.md`,** then `just check`, then push to `master` (rebase, recheck, fast-forward). Add to `docs/agent-workflow/evaluation-log.md`: graph worker 46 tool calls, 116k tokens, 16 minutes, reviewed outcome pending.
4. **CG-B3-4b:** L6 lesson and chapter section. Spec steps (1) to (5). Brief must name the frame contract, keep curves below the panel, and say where anything in the inspector is.
5. **CG-B3-5:** cards and posters for `curve-offset` and `curve-envelope` in one capture, plus `curveGeometryPreviewCopy.ts` entries. The `curve-offset` recipe labels "Razdalja d" and "Osti vzporednice" have not been run.
6. **CG-B3-6:** Batch 3 gate. [CG-B3-3's layout findings](../../curve-geometry/cg-b3-3-lesson.md#layout-findings-for-the-gate) go into it.
7. Family 5 and the low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) steps 4 and 5, with its polish items.

## Open for the owner

- **New: worked examples that never show.** Seventeen lessons of the now-closed Functions stream list a worked example on steps with no calculation frame, so learners never see it. Details and the repair are in the [stream note](../../../tasks/feature-streams/curves.md#notes). The stream's supervisor does not relaunch a complete stream, so someone must decide whether to reopen it. `WORKED_EXAMPLE_NOT_SHOWN` in `lessonCatalog.test.ts` freezes the list.
- Unchanged from handoff 45: example card images are Slovenian-only; no performance budget for weak devices.

## Risks and notes

Handoff 51's "Risks and notes" and "Lessons for briefs" still apply, and handoff 53's remaining items are folded in below.

- `gh` is not installed, so `just ci` fails with `spawn gh ENOENT`. The repository is public: read `https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>` with curl.
- `just unit` and `just check` print only a compact line on success, so a `grep "Tests "` filter shows nothing when they pass. Read that last line.
- `just check` passes the 600 s foreground limit; the harness moves it to the background and it keeps running. Wait for the notification and read `EXIT=`.
- `just smoke-lesson` refuses a stale build: run `just build` first.
- **No board point drags on a PH curve,** on `/curve-geometry/offset` or `/ph/cubic`.
- A Bash heredoc holding a long Python string failed with an unmatched quote; nothing ran. Put such edits in a script file.

## Lessons for briefs

- Name the frame contract in a lesson brief: a step with `workedExampleId` needs a `calculation` frame. `lessonCatalog.test.ts` now enforces this.
- A lesson view must keep its point below the panel, which covers the board's upper half. Check this on the observation frame.
- Ask for full-page shots. Viewport shots at 1440×900 cut the board and the inspector, so the worker reported the plot as absent. Before calling a layout problem new, compare it with a sibling lesson: the 390 px panel over the board is family-wide.
- Verify a handoff's claim before building on it. The frame contract was stated as general; a test showed 17 lessons break it.
- A worker's run cut by a tool timeout is not a pass. Rerun it.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-54.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
