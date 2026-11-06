# Curves stream: handler handoff 69

Handler 69 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the low-priority list. It replaces [handoff 68](handler-handoff-68.md).

## State

- **On `origin/master`:** everything through this note. **All five families are complete:** hosted CI run 42213547468 on `5fd09b9f` passed, all 12 jobs read, so the [IA-F6 gate](../../interpolation-approximation/ia-f6-gate.md) closed family 3.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4314 is free.
- The stray `python.exe -` of handoff 68 (PID 33116) was not touched. Earlier `python.exe tools/agent-usage/...` watchers belong to earlier sessions; leave them.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 20.5 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. Today's last run took about 12 minutes, not 50. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `c53f5a18` | Inspector controls stay in the panel at 200% text; three long select options shortened; Hermite help line | Sweep below |
| `6dcfadf1` | The P4 summary view widens to a fence past the values, under either quartile rule | Test failed first at `[3, 4, 31, -2]`; default view unchanged |
| `6d73fb78` | I1's board readout hides below 480 px board width; G5 and G6 tests | Each new test failed by a mutation |
| `8efbdc15` | Patches open fitted to the real host | Coons about 416×305 at 1440×900 and 205×165 at 390, viewed; contract suites below |
| This push | Family 3 closed, gate and stale rows, this note | **Hosted CI not yet read** |

**Behaviour change, `8efbdc15`.** Reset to the default scene, and the default-scene figure, now fit to the host like a fresh open, because the transient-state contract needs Reset to equal a fresh mount. Selected Presets, imports, stored Preset files and lesson scenes keep their exact camera. No stored format or route changed.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `8efbdc15`, docs dirty | Exit 0, 1259 s, build passed |
| `just smoke-lesson patch-tensor patch-coons interp-lagrange interp-hermite` | `8efbdc15` | Exit 0 |
| `BEZEG_TRANSIENT_STATE=all just unit` on `GraphTransientState`, `lessonRestoration`, `src/graphs/patches` | Before the commits, same source | Exit 0, 667 s |
| Inspector sweep: 118 routes at 1440 and 390, 100% and 200% text | Production build, before the `CorrelationGraph` revert | No page overflow, no slider row wrapped at 100%, no select clipped at 100% |
| Hosted CI | `5fd09b9f` | Success: run 42213547468 |
| Hosted CI | This push | **Not yet read** |

The sweep script checked Slovenian only. English option lengths were read, not measured.

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first.
2. **Check the patch posters.** `8efbdc15` changes the default-scene figure's camera. `just check` passed, but no poster was recaptured or viewed. If a patch poster now differs from its route, decide on a selective recapture.
3. The remaining low-priority list:
   - **P5 line labels (`CorrelationGraph.tsx:233`).** Tried and reverted: hanging the y label below its line, right-anchored, runs it along its own rising line and through a data point. Left-anchored at the same place would clip on a phone. A fix needs the anchor chosen by slope, or labels off the lines.
   - Faint `prob-correlation` residuals on the poster.
   - `BSplineNurbsGraph.importPresetData` building the scene twice (nit); `importPresetData` clearing the notice without its own render request; CltGraph lifecycle tests.
   - Playback buttons give no reason when aria-disabled; pointer drag stops at the board edge; the P2 visual notes of handoff 30, item 4.
   - D1's and D2's curves are small at 390 px; step 5, frame 1 at 1280×720 is hidden until the panel moves; the evolute poster's crowded labels.
   - [AB-B-6](../../advanced-bezier/ab-b-6-gate.md) and [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish) carried polish, what remains of it.
   - New, tiny: at 200% text a closed native select truncates long values (34 options), and the `probability/summary` legend passes the panel by 1 px at 1440.
4. **Closed as stale, checked this session:** the ±20 refusal is not silent (typing 25 on `prob-correlation` shows *Vnesi vrednost med −20 in 20.*). The CLT legend has no density wording left. The "Orodja za ta graf" eyebrow showed no overflow.
5. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

## Risks and notes

Handoffs 61 to 68's "Risks and notes" still apply, and those they inherit.

- **A sweep's zero-looking summary can hide a crash.** The first run died at route 43 and its wrapper still exited 0. Count rows per configuration before reading a result.
- **The Vite dev server stalls on long route sweeps.** Use a production build, and bind `--host 127.0.0.1`; Vite otherwise listens on IPv6 `localhost` only.
- **Bootstrap labels are inline-block,** so `max-width: 100%` on an input inside one does nothing until the label has it too.
- **Look at a label move before keeping it.** The P5 change passed every test and was wrong on screen.
- **A button in an inactive inspector tab is not clickable.** A script's "equal after Reset" line meant nothing when the click had failed; read the error line first.
- **`just check` started with `&` gets no notification.** Use `run_in_background`.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-69.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
