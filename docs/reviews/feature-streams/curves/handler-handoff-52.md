# Curves stream: handler handoff 52

Handler 52 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired at 176k. It replaces [handoff 51](handler-handoff-51.md).

## State

- **Nothing of this session is on `origin/master`.** Local `worktree-stream-curves` is ahead of it by the commits below and this note; `origin/master` had not moved at the last fetch. The same commits are on the remote branch `curves-b3-offset` as a backup. The remote `worktree-stream-curves` has diverged and is stale; leave it, and never force-push it.
- **`just check` has not passed on these commits.** Claude Code's low-memory reaper stopped it with an empty log, together with both watchers. Nothing failed: it did not run.
- **No successor was started.** Its first step would be restarting that check, and the reaper's notice leaves a restart to the owner. The owner starts the next handler with the prompt at the end of this note.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** the owner's `Gigafida_preizkus_povedi.py` (PyCharm, pid 48956) held 27 to 29 GB of 64 GB all session and was growing. Free memory ranged from 1.1 to 5.8 GB. It is the owner's process: do not stop it. Check free memory before `just check`.

## Done this session

| Commit | Work | Checks |
| --- | --- | --- |
| `cfd5c58f` | Review fix: `cuspParameters` finds cusps in the end sample intervals and on the first sample | Offset and curvature Vitest 62 passed; 7 new tests fail with the fix disabled; tsc; ESLint |
| `4a63a46b` | CG-B3-2a graph: `CurveOffsetGraph.tsx`, `OffsetOverlay.ts`, `SpeedFactorPlot.tsx`, Preset collection, six lesson action targets, localization | tsc; ESLint; focused Vitest |
| `248eb4be` | CG-B3-2a tests | `src/graphs/curves/offset` 63 passed; 8 mutations each failed a test; tsc; ESLint |
| `b001fb2b` | CG-B3-2b registration: `/bezeg-2.0/curve-geometry/offset`, `lesson: false`, poster pending, recipe added | tsc; route, catalog and Preset tests; `GraphTransientState` and `lessonRestoration` 1144 passed |

The mathematical review of `e0b14d8f` is closed: one medium finding, fixed above, and two low ones. The one-dip-per-bracket limit is documented in `cuspParameters`. Noise-level duplicate roots at very large \(|d\kappa|\) could not be constructed, so that one stands as a note. The spec's parabola numbers and the `phOffsetRational` sign cross-check both held.

Hosted CI passed for `d8799baa`, which closes that item from handoff 51.

**Never run in a browser:** the caption's fit on the board, the plot's look, the exact and sampled PH curves together, the kind switch's view, and the recipe's labels. jsdom boards have no size, so view tests only spy on `setBoundingBox`.

## Decisions

- **Plot:** an inspector SVG written imperatively through `SpeedFactorPlotController`, so a drag renders no React. This is **provisional**: handoff 51 asked for a choice by measurement, and the drag is not measured yet.
- **One PH offset curve,** so `ph-bezier-curve.ts:131`'s `(i+1)*d` equals \(d\). Graph state `offsetD` is the source of truth over a Preset's stored `d`.
- **Terms:** vzporednica for the offset on this graph, including the exact PH one; ost for cusp; faktor hitrosti for \(1+d\kappa\). PH routes keep "odmik". Recorded in `docs/localization.md`.
- **Acceptance 4's** local-cusps note is in the inspector (`offset_local_note`), because one long line overflows unwrapped board text. L5's prose must say it too.

## Known limits

- The PH shape is fixed here: no hodograph board, only the base point drags.
- A PH Preset with no `boardState` opens on the parabola's view, so the PH curve is off screen. A test pins this under "known limit". Lesson scenes should set a `view` or use the `offset-curve` action.
- More than 8 cusps: markers are capped, the readout count stays true.
- A stored `offsetD` of 99 stays in state; the board and slider use the clamped value.
- `reset()` reloads the selected Preset, so it returns to the parabola only when none is selected.
- The plot breaks at out-of-range samples rather than clipping at the frame.

## Next steps, in order

1. **`just check` on HEAD.** Check free memory first. Run it from Bash into a log and read `EXIT=`.
2. **Browser check of `/bezeg-2.0/curve-geometry/offset`,** one `bezeg-smoke` Sonnet on a production preview at port 4314, 1440×900 and 390×844, both languages. Cover the list under "Never run in a browser", \(d=-1\) with cusps on, Reset, and keyboard on the sliders. This is the first routed slice, so UI and accessibility review is due with it.
3. **Measure the drag** with a new `scripts/offset-gate-perf.cjs` modelled on `scripts/comb-gate-perf.cjs`: control point drag and \(d\) slider at 128 and 512 samples, plot on and off, CPU/4. Settle the plot choice from it. `cuspParameters` now runs two end-interval golden sections per recomputation.
4. **Push to `master`** once 1 and 2 pass (rebase, recheck, fast-forward). Write `docs/reviews/curve-geometry/cg-b3-2a-graphs.md` from this note, set the CG-B3-2a and 2b rows in `docs/tasks/curve-geometry/README.md` and family 1's line in `curves.md`, and add this session's delegation records to `docs/agent-workflow/evaluation-log.md`: a Sonnet math review (9 tool calls, 1 medium finding), a graph worker (41 calls, accepted with handler fixes to caption length, naming, the hidden-offset caption, a stale plot and a missing class), and a test worker (36 calls, first pass accepted).
5. CG-B3-3 onward as in `docs/tasks/curve-geometry/README.md`: the L5 lesson, whose registration list is in handoff 49. Comments in `familyChapters.test.ts` and `lessonCatalog.test.ts` name CG-B3-3 as L5: confirm when the row is split. Decide optional L6 `curve-envelope` when L5 ships.
6. Family 5 and the low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) steps 4 and 5, with its polish items.

## Open for the owner

- **Memory:** `just check` needs the memory the Gigafida script holds. The owner decides when to run the next handler.
- Unchanged from handoff 45: example card images are Slovenian-only; no performance budget for weak devices.

## Risks and notes

Handoff 51's "Risks and notes" and "Lessons for briefs" still apply: `just` PATH fix, `EXIT=` in logs, Vitest cache after images, joint poster capture, CRLF edits, `python` only from Bash. Added here:

- **`curve-offset` is in `POSTER_PENDING`** with a recipe using the labels "Razdalja d" and "Osti vzporednice". The recipe has not been run.
- Claude Code's reaper stops idle background commands under memory pressure, and `just check` went with them. A foreground Bash run with a 600 s timeout may survive it where a background one did not; this is untested.
- A worker reporting "known limit" pinned by a test still needs a handler's decision: read the test name before accepting it.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-52.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
