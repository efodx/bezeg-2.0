# 10T-M handoff

The worker's context watcher reached its stop threshold before browser work began. No build, preview server, or browser process was started. No measurements or smoke checks were run, no temporary Preset was created, and no live source file was edited.

Read: repository `AGENTS.md`, `.agents/skills/smoke-tester/SKILL.md` (worker execution/report sections), `docs/smoke-tests.md`, `docs/reviews/bezier-patches/t10t-brief.md`, ADR 0018, and the bounded surface-control and benchmark references needed to prepare the runner. `just --list` completed and listed `build` and `preview` recipes.

Draft runner: [`scripts/bezier-benchmark/t10t-orbit-smoke.cjs`](../../../scripts/bezier-benchmark/t10t-orbit-smoke.cjs). It is unvalidated: `node --check` has not run, selectors have not been exercised, and it may need trimming. It currently tries one mouse orbit per scene at each viewport, event-to-next-rAF and active rAF-interval samples, the `join-teapot` Preset flow, language, save/export/import, SVG/PNG content inspection, Reset/back, keyboard/touch orbit, narrow overflow, plus a curve-slider and surface-remount baseline. It writes screenshots/results into a timestamped `.claude/scratch/t10t-*` folder. The runner is broader than needed and repeats the save/export/import flow on mobile; prioritize desktop Preset/export/import, both-viewport measurements, and mobile resize/touch if the ten-minute budget is tight. Report the frame series as rAF intervals, not CPU render time or presentation latency.

The cache comparison is deferred. Do not replace the live `BaseSurfaceGraph.tsx`; if a scratch baseline is not quick, report the required after-only results. No processes or artifacts require cleanup.

Next worker: first review/trim the unvalidated runner, then use `node --check scripts/bezier-benchmark/t10t-orbit-smoke.cjs`; verify the current checkout and build stamp; run `just build`, followed by `just preview 4391`, and confirm the preview provenance before launching the Playwright runner outside the sandbox. Use a 10-minute elapsed browser budget and save the two requested durable reports with the selected checks, concrete evidence, cleanup and gaps.
