# CP2 — Worker host and protocol

Source: spec [Containment](../../specs/collision-playground.md#containment), criteria 3 and 6; [ADR 0042](../../adr/0042-collision-playground-worker-and-canvas.md). Batch A. Kind: engineering review.

**Owned paths:**

- `src/learning/playground/collisions/collisionProtocol.ts`
- `collisionWorker.ts`
- `useCollisionWorker.ts`
- their tests

Uses CP1's exports without changing them; request any change through the handler.

**Build:**

1. **`collisionProtocol.ts`.** Discriminated unions for commands (`init`, `setCount`, `setMethod`, `play`, `pause`, `stepOnce`, `reset`, `setOverlay`) and for snapshots: `Float32Array` positions and radii, a `Uint8Array` of touching flags, the counters, `stepMs`, `simSpeed` and a step index. The typed arrays are sent as transferables. Include a `MAX_COUNT` table per method, with provisional values 2 000 (naive) and 5 000 (sweep) that CP3 replaces.
2. **`collisionWorker.ts`.** A module worker.
   - It applies commands only between steps.
   - Each step advances exactly \(\Delta t\), with no catch-up.
   - It schedules the next step with `setTimeout(0)` after posting, so commands interleave.
   - `simSpeed` is \(\Delta t\) divided by the wall time per step, capped at 100 %. When steps are faster than 16.7 ms, it paces to real time.
   - It rejects counts above the method limit by clamping and reports the clamp.
3. **`useCollisionWorker.ts`.** A React hook.
   - It creates the worker on mount with `new Worker(new URL(...), {type: 'module'})` and terminates it on unmount.
   - It pauses on `visibilitychange` hidden and on an `IntersectionObserver` callback reporting the canvas out of view. It also pauses after 120 s without a reader action (any command from the UI counts).
   - It exposes the latest snapshot through a ref plus a subscription, so it does not cause a React render per step.
   - Reduced motion (`prefers-reduced-motion: reduce`) starts it paused.
   - It reports `unavailable` when the `Worker` constructor throws or the worker posts an error.

**Checks:**

- **Unit tests** (jsdom has no Worker): the worker's step and command logic is factored into a pure `createWorkerLoop(post, schedule)` and tested with fake timers. Cover:
  - command ordering between steps;
  - no catch-up after a slow step (`simSpeed` < 100 %, simulated time advanced by exactly one \(\Delta t\));
  - clamping;
  - pause stops scheduling.
- **Hook tests** with a mock Worker cover:
  - terminate on unmount;
  - pause on hidden, on off-screen and after the idle timeout;
  - reduced motion starts paused;
  - `unavailable` on a throwing constructor;
  - no listener left on `document`/`window` and the observer disconnected after unmount.
- **Build:** `just build` produces a separate worker chunk (name it in the return).

**Return** ≤ 250 words: protocol summary, file:line of the lifecycle handling, and the worker chunk name.
