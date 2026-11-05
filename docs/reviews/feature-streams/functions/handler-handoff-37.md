# Functions stream: handler handoff 37

Handler 37 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-05. It stopped because F2b's measurement missed the ADR 0040 threshold, which the ADR sends to the owner. **No successor was launched: the next step needs the owner's decision.**

- Stream file: `docs/tasks/feature-streams/functions.md`.
- Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.
- `origin/stream-functions` has diverged, so never force-push it; push to `master` only, as a fast-forward.

## Owner decision needed

Dragging a vertex or control on the epicycle route misses ADR 0040's threshold (p95 at most 16.8 ms, no frame over 25 ms):

| Case (`uneven`, \(N=50\)) | median | p95 | max | frames over 25 ms per run |
| --- | --- | --- | --- | --- |
| Vertex drag | 16.7 | 50.0 | 66.7 | 145/144/145 |
| Control drag | 16.7 | 33.4 | 50.1 | 145/145/145 |
| Playback 5 s | 16.7 | 16.7 | 16.8 | 0 |
| \(N\) sweep | 16.7 | 16.7 | 16.8 | 0 |
| Vertex drag, 1920 px | 16.7 | 50.0 | 83.3 | 145/145/145 |

The cause is the recompute, not the drawing: `analyzeEpicycle` takes 23 ms and `epicycleTrace` 6 ms per drag in Node. See `docs/reviews/fourier-series/06-epicycle-measurement.md`, "Cause of the drag miss".

Options, none started or measured:

1. **Make the coefficients cheaper (handler's recommendation).** Evaluate \(z\) once per node and share it across frequencies, in one pass for the real and imaginary parts. This changes the kernel's rounding, so the spec's numbers must be rechecked. It may not be enough alone: the trace adds 6 ms.
2. **Recompute less during a drag.** For example, keep the loop live and update the coefficients and trace at drag end, or at a lower rate. It stays inside the threshold but weakens spec step 6, "drag a control point and watch the circles".
3. **Relax the threshold for drags at high \(N\)**, recording the reason in ADR 0040.

Two more facts for the decision: the handler's brief computes coefficients up to \(N=50\) at any \(N\), so a drag at the default \(N=5\) costs the same as at 50. And the rule cited as the "06 Batch C rule" appears only in ADR 0040, not in the task file.

## Done this session

- **CI.** `ccdb0f9a` green (run 41937561740). `0be765a3`'s own run 41941029478 was in progress when last read; `ed0b37d9`, which contains it, is green (run 41941098734), as is `66b8dd45` (run 41953294054).
- **Fourier 06 F2a, on master.** `bcac0881` (`epicycleModel`, single-sort `traceSum`) and `66b8dd45` (`EpicycleGraph`, Presets, catalogs).
  - Engineering and math reviews ran. The math review reproduced the spec's circle and diamond numbers independently.
  - Repairs: transient time and playback across scene replacements, largest term over \(k\ne0\), closed curves, the error labelled as sampled, play button semantics.
  - `just check` passed before the rebase; `tsc`, focused units and `just build` passed after it.
- **Fourier 06 F2b, local only.** The registration commit sits on local `stream-functions`, not on master, because pushing deploys it. See the final report for its hash.
  - Route `/bezeg-2.0/analysis/epicycles`, id `epicycles`, no poster; the perf cases in `scripts/fourier-browser-perf.cjs` (`PERF_ONLY=epicycles`).
  - The screenshot of `uneven` at \(N=1\), 1920 px, shows 48-segment circles looking round at about 380 px across, so that ADR check passed.

## Next, in order

1. Get the owner's decision above. Do not repeat the measurement without a change.
2. Apply it, re-measure with `PERF_ONLY=epicycles`, and rebase the local registration commit onto `origin/master`, keeping both sides in the count tables.
3. Push the route, then F3 lesson F5, F4 chapter, F5 card and F6, as in task 04.

## Open risks and nits

- The Reset host test does not fail on the unfixed code, because Reset goes through `importPresetData`. Only the checkpoint test showed the defect.
- The shared `NumberInput` rounds plain-arrow steps to 9 decimals, so a plain-arrow step on a control rounds. Accepted.
- `EpicycleGraph.unmount` clears `hostListeners`. Harmless today.
- No browser smoke has run on the route yet; the F6 gate covers it.
- The watcher printed nothing when started through the PowerShell tool and exited at once. Run it through the Bash tool, with `python -u`.
- Open from handoff 36: the S5 explore-scene nit, and S6's small-screen notes.
- Count tables conflict on almost every rebase. Keep both sides and rerun the count tests.
- Bash heredocs and `sed` mangle doubled backslashes in lesson TS strings. Use Read/Edit, or the Write tool.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on.
- Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`.
- Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (perf harnesses). Logs: the job tmp dir.
