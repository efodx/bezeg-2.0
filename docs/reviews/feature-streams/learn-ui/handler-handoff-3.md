# Learn UI stream: handler handoff 3

Date: 2026-10-31. Handler 3 (Opus 5.5, `--permission-mode auto`, `--effort medium`) was started by the supervisor after a crash. It stopped because Claude Code killed its background commands for critically low memory (1.6 GB free): the self watcher, and the rebuild plus browser recheck below. The note did not come from a context threshold. No successor was launched; the supervisor relaunches the `active` stream.

## Where things are

- Worktree `.claude/worktrees/stream-learn-ui`, branch `worktree-stream-learn-ui`, rebased on `origin/master` at `2f25c69`. Commits beyond master: `4cf9117` PG4a, `63c0bce` PG4b performance, `d30a4a8` PG4b smoke repair, plus this note. Backed up as `origin/stream-learn-ui-pg4b`. `origin/stream-learn-ui-pg4a` and `origin/stream-learn-ui` are stale; never force-push them.
- **Nothing from PG4a/PG4b is on master yet** (stop condition: push only after PG4b passes).

## PG4b evidence so far

| Criterion | Status | Evidence |
| --- | --- | --- |
| 5 performance | pass | `scripts/playground-perf.cjs`; results in `docs/bezier-performance-results.md#drawing-playground-drag--2026-10-31`, raw in `pg4b-perf-raw.md`. All four medians 16.7 ms (rAF-capped at 60 Hz). Inspect block with all overlays at 390×844 and 4× throttle has p95 33–50 ms (max 100 ms); the spec targets the median only, so this is recorded, not a miss. Throttle is desktop CPU with mouse input, not a phone. |
| 2 interaction | pass | `bezeg-smoke` (Sonnet) on build 577ae08: desktop, 390×844 touch and the keyboard-only path all passed; touch scroll outside the canvas, 44 px targets and the focus ring were observed. Scripts are in `pg4b-smoke/*.js`; screenshots are local and uncommitted. |
| 7 chapter smoke | pass | Both blocks are in the right sections in SL and EN; the spline link works; persistence reaches both placements after reload; live switch works; the Learn landing regression passed; no console errors. |
| PG3 carry-overs | repaired, **recheck pending** | Smoke found (1) the inspect block empty on first visit, against the spec's toolbar paragraph, and (2) the P2 label covering a C1 joint label at 390×844. `d30a4a8` starts inspect from `EXAMPLE_DRAWING` when no anchors are saved, without saving it. It places joint labels outward from the anchors' centroid (`jointLabelDirection`), flips them inward off the degree caption and clamps them to the view box (`jointLabelPosition`). The spec's Persistence section and criterion 4 now say *Draw* starts empty and *Look underneath* starts from the example. |

Handler checks on `d30a4a8`: `just unit src/learning/playground` 86/86; `tsc` and eslint clean. Mutations: reverting inspect-example or the outward offset fails 4 assertions, and disabling the flip and clamp fails the new placement test. An intermediate build (outward offset without flip or clamp) confirmed in Chromium that the inspect block shows 6 anchors on a first visit, the draw block 0, and no P/joint label boxes overlap at either viewport. That build showed the top-left C1 label touching the degree caption and the bottom C0 clipped, which the flip and clamp fix.

## Next

1. If memory allows (at least about 3 GB free), stop anything on port 4312, then run `just build` and `just preview 4312`. Run `node docs/reviews/feature-streams/learn-ui/pg4b-smoke/r.js`; it prints anchor counts, label overlaps and errors, and writes `r-{m,d}-overlays.png`. Expect `hit: []`, inspect at 6 anchors and no errors, and look at `r-m-overlays.png`: the C1 label is clear of the caption and the bottom C0 is unclipped. If memory is short, do not start heavy runs; set nothing and end.
2. Mark PG4b accepted, and section 1 accepted, in `docs/tasks/feature-streams/learn-ui.md`. Fetch, rebase, rerun `just unit src/learning/playground`, then `git push origin HEAD:master`. Judge CI by the next completed run that contains the commits.
3. Section 3: redo guided-example-highlights audit 00 against master, then **stop and report** for the owner's decisions before tasks 03/04.

## Open items

- Observations from smoke, accepted by the spec: the two placements don't sync within one page session (Persistence section). The live region is empty right after a language switch until the next edit (minor; not in criteria).
- `do-log` records are still unwritten for handler 2's dispatches and for this session's two (perf: Sonnet medium, 39 tools, about 23 min, mostly waiting for a test slot; smoke: Sonnet medium, 30 tools, about 6 min). Neither needed `HANDOFF`.
- `just check` is not run yet (F6 for section 1, once it is accepted).

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` with `SMOKE_PORT=4312`. Run one worker at a time while memory is low.
