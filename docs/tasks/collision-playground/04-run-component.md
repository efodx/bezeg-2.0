# CP4 — Run component

Source: spec [Interaction and presentation](../../specs/collision-playground.md#interaction-and-presentation), criteria 4–7. Batch B. Kind: engineering and UI/accessibility review.

**Owned paths:** `src/learning/playground/collisions/CollisionPlayground.tsx`, `CollisionPlayground.css` and their tests. Add the localization keys in one new block at the anchor after the drawing-playground keys, in the same position in `sl.ts` and `en.ts`.

**Build:**

- **Canvas.** A 2D `<canvas>` (16:10, responsive width, device-pixel-ratio aware, `aria-hidden`) drawn from the newest snapshot in one `requestAnimationFrame` callback. Stale snapshots are dropped, and nothing is drawn when no new snapshot has arrived.
- **Colours** come from the graph style tokens (light and dark). Touching bodies get the highlight colour and a ring.
- **Controls:**
  - a logarithmic slider for the number of objects, from 10 to the method limit;
  - a radio group *test every pair* / *sweep and prune*;
  - *Play/Pause*, *Step* and *New arrangement*.
- **Readouts:** objects, box tests this step, \(\binom n2\) for naive, touching pairs, step time and simulation speed. Throttle readout updates to 4 per second.
- **Live region.** A polite region speaks once after each reader action, when the first snapshot after it arrives.
- **Reduced motion** starts paused. The **unavailable** state shows a static explanation with the counts for \(n=1000\).
- Text comes through `t` from `useT()`. Use only the keys this task adds.

**Checks:**

- **Component tests** with a mocked hook:
  - controls send the right commands;
  - readouts render the counters;
  - the live region updates only after actions;
  - reduced motion starts paused;
  - the fallback renders.
- **Keyboard path:** reach every control, change the count and switch the method.
- `npx tsc --noEmit --pretty false`, `just lint` and the production build.
- **Real-browser check** (`bezeg-smoke`, Haiku) on a temporary harness route or Storybook-like test page, at 1440×900 and 390×844 with touch:
  - drawing appears;
  - touch targets are ≥ 44 px on coarse pointers;
  - switching to naive at its limit visibly slows the motion while the page still scrolls.

**Return** ≤ 250 words: what was built, and the browser check results in `docs/reviews/collision-playground/cp4-browser.md`.
