# CP3 — Measured limits

Source: spec [Containment: bounded cost](../../specs/collision-playground.md#containment), criterion 3. Batch A. Kind: handler measurement, with a worker writing the script.

**Measure** on the production build in Chromium through a Playwright script (`scripts/collision-step-bench.cjs`, run against `just preview` on the stream port). Use a bare harness page or the CP2 worker loaded directly, and record the median step time per method for \(n\in\{100, 250, 500, 1000, 2000, 3000, 5000\}\), over 120 steps after 30 warm-up steps. Use two profiles:

- desktop, no throttling, 1440×900;
- 4× CPU throttling through CDP `Emulation.setCPUThrottlingRate`, 390×844.

**Decide:**

- The naive limit is the largest measured \(n\) with a median step ≤ 250 ms on the throttled profile. Interpolate to a round number.
- The sweep limit is the largest \(n\) ≤ 5 000 with a median step ≤ 8 ms on the throttled profile.
- Record the raw table, the device, the browser version and the commit in [the performance results](../../bezier-performance-results.md) under a new heading. Write the limits into the spec (replacing "provisional") and into `MAX_COUNT` in `collisionProtocol.ts`.
- If the naive method stays smooth up to the sweep limit on the reference profile (the motivation fails), stop and report to the owner with the numbers. Do not raise the density silently.

**Return** ≤ 200 words: the table and the chosen limits.
