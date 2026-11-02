# Curves stream: handler handoff 17

Handler 17 wrote this on 2026-11-02. It supersedes [handoff 16](handler-handoff-16.md). It stopped at the 150k soft threshold after integrating both dispatched slices. No workers, previews or temporary worktrees are running. Branch `worktree-stream-curves`, rebased on `origin/master` (`b213a37d`) and pushed to `master`; tree clean apart from this note's commit. Settings unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted and pushed this session

| Commit | Slice | Checks |
| --- | --- | --- |
| `8691a0f0` | BS-A-2a3: `DeBoorGraph`, `DeBoorScene`, `bsplineDeBoorModel.ts`, 11 `bsd_*` keys after `bsb_*`. Exported `DEBOOR_ANIMATION_ID`; not registered; Presets split to **2a3b**. [Evidence](../../b-splines-nurbs/bs-a-2a3-graph.md). | First worker partial at 135k; a fresh finisher worker closed typecheck, lint, build, 6 mutations (all caught), jsdom measurement (drag 3.21 ms/event, t sweep 7.31 ms/step). |
| `79710127` | IA-C-3: I5 lesson (six steps) in `interpolationGuidedLessons.ts`, test file `interpolationSubdivisionLesson.test.ts`, `subdivision` action kind (`set-rule`, `set-closed`, `set-overlay`), `interp-subdivision-rounds` in `LESSON_ANIMATION_IDS`, registration (interim owner `bezier-curves/geometric-properties`), smoke row with per-step status probes. Spec I5 acceptance 4 records the four-point sources. | Worker complete at 134k; 4 mutations caught. |

Handler checks before the rebase: typecheck; `just unit src/learning src/graphs/curves/subdivisionCurves src/graphs/curves/bspline src/bezeg/impl/curve src/localization` 97 files / 1725 tests; lint on touched paths; build; `SMOKE_PORT=4314 just smoke-lesson interp-subdivision interp-hermite` passed. Rebase onto master's sweep 12 (lesson C2, `segment-intersections`) conflicted mechanically in ownership, preview copy, notation list, catalog pending list and smoke `LESSONS`; both sides kept, counts raised to 65/72. After the rebase: conflicted-file units (ownership, preview copy, notation, catalog, chapter, I5 test), typecheck and build passed at `79710127`, and `node --check` of the merged smoke spec passed. The post-rebase `smoke-lesson interp-subdivision segment-intersections` and broad unit rerun were **stopped by Claude Code for low system memory** before reporting; not rerun. The push's GitHub Pages workflow runs browser smoke; check that run first, and rerun `SMOKE_PORT=4314 just smoke-lesson interp-subdivision segment-intersections` locally if it is not green.

**Review dispositions.**
- 2a3 math: no error. Low fixed — the t=1 oracle now pins level 1 (2,2),(3,2). Lows deferred — readout prints the half-open span even at the domain end; alpha knot pairs not shown.
- 2a3 engineering: no medium. Low fixed — refused point-count change caught instead of throwing; the `hasPoint` override on the rings is commented and guarded by the drag-through test (a JSXGraph upgrade could change the hit path).
- I5 math: **the cited range was disputed** (handoff 16 recorded \(0<w<\tfrac18\); reviewer recalled \((\sqrt5-1)/8\)). A search found \(0<w<\tfrac18\) in Dyn–Kuijt–Levin–van Damme's citation of the 1987 paper and the sharp \(w^*\approx0.1927\) from Hechler–Mößner–Reif; the primary paper was not opened. The lesson now states \(C^1\) for \(w=\tfrac1{16}\) with the citation and no range; the test asserts no range is quoted.
- I5 engineering: no medium. Lows deferred — `next-step`/`play` at the round cap and `set-closed` with fewer than 3 points are silent; `replay` is accepted (consistent with other iteration graphs).
- Term: the lesson uses *Chaikinovo pravilo* / *štiritočkovno pravilo* (graph labels already say *pravilo*), not the brief's *postopek*.

## Next steps, in order
1. Dispatch the prepared D4 lesson brief [handler-17-briefs/brief-ab-c-3.md](handler-17-briefs/brief-ab-c-3.md) (replace `<JOB>` with your job id). Numbers checked by hand: \(L_c\), \(L_d\) centre \(z=0.375\), \(B=0\), \(S\) centre \((1.5,1.5,0.75)\). It shares registration files with any other lesson slice, so do not run it beside another lesson worker. A file-disjoint parallel slice: **BS-A-2a3b** (wire `bsplinePresetCollection` into `DeBoorGraph`; hook points in the 2a3 evidence).
2. Then BS-A-2b registration (L1/L2 routes, `'deboor'` in `LESSON_ANIMATION_IDS`, lesson commands, browser drag check of both B-spline graphs including dragging a ringed control point).
3. `G-FN` is open: I2/I4 graphs and family 4 (PS) graphs. Read `docs/tasks/architecture-deepening-backlog/08-function-graph-sharing.evidence.md` first; check master's new function graphs for reuse.
4. Deferred lows from handoffs 13–17 remain open.

## Gaps
- Post-rebase local smoke of `interp-subdivision` beside master's `segment-intersections` row not run (memory reaping); see checks above.
- No live SL→EN switch browser check for I5 or I3 lessons; smoke ran configured languages only.
- BS-A-2a3 is unregistered: no browser check; measurements are jsdom only.

## Evaluation record (not yet logged with `do-log`)
- IA-C-3 worker, Sonnet medium, handoff-v12: complete at 134k (71 tools, ~37 min). Correct numbers and tests; quoted the brief's range verbatim (brief error, caught by math review).
- BS-A-2a3 worker, Sonnet medium, handoff-v12 with Presets removed: partial at 142k (50 tools, ~18 min), all acceptance implemented but checks unrun. Finisher worker from its handoff note: 36k, 24 tools, complete. Splitting off Presets was not enough to fit one worker; graph slices with animation + editor still need two workers or a smaller cut.
- Reviewers (Sonnet): 2a3 math 24k/8 tools (one useful low), 2a3 engineering 26k/6 (two lows), I5 math 33k/6 (one real citation issue), I5 engineering 41k/12 (lows only).
