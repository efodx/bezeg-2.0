# Brief: Fourier series 06 Batch C step 1 — epicycle rendering measurement and ADR

- **Role:** implementation of measurement tooling and documentation (`bezeg-worker`, Sonnet `medium`). You may edit in the worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-functions` (branch `stream-functions`). Do not commit, push, stash or delegate.
- **Goal:** complete step 1 of [06 Batch C](../../../../tasks/fourier-series/06-batch-c.md): measure the epicycle rendering options of [ADR 0034 §3](../../../../adr/0034-fourier-series-models-handles-and-closed-loop.md#3-epicycle-rendering-batch-c-decided-by-measurement) and write the follow-up ADR that chooses one.
  - Spec: [F5 Epicycles](../../../../specs/fourier-series-lessons.md#f5-epicycles).
  - Protocol and report template: the "Measurement protocol" and "Report template" sections of the [performance plan](../../../../performance-plan.md).
- **Precedent (copy its structure):** `git show --stat c2a90be9`, the direction-field measurement. It consists of `scripts/euler-field-perf.cjs`, `scripts/perf-harness/euler-field.{html,js}`, a review `.md` plus `.log`, and ADR 0037. Read its brief, `docs/reviews/feature-streams/functions/briefs/numerical-07-measure.md`, for the method details: rAF frame stamps taken only during the interaction, warm-up dropped, 3 runs, median of runs, env `PERF_RUNS` and `PERF_DRAG_MS`, a tiny Node static server inside the script, JSXGraph from `node_modules/jsxgraph/distrib/`, and no new dependencies.
- **Acceptance:**
  1. **Script.** A repeatable script `scripts/epicycle-perf.cjs` with a harness `scripts/perf-harness/epicycle.{html,js}`, at 1280×720 and 1920×1080.
     - Loop: a closed loop of 6 cubic or linear spans. Reimplementing the coefficients inline is fine (16 Gauss nodes per span). Better, import nothing from `src/` and copy only the formulas. The existing kernel lives in `src/analysis/closedSpline.ts` and `fourier.ts`; read them for the epicycle chain.
     - Scenes: \(N=10,25,50\) (\(2N+1\) terms), with traces of 400 and 2000 samples, and the original loop drawn as one curve.
     - Approaches:
       - (a) the \(2N+1\) circles and arms as individual JSXGraph objects;
       - (b) the arm chain as one polyline curve, plus circles only for the first few terms (say 5) or the circles as one NaN-separated curve. Measure both sub-variants if cheap.
       - Both approaches draw the trace as one curve.
     - Cases:
       - playback (the chain rotating, a time step per frame, 2 s);
       - an \(N\) change sweep \(10\to25\to50\to25\to10\), repeated;
       - a real `page.mouse` drag of one loop vertex for 2 s, which recomputes the coefficients and redraws the chain and trace.
  2. **Results.** Write the results table to `docs/reviews/fourier-series/06-epicycle-measurement.md`, with bulky output in `.log` beside it. Include:
     - commit, browser and version, and the device (this desktop: Ryzen 5 7600, 60 Hz headless);
     - for each viewport and case: median and p95 frame interval, frames over 25 ms, and object counts.
     - The threshold: the precedent is p95 ≤ 16.8 ms and no frame over 25 ms at 60 Hz.
     - State the gap: the classroom target device was not available.
  3. **ADR.** Write ADR `docs/adr/00NN-epicycle-rendering.md`, using the next free number and following the existing ADR format. It chooses the approach, lists the alternatives and cites the measurement.
     - Keep JSXGraph.
     - Pick the simplest approach that meets the threshold at \(N=50\) with a 2000-sample trace.
     - Prefer JSXGraph-native objects over an overlay.
     - Also state the trace sample count to use.
  4. **Task record.** Add a one-line record under step 1 of `docs/tasks/fourier-series/06-batch-c.md` (`*Measured 2026-11-0x* ...`) that points at the review file and the ADR.
- **Scope:** only the files above. No changes in `src/`.
- **Shared resources:** use port 4330 for your static server. Do not run `just check` or `just build`.
- **Budget:** a watcher runs on you at 135k. Locate code with grep before reading, and read at most about 150 lines per call. On `HANDOFF`, or past about 30 turns, stop and write `docs/reviews/feature-streams/functions/worker-fourier-06-measure-handoff.md`. Before returning, confirm by PID that every browser and server you started has exited.
- **Report:** at most 25 lines: files written, the headline numbers per approach at \(N=50\) with a 2000-sample trace, the chosen approach, and gaps.
