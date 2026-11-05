# Curves stream: handler handoff 53

Handler 53 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 52](handler-handoff-52.md).

## State

- **On `origin/master`:** everything through `28cf77a3`, the `curve-offset` graph, registration, smoke fix, measurement and evidence. Hosted CI run 42098779510 passed on it.
- **Not on `master`:** the L5 lesson, below, and this note. They are on local `worktree-stream-curves` and backed up on the remote branch `curves-l5-offset`. The remote `worktree-stream-curves` has diverged and is stale; leave it, and never force-push it. `curves-b3-offset` is superseded.
- **`just check` has not run on the L5 commits.** It last passed on `9e456fde`.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 25.7 of 63 GB free at the start of this session; the Gigafida script had ended. Check free memory before `just check` anyway.

## Done this session

| Commit | Work | Checks |
| --- | --- | --- |
| rebase | Handoff 52's commits onto `e2a29a8a`; conflicts in `familyChapters.test.ts` and `lessonCatalog.test.ts` kept master's `epicycles` change | `just check` on `9e456fde`: `EXIT=0`, 1173 s, 11600 passed, 4 skipped |
| `00718241` | Smoke fix: the caption's notes leave a narrow board; the inspector always states them | 1210 focused tests; tsc; ESLint; build; mutation; browser recheck |
| `9b657f8c` | `scripts/offset-gate-perf.cjs` | 16 cases passed their assertions |
| `28cf77a3` | [CG-B3-2a and 2b evidence](../../curve-geometry/cg-b3-2a-graphs.md), task rows, delegation log, `docs/commands.md` | Pushed, CI green |
| `cddce690` | L5 lesson, chapter section, registration (`lesson: false` removed), inventory entry, smoke row | tsc; ESLint; nine registration test files |
| `41117df4` | `curveGeometryGuidedLessons.offset.test.ts`, 13 real-graph tests | `src/learning/content`; 9 mutations each failed a test |
| `e6672d22` | Step 5's missing calculation frame | `just smoke-lesson curve-offset` 2 passed |

The engineering and UI review of the graph found no high or medium issue. The browser check found the caption failure, now fixed. The plot's rendering is settled by measurement: imperative inspector SVG stays.

I checked L5's formulas and quoted numbers by hand: the right normal, \(O_d'=(1+d\kappa)|r'|T\), \(r-RN\) as the centre, and the evolute values at \(x=\pm0.38321\). I read the formula blocks and the worked example, not every step's prose.

## L5 scenes

| # | Scene | \(d\) | Curve | Cusps, plot | Expected cusps |
| --- | --- | --- | --- | --- | --- |
| 1 | `offset-segment` | \(-\tfrac12\) | Segment fixture | Off, off | 0 |
| 2 | `offset-parabola-small` | \(-\tfrac14\) | Parabola | On, off | 0 |
| 3 | `offset-parabola-first-cusp` | \(-\tfrac12\) | Parabola | On, off | 1 |
| 4 | `offset-ph-exact` | \(-\tfrac12\) | PH | Off, off | 0 |
| 5 | `offset-parabola-cusps` | \(-1\) | Parabola | On, on | 2 |
| 6 | `offset-explore-start` | \(-\tfrac14\) | Parabola | On, on | 0 |

The circle arc of step 1 stays a prediction in prose, since a quadratic fixture cannot draw one.

## Next steps, in order

1. **Review L5.** One `bezeg-reviewer` Sonnet on `28cf77a3..e6672d22` for scene actions, readouts, registration and consumers; the text is one-shot and out of scope. Take screenshots of each step at 1440×900 and 390×844 on a production preview at port 4314: a passing test does not show whether the cusps, plot and caption stay legible under the lesson panel. The real `LessonSession` path has only the smoke's coverage.
2. **`just check`, then push to `master`** (rebase, recheck, fast-forward). Check free memory first and run it from Bash into a log. It takes about 20 minutes and passes the 600 s foreground limit: the harness then moves it to the background and it keeps running, so wait for the notification and read `EXIT=`.
3. **Records.** Write `docs/reviews/curve-geometry/cg-b3-3-lesson.md`. Set CG-B3-3 in `docs/tasks/curve-geometry/README.md`, splitting it from the `CG-B3-3…6` row, and confirm the comments in `familyChapters.test.ts` and `lessonCatalog.test.ts` were updated. Update family 1's line in `curves.md`. Add to `docs/agent-workflow/evaluation-log.md`: lesson worker 48 tool calls, 117k tokens, 13 minutes, accepted with one handler fix, the missing calculation frame; test worker 41 tool calls, 110k tokens, 21 minutes, first pass accepted, no defect found.
4. **Decide optional L6 `curve-envelope`,** then CG-B3-4 onward as in `docs/tasks/curve-geometry/README.md`: chapter sections, card and poster (the `curve-offset` recipe has not been run), Batch 3 gate.
5. Family 5 and the low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) steps 4 and 5, with its polish items.

## Open for the owner

- Unchanged from handoff 45: example card images are Slovenian-only; no performance budget for weak devices.

## Risks and notes

Handoff 51's "Risks and notes" and "Lessons for briefs" still apply, and handoff 52's are folded in below.

- `gh` is not installed, so `just ci` fails with `spawn gh ENOENT`. The repository is public: read `https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>` with curl.
- `curve-offset` is in `POSTER_PENDING`, and its recipe labels "Razdalja d" and "Osti vzporednice" have not been run. The inventory counts `{curve: 2, point: 3}` were confirmed on scene 1 only.
- `just unit` can take over 15 minutes when other sessions hold the machine; use narrow paths.
- `just smoke-lesson` refuses a stale build, with no failure in the lesson: run `just build` first.
- **No board point drags on a PH curve.** Handoff 52's "only the base point drags" was false, on this route and on `/ph/cubic`. Do not repeat it.
- Measurement ran while other sessions used the machine; read the CPU/4 drops as an upper bound.

## Lessons for briefs

- Name the frame contract in a lesson brief: a step with `workedExampleId` needs a `calculation` frame. Neither the worker's tests nor the catalog tests caught its absence; only the smoke's count did. A catalog test for it would be worthwhile.
- Verify a handoff's claim about behaviour before repeating it. The smoke worker's plain report of what did not move exposed a false note carried in the code comment.
- A screenshot found what jsdom could not: boards there have no size. Keep a narrow viewport in every first browser check.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-53.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
