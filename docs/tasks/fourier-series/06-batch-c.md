# 06 Batch C: epicycles (F2a–F6)

Gates: `G-FN` (F2a), `G-REG` (F2b–F6). Depends on 02 and 05 (Batch B released). Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md) §3–4.

1. **Measurement first.** Build throwaway scenes for the options in ADR 0034 §3 (\(N=10,25,50\); traces of 400 and 2000 samples; change \(N\) and drag a vertex). Record frame times and the threshold in a new ADR. No drawing code is merged before that ADR.
2. **F2a:** the epicycle graph on the measured approach: closed loop with draggable vertices or controls (4–8 spans), arms and circles, trace, original curve, \(N\) control capped at 50 with a visible hint, \(|c_k|\) table, text status, parametrization switch. Playback is stopped by default and pauses on edits, exit, import and unmount.
3. Presets: loop, \(N\), parametrization; all validated.
4. **F2b–F6:** as in task 04, for lesson F5. The prose says that coefficients depend on the parametrization and the start, and calls the trace an illustration.
