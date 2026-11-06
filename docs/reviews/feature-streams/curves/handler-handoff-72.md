# Curves stream: handler handoff 72

Handler 72 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during a CI repair. It replaces [handoff 71](handler-handoff-71.md).

## State

- **On `origin/master`:** everything through this note. All five families stay complete. Only the low-priority list and the owner items remain.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4387 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 19.4 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state). Python `urllib` fails on certificates here, so fetch with `curl`, and strip `\r` from ids printed by Python.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `ac9387c0` | **Card images:** 26 changed across the retained family, `numerical-methods`, `fourier-series`, `linear-maps` and `complex-maps`. The other five families had no byte change and keep their manifests | [Note](card-tick-recapture.md); all 98 manifest checksums match their files; `epicycles` viewed by the handler |
| `536c3aaa`, `51fd155e` | **Poster recipes:** `curve-evolute` at t = 0.8; `prob-correlation` on the `outlier` example; windows for `rational`, `rational-subdivision`, `farin` | Worker viewed all five; handler viewed `rational` |
| `0c8bc018` | **P5 line labels** step back along the line to stay in view and off the points | 3 tests failed first. Measured in the browser at 1440 and 1280: `outlier`, `parabola` and `parabola-right` fixed, `default` and `ring` unchanged |
| `6e173150` | The `farin` clip check reads `smartlabel` text | `farin` clip captured, which failed twice before |
| `8f197e8b` | **NURBS knots regression from `0be8f98f`** | New test failed with the old knots; see below |

**Hosted CI at `c3671955` failed.** `unit (1)` failed in `GraphTransientState.part4 > bspline-nurbs`; `smoke` failed only as the job requiring every check. It was a real user-facing bug. `0be8f98f` stopped rebuilding the NURBS scene on import, but the curve takes its knots only when built and `fits` ignored them, so an import that changed only the knots kept the old curve. **It never deployed:** the failed run skipped `deploy`. The other four B-spline graphs still rebuild on import and are not affected.

**Step 5 of handoff 71 is closed.** The weight labels are correct on the live route (centred on the point, top edge at the point). The fitted frame left no room for them, so the three recipes now have explicit windows. An explicit window skips the capture's out-of-frame check, so those were checked by eye. A full generation should now pass these ids; **no full generation was run.**

**Behaviour change.** P5's line label can sit further along its line than before. Posters, clips and cards listed above changed. No route or stored format changed.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `BEZEG_TRANSIENT_STATE=all` on `src/graphs/base/GraphTransientState` | `8f197e8b` content | Exit 0: 952 tests |
| `src/graphs/curves/bspline`, `tsc`, lint on the changed files | `8f197e8b` content | Exit 0: 173 tests |
| `just unit` on assets, `DemonstrationsPage`, `CorrelationGraph`; `just build` | `8f197e8b` | Exit 0 |
| `just unit --shard=1/3` | `51fd155e` | Exit 0: 4 133 tests; sampled contract, before the NURBS fix |
| `just unit src/graphs/functions src/analysis src/learning/lessons` | `6e173150` | Exit 0 |
| `just tooling-test`, capture test with FFmpeg | Recipes, before `51fd155e` | Exit 0 |
| Full `just check`, shards 2 and 3, smoke | None | **Not run.** No browser check of the NURBS fix |
| Hosted CI | This push | **Not yet read** |

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first. It also covers smoke, and a green run deploys everything since `14e4bf0d`.
2. The remaining low-priority list:
   - Playback buttons give no reason when aria-disabled. The same three-button markup sits in 19 control files (`grep -l 'data-action="play-pause"'`), so this needs a shared piece and new strings. Write a short spec first.
   - **New:** in `parabola` the P5 caption covers point (-3,9), at 1440 and 1280. `fitCorrelationView` leaves no room for the caption; the fix changes the view of every example.
   - **New, tiny:** `scripts/capture-demonstration-previews.cjs` filters `elType === 'text'` in six places (lines 204 to 496), so the weight-label overlap rule at line 455 no longer sees `smartlabel`s. The `rational` poster shows no overlap; the others were not checked for this.
   - Pointer drag stops at the board edge.
   - D1's and D2's curves are small at 390 px; step 5, frame 1 at 1280×720 is hidden until the panel moves.
   - [AB-B-6](../../advanced-bezier/ab-b-6-gate.md#carried-polish) and [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish) carried polish, what remains of it.
   - Tiny: at 200% text a closed native select truncates long values (34 options), and the `probability/summary` legend passes the panel by 1 px at 1440.
   - Tiny: on the `prob-correlation` poster the label's last letter sits about 5 px from the x = 3 residual.
3. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

## Risks and notes

Handoffs 61 to 71's "Risks and notes" still apply, and those they inherit.

- **A local `GraphTransientState` run is a sample.** It skips most Demonstrations, and CI runs them all. After changing a graph's scene or import path, run `BEZEG_TRANSIENT_STATE=all npx vitest run src/graphs/base/GraphTransientState`. That is how handoff 71's checks missed the NURBS regression. `-t` on a skipped Demonstration passes with everything skipped, so read the counts.
- **Do not edit `src` or move `HEAD` during a capture.** The manifests record source fingerprints and revisions.
- The linear-maps manifest's earlier `ac6bd191` revision is not in this repository, so that family was traced by manifest dates.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-72.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
