# W3 P2a result

Files: EulerGraph.tsx (EulerRevealButtons), EpicycleGraph.tsx (PlaybackButtons, reducedMotion()), CollisionPlayground.tsx/.css, CollisionInspect.tsx, sl.ts/en.ts, tests beside them.

Epicycle before: seek (setTime), every accepted model edit and mode (parametrization) change already halted; display switches did not; no reduced-motion check (it animated); no run Reset. Collision before: no setting paused; worker `reset` kept playing.

Collision pause rule: UI sends `pause` before count, method, coverage and New arrangement; Bounce and overlay stage do not pause (display/motion option, recorded). Inspect: count change and New already stopped playback.

Checks (logs in .command-logs/w3-p2a-*.log): unit Euler+Epicycle host tests pass; collisions dir pass; lint pass; related lesson/functions/localization run: 2 failures, FixedPointGraph.test.ts and SequenceGraph.test.ts preset playback (P2b area, not touched by P2a). typecheck: only BSplineNurbsGraph.tsx(311) (V1 area).
