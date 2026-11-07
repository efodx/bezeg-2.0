# Collision playground (Trki)

Status: approved for implementation (owner, 2026-11-07); tasks in [`docs/tasks/collision-playground/`](../tasks/collision-playground/README.md), stream [`collision`](../tasks/feature-streams/collision.md). Worker and canvas decision: [ADR 0042](../adr/0042-collision-playground-worker-and-canvas.md). Research: [motivating uses of computational geometry](../research/compgeo-motivation-2026-11-07.md).

## Purpose

The computational-geometry chapters open with definitions. The Bézier chapter showed that a hands-on opener works better ([drawing playground](bezier-drawing-playground.md)). This playground motivates the sweep chapter, and later the convexity chapter, with a problem every game and physics engine has: **which of these many moving objects touch?**

Testing every pair takes \(\binom n2=\frac{n(n-1)}2\) tests per frame: \(499\,500\) for \(1\,000\) objects. The reader raises the number of objects and watches the naive method fall into slow motion. Switching to **sweep and prune** keeps the motion smooth. Sweep and prune is the interval sweep of lesson C1 applied to the shadows of the objects on the \(x\)-axis, so the motivation leads straight into the chapter.

The playground motivates. It has no exercises, scoring or completion gates, like the Bézier playground. It does not replace any lesson.

## Owner decisions (2026-11-07)

1. **Placement.** *Run* mode opens the sweep chapter, in the `sweep-idea` section. *Look underneath* mode follows the guided example in the `interval-sweep` section. The convexity chapter reuses the playground for the narrow phase in batch C (polygons).
   - Handler decision, same day: the owner's default said "at the chapter end". The reveal shows the C1 interval sweep, so it is placed at the end of `interval-sweep` rather than after Fortune's algorithm, where it would follow an unrelated topic.
2. **The town-map opener** (Voronoi and the other "place pins on a map" ideas) is parked in the [research note](../research/compgeo-motivation-2026-11-07.md), not in this stream.
3. **Shapes and batches.** Batch B: circles, naive versus sweep and prune, live counters. Batch C: concave polygons, with the convex hull as a cheap proxy, the separating-axis test and decomposition into convex pieces. Curve-against-curve pruning (convexity A6) stays a link.
4. **Contact.** Objects bounce off the walls. Touching pairs are highlighted. There is no response between objects: they pass through each other. The subject is collision *detection*, not a physics engine.
5. **Closest pair (C6)** is not in the playground while sweep batch S4 is unapproved.
6. **Learning boundary.** No exercises, scoring or completion gates. The opening shows counts; \(O\)-notation appears only in *Look underneath*.
7. **The slowdown stays inside the animation (owner requirement).** A slow method slows the simulation, never the page or the reader's machine. Everything under [Containment](#containment) follows from this.

## Mathematical model

All of it is pure TypeScript in `src/compgeo/collisions/`, with no React, DOM or worker code, so it is unit-tested directly.

**World.** A rectangle \([0,W]\times[0,H]\) with \(W:H=16:10\). It holds \(n\) bodies. Batch B bodies are circles with centre \(c\), radius \(r\) and velocity \(v\). A seeded pseudo-random generator places them, so a seed and \(n\) reproduce the same world in tests and on every device. The world is \(1600	imes1000\) units. Radii scale with \(1/\sqrt n\) so that bodies cover 1.25 % of the area at every \(n\) (radii 0.75–1.25 times the base radius), and about 5 % of bodies touch at any \(n\). *Decision (handler, 2026-11-07, CP1):* a fixed radius sparse enough for \(n=1000\) would be under one pixel on a desktop canvas and would leave small worlds empty; constant density keeps one picture as \(n\) grows, so the comparison shows only the change in work. Speeds are 30–120 units/s.

**Step.** Fixed simulated time \(\Delta t=\tfrac1{60}\) s per step. Move \(c\mathrel{+}=v\,\Delta t\). Reflect off the walls by reversing the velocity component and mirroring the overshoot. Then find the touching pairs:

- **Bounding box** of a circle: \([c_x-r,c_x+r]\times[c_y-r,c_y+r]\), closed.
- **Broad phase**, producing candidate pairs whose boxes overlap:
  - *naive*: every pair \(i<j\), with one box test each, so exactly \(\binom n2\) box tests;
  - *sweep and prune*: keep the bodies sorted by \(x_{\min}\) between steps and re-sort with insertion sort (nearly sorted after a small move, so close to linear). Sweep in that order with an active list. A body leaves the list when its \(x_{\max}\) is less than the current \(x_{\min}\). The current body is box-tested against each body still active. Ties follow C1: touching counts as overlapping, so entries come before exits.
- **Narrow phase** for candidate pairs: circles touch when \(\lVert c_i-c_j\rVert^2\le(r_i+r_j)^2\).

**Counters** (per step): box tests in the broad phase, candidate pairs, narrow tests, touching pairs, and step time in milliseconds measured with `performance.now()`.

**Invariant.** For the same world, both broad phases yield the same set of touching pairs. They differ only in work done.

**Batch C bodies** are polygon *templates* authored on grid points. Each is translated, never rotated, so its hull and pieces are computed once per template:

- the convex hull with the existing exact monotone-chain kernel (`src/compgeo/monotoneChain.ts`);
- convex pieces from ear clipping (`src/compgeo/earClipping.ts`), with triangles merged into convex pieces where the shared diagonal is not reflex (Hertel–Mehlhorn);
- the box, hull and pieces are then offset by the body's position each step, in doubles.

The narrow phase becomes *box → hull separating-axis test → pieces separating-axis test*. Its counters add hull tests and piece tests. For a rendered animation, double precision suffices. The exact kernels run only on the integer templates, and the touching decision uses no tolerance beyond a test-asserted invariant (below).

## Containment

**Worker.** The simulation runs in a dedicated Web Worker (`collisionWorker.ts`, a thin host around the pure model). The main thread never runs a step. Commands are `init`, `setCount`, `setMethod`, `play`, `pause`, `stepOnce`, `reset` and `setOverlay`. They are applied between steps, so a command takes effect within one step.

**Slow motion, not lag.** Each step advances simulated time by exactly \(\Delta t\), however long it took to compute, with no catch-up loop. A step that takes 200 ms therefore shows as the world moving at \(\tfrac{16.7}{200}\approx 8\%\) speed. Work never piles up, and the readout shows the simulation speed as a percentage of real time.

**Bounded cost.**

- `setCount` is limited per method and device class. The naive limit is the largest \(n\) whose naive step stays at or below 250 ms on the reference low-end profile (desktop Chromium with 4× CPU throttling, 390×844). That is slow enough to see and short enough that switching back responds within a quarter of a second.
- The sweep limit is where a sweep step reaches 8 ms on the same profile, capped at 5 000.
- **Measured limits (CP3, 2026-11-07): 4 000 (naive) and 5 000 (sweep).** On the throttled profile the naive median step was 106 ms at \(n=3000\) and 317 ms at \(n=5000\); it grows as \(n^2\), so 250 ms falls near \(n\approx4400\), rounded down to 4 000. Sweep stayed at 2.8 ms (p90 4.1 ms) at \(n=5000\), so the 5 000 cap applies. Naive at 5 000 runs at about 5 % simulation speed throttled and 29 % on desktop, so the comparison still shows. Chromium cannot throttle a worker target through CDP, so the throttled column ran the same `stepWorld` on the page's main thread (desktop worker and main thread agree within 10 %). Raw tables: [performance results](../bezier-performance-results.md#collision-playground-step-cost--2026-11-07).
- Lowering \(n\) or switching method is always available.

**Draw pacing (decision 2026-11-07).** The draw loop (`drawPacing.ts`) keeps a moving average of the `requestAnimationFrame` interval. While it is above 20 ms the canvas is drawn at most every 33 ms (always from the newest snapshot, an early frame only re-requests); it returns to every frame once the average is below 17.5 ms and 1.5 s have passed. CP7 measured the throttled chapter page at scroll p95 77 to 104 ms with naive playing, from committing a DPR-2 canvas at the snapshot rate; with pacing it is 52 to 54 ms. Rejected: lowering the backing resolution (it changes the picture at every load) and a fixed 30 Hz cap (it degrades unloaded desktops and 120 Hz displays).

**Measurement page (decision 2026-11-07, CP7).** The hidden route `/bezeg-2.0/harness/collision-playground` stays. It is not linked from the app. It mounts the components without chapter chrome, and `playground=0` gives the no-component baseline that the containment script needs. Removing it would leave later pacing or renderer changes without a comparable baseline, and its cost is one lazy route chunk.

**Stops when unwatched.**

- The worker pauses when the document is hidden (`visibilitychange`) or the canvas is out of view (`IntersectionObserver`, threshold 0).
- It pauses after 120 s without interaction with the playground.
- It is terminated on unmount, which happens when the reader leaves the chapter or the section is collapsed. Unmounting leaves no worker, timer or listener.
- With `prefers-reduced-motion: reduce`, the playground starts paused and offers *Play* and *Step*.

**Drawing.**

- The worker posts at most one snapshot per completed step: positions and touching flags in transferable typed arrays, plus counters.
- The main thread draws the newest snapshot on a 2D `<canvas>` in one `requestAnimationFrame` callback and drops stale ones.
- Drawing is linear in \(n\), with no per-body DOM nodes, so the bottleneck the reader sees is the collision test and not the drawing.

**No worker, no simulation.** If `Worker` is unavailable or the worker fails, the playground shows a short static explanation with the counts for a fixed example. It never falls back to running steps on the main thread.

## Interaction and presentation

- **Canvas.** No axes or grid in *Run* mode. Elderflower palette from the graph style tokens: bodies in the neutral curve colour, touching bodies in the highlight colour with a ring as well as a colour change, so colour is not the only cue. Light and dark themes. The canvas is decorative to assistive technology (`aria-hidden`). The readouts carry the information.
- **Controls** (keyboard operable; 44 CSS px touch targets on coarse pointers):
  - a slider for the number of objects, on a logarithmic scale (10 … method limit);
  - a two-option switch: *test every pair* / *sweep and prune*;
  - *Play/Pause*, *Step*, *New arrangement* (new seed).
- **Readouts:** objects \(n\); box tests this step; for naive, the formula value \(\binom n2\); touching pairs; step time (ms); simulation speed (%). Counters update at most 4 times per second, so the numbers stay readable.
  - A polite live region announces only the result of a reader action, for example "1 000 objects, test every pair: 499 500 tests per step, speed 9 %", once the first step after that action completes. It never announces continuously.
- **Look underneath** (same component, `mode="inspect"`):
  - fixed small \(n\) (20, slider 5–40) so details are legible;
  - each body's \(x\)-interval drawn below the world, as on C1's number line, together with the current sweep position, the active list and the candidate pairs as thin connecting lines;
  - pairs removed by the \(y\)-test drawn differently from pairs that pass, using dash style and not only colour;
  - a step-through of one sweep, frozen in time;
  - a short caption with the count comparison and, here only, \(O(n^2)\) versus about \(O(n\log n+k)\) per step, where \(k\) is the number of candidate pairs.
- **Batch C (convexity placement):** polygon bodies. An overlay toggles box → hull → convex pieces. Readouts add how many pairs each stage removed.

## Chapter integration

- **Generalize the chapter playground block.** `PlaygroundContent` becomes `{kind: 'playground'; playground: 'bezier-drawing' | 'collisions'; mode: 'draw' | 'inspect' | 'run'}`, with the valid mode pairs typed. Update the Bézier chapter's four blocks mechanically.
- **Render it in `FamilyChapterPage.tsx`** as `ChapterPage.tsx` does: lazily loaded behind `React.Suspense`, and the worker is created only when the component mounts. This changes shared learning-runtime code, so it lands in its own commit (stream rules, shared files).
- **Prose.** Bilingual and one-shot ([one-shot text](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)) in `sweepChapter.ts`:
  - in `sweep-idea`, before the playground: one short invitation ("raise the number of objects and watch what happens to testing every pair"), with no mathematics;
  - in `interval-sweep`, around *Look underneath*: the link between box shadows and intervals, the \(\binom n2\) count, sweep and prune as a broad phase followed by an exact test, and a note that real engines also use grids and bounding-box trees.
  - `lessonMathNotation.test.ts` covers this prose and must pass.
- **Batch C** adds a block and prose in the convexity chapter's `convex-hull` section (hull as a proxy) and links from `hull-robustness`/`bezier-hulls` as fits. The exact sections are decided in CP9.
- **Routes and data.** No route, Demonstration, lesson, Preset or stored-data change. Batch B persists nothing. No breaking change.

## Terms (settled in CP6 by [choosing new terms](../localization.md#choosing-new-terms))

Searched `src/localization/sl.ts`, `src/learning/content/`, `GLOSSARY.md` and the localization terms table on 2026-11-07. No term of this feature existed there, so no established usage was overridden; one proposal changed because of a clash inside the repository. External sources (UL FMF/FRI pages, RUL theses, Termania) were not consulted in this pass: the terms below are the transparent standard wording and may be replaced if the owner prefers another.

| Slovenian | English | Basis |
| --- | --- | --- |
| trk; zaznavanje trkov | collision; collision detection | Standard computer-graphics wording; no repository term. |
| preizkus vseh parov | testing every pair (naive) | Transparent description; matches the sweep chapter's "preizkus vseh parov". |
| pometanje in obrezovanje | sweep and prune | Literal gloss of the English name on *pometalna premica* from the sweep chapter. English given on first mention in prose. |
| groba faza / natančna faza | broad phase / narrow phase | Standard literal translation; English gloss on first mention. |
| očrtani pravokotnik | bounding box | Changed from "očrtani pravokotnik (škatla)": *škatla* already means the probability chapter's box with balls, so the UI no longer says *škatla*. *Očrtani* follows *očrtana krožnica*. The UI says *preizkus pravokotnikov* for box test. |
| kandidatni par | candidate pair | Transparent; no repository term. |
| hitrost simulacije | simulation speed | Used in the UI. "Počasni posnetek" is not used. |
| test ločilne osi | separating-axis test | Batch C, not yet used. |
| razdelitev na konveksne dele | convex decomposition | Batch C, not yet used. |

Reused unchanged: *pometalna premica*, *stanje*, *interval* and *konveksna ovojnica* from the sweep and convexity chapters.

## Module boundaries

- `src/compgeo/collisions/` (pure): `world.ts` (seeded world, step), `broadPhase.ts` (naive, sweep and prune, counters), `narrowPhase.ts` (circles; batch C: SAT, hull and pieces), `polygonTemplates.ts` (batch C, using the exact kernels once per template).
- `src/learning/playground/collisions/`: `collisionWorker.ts` (host and message protocol), `collisionProtocol.ts` (typed messages, shared by both sides), `CollisionPlayground.tsx` (canvas, controls, readouts, lifecycle), `CollisionInspect.tsx`. These get `t` from `useT()`.
- No JSXGraph, scene store or graph-global state.

## Acceptance criteria

1. **Mathematics.**
   - For seeds 1–50 and \(n\in\{0,1,2,10,200,1000\}\) over 120 steps, both broad phases give identical touching-pair sets.
   - Naive box tests equal \(\binom n2\) exactly.
   - Sweep box tests are at most the naive count and fall below 10 % of it at \(n=1000\) on the default density.
   - Touching (distance exactly \(r_i+r_j\), and boxes sharing an edge) counts as touching in both methods.
   - Bodies never leave the world. After a step with no wall contact, momentum (sum of velocities) is unchanged.
   - Batch C: the hull contains every template vertex; the pieces are convex and tile the template (area sum equals the shoelace area exactly on the grid); the box → hull → pieces pipeline gives the same touching set as testing every piece pair directly.
2. **Containment (owner requirement), measured on the production build with Chromium:**
   - With naive at its limit running for 10 s, the Long Animation Frames API attributes no frame over 50 ms to playground code on the main thread.
   - Scrolling the page and activating a link outside the playground respond with p95 ≤ 100 ms, on desktop and on the 4× throttled 390×844 profile.
   - Switching from naive to sweep at the naive limit takes effect within one naive step (≤ 250 ms on the reference profile).
3. **Bounded cost.** CP3 records the measured limits in this spec. Hiding the tab, scrolling the canvas out of view, or 120 s without interaction pauses the worker (zero steps over the next 2 s). Unmounting terminates it.
4. **Smoothness.** Sweep and prune at its limit keeps a main-thread draw median ≤ 16.7 ms on desktop and ≤ 33.3 ms throttled. A miss goes to the owner before release.
5. **Interaction and accessibility.**
   - Every control works with keyboard alone and with touch at 390×844.
   - Readouts update and are named.
   - The live region speaks only after reader actions.
   - Reduced motion starts paused.
   - Touching is visible without colour.
   - The no-worker fallback renders without errors.
6. **Lifecycle.** After unmounting: no live worker, no timer, and no listener on `window`, `document` or the observer. Remounting starts cleanly.
7. **Localization.** All copy in `sl.ts` and `en.ts` in lockstep. Live language switching updates controls and readouts. `npx tsc --noEmit --pretty false` and the production build pass. New terms are recorded with sources.
8. **Chapter.** Both blocks render in their sections in both languages. Bézier chapter blocks and existing chapter tests are unchanged in behaviour. A smoke test covers `/bezeg-2.0/learn/sweep-algorithms` in both languages, and batch C covers `/bezeg-2.0/learn/convexity-hulls`.
9. **Docs.** Capabilities, UI functionality and the sweep spec mention the playground. ADR 0042 is accepted. The performance plan links the recorded measurements.

## Release batches

| Batch | Contents | Release condition |
| --- | --- | --- |
| A (foundation) | Pure model and broad phases; worker host and protocol; measured limits | Criteria 1 (circles), 3, 6 for the worker; nothing learner-visible |
| B (sweep chapter) | *Run* and *Look underneath* components; shared playground block; sweep chapter prose and terms | Criteria 1–9 for circles; smoke in both languages |
| C (convexity chapter) | Polygon templates, hull and SAT narrow phase, decomposition; overlay; convexity chapter block | B released; criteria 1–8 for polygons |

## Out of scope

Collision response between objects, rotation, continuous collision detection for fast objects (Bentley–Ottmann on motion paths, a candidate for later), spatial grids and bounding-box trees beyond a sentence of prose, 3D, closest pair, saving settings or arrangements, and a main-thread fallback. The town-map opener is parked in the research note.
