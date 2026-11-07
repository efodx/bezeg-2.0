# CP5 — Look underneath

Source: spec [Interaction and presentation: Look underneath](../../specs/collision-playground.md#interaction-and-presentation). Batch B. Kind: mathematical and UI/accessibility review.

**Owned paths:** `src/learning/playground/collisions/CollisionInspect.tsx`, its CSS and tests, and its own localization block after CP4's. A pure helper `src/compgeo/collisions/sweepTrace.ts` turns one sweep-and-prune pass into ordered events (`enter`, `leave`, `box-test`, `candidate`, `y-rejected`) for the step-through. It is tested against `sweepAndPruneCandidates`.

**Build:**

- A fixed small world (\(n=20\), slider 5–40), paused, with a *Next step* / *Previous step* step-through of one sweep.
- Each body's \(x\)-interval is drawn on a number line below the world, with a vertical sweep position and the active list as a labelled list.
- Candidate pairs are thin lines between centres. Pairs removed by the \(y\)-test are dashed, and pairs that pass are solid, so colour is not the only cue.
- *Play* resumes the motion with overlays.
- The caption gives the box-test count against \(\binom n2\) and, here only, \(O(n^2)\) against about \(O(n\log n+k)\).
- This mode may run on the main thread at \(n\le 40\) only if a measured step stays below 1 ms on the throttled profile. Otherwise it uses the worker. Record the measurement.

**Checks:**

- `sweepTrace` events reproduce exactly the candidate set of `sweepAndPruneCandidates` for seeds 1–50.
- Events are in sweep order, with entries before exits on ties.
- Component tests cover the step-through, the counts and the keyboard path.
- Real-browser check at both widths: labels stay clear of each other, and dashes are visible in both themes.

**Return** ≤ 250 words.
