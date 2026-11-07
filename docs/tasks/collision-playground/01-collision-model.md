# CP1 — Collision model (pure)

Source: spec [Mathematical model](../../specs/collision-playground.md#mathematical-model), acceptance criterion 1 (circles). Batch A. Kind: kernel; mathematical review.

**Owned paths:** `src/compgeo/collisions/{world,broadPhase,narrowPhase,random}.ts` and their tests. No React, DOM, worker or JSXGraph imports.

**Build:**

1. `random.ts`: a small seeded PRNG (for example mulberry32), deterministic across platforms.
2. `world.ts`:
   - `createWorld({seed, count, width: 1600, height: 1000})` gives circles with radii in a fixed range and speeds in a fixed range. Default density is tuned so that about 1 % of bodies touch at \(n=1000\); record the chosen constants.
   - `stepWorld(world, method, scratch)` moves by \(\Delta t=1/60\), reflects off the walls (mirroring the overshoot), runs the broad and narrow phases, and returns touching flags plus counters `{boxTests, candidates, narrowTests, touchingPairs}`.
   - Positions and velocities live in `Float64Array`s. Use scratch buffers, with no per-step allocation proportional to \(n\) beyond reused arrays.
3. `broadPhase.ts`:
   - `naiveCandidates`: every \(i<j\), one box test each.
   - `sweepAndPruneCandidates`: a persistent order sorted by \(x_{\min}\), re-sorted with insertion sort each step, then a sweep with an active list. Closed boxes, entries before exits on ties, as in lesson C1.
4. `narrowPhase.ts`: `circlesTouch` with \(\le\) on squared distance.

**Checks (each new assertion must be seen failing first, for example by flipping a tie rule):**

- For seeds 1–50 and \(n\in\{0,1,2,10,200,1000\}\) over 120 steps, both methods give identical touching-pair sets.
- Naive `boxTests` \(=\binom n2\).
- Sweep `boxTests` ≤ naive, and below 10 % of naive at \(n=1000\).
- Exact touching cases (distance \(=r_i+r_j\); boxes sharing an edge or a corner) are reported by both methods.
- Bodies stay inside the world. Velocity sum is unchanged over a step with no wall contact.
- The same seed and \(n\) reproduce identical positions after 120 steps.

Run `just unit src/compgeo/collisions`, `npx tsc --noEmit --pretty false` and `just lint` on the touched files.

**Return** ≤ 250 words: exported signatures, the chosen constants, and test counts. Write bulky output to `docs/reviews/collision-playground/cp1-notes.md`.
