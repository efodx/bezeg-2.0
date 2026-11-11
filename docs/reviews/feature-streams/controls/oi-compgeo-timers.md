# Open item: compgeo host test timers

- The real 600 ms waits (`READOUT_SETTLE_MS + 100`) sat in the `settled`/`quietPeriod` helpers of the Voronoi, Delaunay, DegenerateSites and Fortune host tests (more than three tests used them). Each file now fakes only `setTimeout`/`clearTimeout` in `beforeEach`, restores real timers in `afterEach`, and the helpers advance fake time inside `act`. The assertions are unchanged.
- Four files: 40.4 s before, 26.7 s after (`just unit` wall time, includes startup). Logs: `.command-logs/oi-compgeo-timers-{before,after}.txt`.
- Voronoi "schedules no timers": the old claim is stale, since Play uses `TracePlayback` on an `AnimationScheduler`. The test is renamed ("nothing is left scheduled"), and a new test asserts the contract with a manual scheduler: 0 frames idle, 1 after Play, 0 after Pause, 1 after Play again, 0 after unmount.
- Mutation: with `tracePlayback.ts` unmount's `controller.dispose()` commented out, the new test fails ("expected 1 to be +0"); file restored. Log: `oi-compgeo-timers-mutant.txt`.
- Not verified: other compgeo host tests, tsc/lint.
