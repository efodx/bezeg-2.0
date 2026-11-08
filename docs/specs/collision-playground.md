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

**World.** A rectangle \([0,W]\times[0,H]\) with \(W:H=16:10\). It holds \(n\) bodies. Batch B bodies are circles with centre \(c\), radius \(r\) and velocity \(v\). A seeded pseudo-random generator places them, so a seed and \(n\) reproduce the same world in tests and on every device. The world is \(1600\times1000\) units. Radii scale with \(1/\sqrt n\) so that bodies cover 1.25 % of the area at every \(n\) (radii 0.75–1.25 times the base radius), and about 5 % of bodies touch at any \(n\). *Decision (handler, 2026-11-07, CP1):* a fixed radius sparse enough for \(n=1000\) would be under one pixel on a desktop canvas and would leave small worlds empty; constant density keeps one picture as \(n\) grows, so the comparison shows only the change in work. Speeds are 30–120 units/s.

**Step.** Fixed simulated time \(\Delta t=\tfrac1{60}\) s per step. Move \(c\mathrel{+}=v\,\Delta t\). Reflect off the walls by reversing the velocity component and mirroring the overshoot. Then find the touching pairs:

- **Bounding box** of a circle: \([c_x-r,c_x+r]\times[c_y-r,c_y+r]\), closed.
- **Broad phase**, producing candidate pairs whose boxes overlap:
  - *naive*: every pair \(i<j\), with one box test each, so exactly \(\binom n2\) box tests;
  - *sweep and prune*: keep the bodies sorted by \(x_{\min}\) between steps and re-sort with insertion sort (nearly sorted after a small move, so close to linear). Sweep in that order with an active list. A body leaves the list when its \(x_{\max}\) is less than the current \(x_{\min}\). The current body is box-tested against each body still active. Ties follow C1: touching counts as overlapping, so entries come before exits.
- **Narrow phase** for candidate pairs: circles touch when \(\lVert c_i-c_j\rVert^2\le(r_i+r_j)^2\).

**Counters** (per step): box tests in the broad phase, candidate pairs, narrow tests, touching pairs, and step time in milliseconds measured with `performance.now()`.

**Invariant.** For the same world, both broad phases yield the same set of touching pairs. They differ only in work done.

**Batch C bodies** are polygon *templates* authored on grid points. Each is scaled by one common factor and translated, never rotated, so its hull and pieces are computed once per template. *Decisions (handler, 2026-11-08, CP8):*

- **Templates.** Seven fixed simple polygons on grid points, counter-clockwise, at most 12 vertices, no collinear consecutive vertices, each with its bounding box centred at the origin (so a body's box is \([x-h_x,x+h_x]\times[y-h_y,y+h_y]\)). Listed as vertices / hull / pieces: L 6/5/2, U 8/4/3, chevron 6/3/2, dart 4/3/2, notched four-point star 8/4/4, comb 12/4/6, convex hexagon 6/6/1. The hexagon is convex, so the hull stage visibly removes nothing for it. They live in `src/compgeo/collisions/polygonTemplates.ts`.
- **Computed once per template**, with the exact kernels on the integer template: the hull is the final hull of `monotoneChainTrace` (collinear points dropped); the triangles come from `earClippingTrace`; the convex pieces come from Hertel-Mehlhorn, removing a diagonal when both of its endpoints stay strictly convex in the merged piece, decided with exact `orient` (strict, so no piece gets a collinear vertex). Per hull and per piece: the vertex list and the integer edge normals \((-\Delta y,\Delta x)\).
- **Size.** One scale \(s\) per world, equal for every body (the templates differ in size), chosen so that \(n\,s^2\,\bar A=0.0125\,WH\), with \(\bar A=19.43\) the mean template area in template units squared (`POLYGON_MEAN_AREA`). So \(s\approx10.1\) at \(n=10\) and \(s\approx1.01\) at \(n=1000\); bodies cover the same 1.25 % as circles and have no per-body spread. A body's half-extents are \(h_x=s\cdot\)template \(h_x\), likewise \(h_y\); walls reflect on them.
- **Broad phase.** `BroadBodies` has half-extents `hx`, `hy`. For circles both alias the `r` array (one `Float64Array`, no copy); when absent they default to `r`, so circle results and costs are unchanged.
- **SAT.** Two convex polygons are separated when some axis among both polygons' edge normals gives a strictly positive gap; touching (gap 0) counts as touching, as for circles. The projection on an integer normal \(m\) is computed as \(s\,(m\cdot p)+m\cdot t\), with \(m\cdot p\) the exact integer projection of a template vertex \(p\) and \(t\) the body position.
- **Why the hull filter is sound.** The hull contains every template vertex, so for any integer \(m\) its extreme integer projection bounds every piece's. Rounding is monotone, so \(\mathrm{fl}(s\,q)+\mathrm{fl}(m\cdot t)\) is monotone in the integer \(q\): on the same axis every piece's computed interval lies inside the hull's. A strictly positive hull gap on \(m\) is therefore a strictly positive gap of every piece pair on \(m\). The piece test does not evaluate hull axes, so the pipeline, not the direct piece test, defines touching; the two agree exactly in exact arithmetic and can differ in doubles only for gaps at rounding scale (accepted in the CP8 mathematical review, 2026-11-08: adding hull axes to every piece test costs more and changes nothing a reader can see). The same argument shows the box contains every scaled vertex.
- **Pipeline.** box \(\to\) hull SAT \(\to\) piece-pair SAT, stopping at the first touching piece pair. Two bodies touch exactly when some piece pair touches (the pieces tile each template). A hull-stage rejection is decided on hull axes, which are not piece axes; with exact arithmetic it agrees with the piece test, and in doubles it can differ only where a gap is within rounding of 0 (the test compares the pipeline with the direct all-pairs piece test on seeded worlds).
- **Counters.** `StepCounters` gains `hullTests`, `hullPasses` and `pieceTests`, 0 for circles. For polygons `narrowTests` equals `candidates` and `hullTests`. The readouts derive removed pairs: box stage \(\binom n2-\text{candidates}\), hull stage \(\text{candidates}-\text{hullPasses}\), piece stage \(\text{hullPasses}-\text{touchingPairs}\).
- **API.** `createWorld({seed, count, shape?: 'circle' | 'polygon'})` (default `'circle'`); a polygon world also stores a per-body template index `Uint8Array` and the scale, and its `r` aliases `hx` (not a radius). `stepWorld` and `measureWorld` dispatch on the shape.

The narrow phase becomes *box \(\to\) hull separating-axis test \(\to\) pieces separating-axis test*. For a rendered animation, double precision suffices. The exact kernels run only on the integer templates, and the touching decision uses no tolerance beyond a test-asserted invariant (below).

## Containment

**Worker.** The simulation runs in a dedicated Web Worker (`collisionWorker.ts`, a thin host around the pure model). The main thread never runs a step. Commands are `init`, `setCount`, `setMethod`, `play`, `pause`, `stepOnce`, `reset` and `setOverlay`. They are applied between steps, so a command takes effect within one step.

**Slow motion, not lag.** Each step advances simulated time by exactly \(\Delta t\), however long it took to compute, with no catch-up loop. A step that takes 200 ms therefore shows as the world moving at \(\tfrac{16.7}{200}\approx 8\%\) speed. Work never piles up, and the readout shows the simulation speed as a percentage of real time.

**Bounded cost.**

- `setCount` is limited per method and device class. The naive limit is the largest \(n\) whose naive step stays at or below 250 ms on the reference low-end profile (desktop Chromium with 4× CPU throttling, 390×844). That is slow enough to see and short enough that switching back responds within a quarter of a second.
- The sweep limit is where a sweep step reaches 8 ms on the same profile, capped at 5 000.
- **Measured limits (CP3, 2026-11-07): 4 000 (naive) and 5 000 (sweep).** On the throttled profile the naive median step was 106 ms at \(n=3000\) and 317 ms at \(n=5000\); it grows as \(n^2\), so 250 ms falls near \(n\approx4400\), rounded down to 4 000. Sweep stayed at 2.8 ms (p90 4.1 ms) at \(n=5000\), so the 5 000 cap applies. Naive at 5 000 runs at about 5 % simulation speed throttled and 29 % on desktop, so the comparison still shows. Chromium cannot throttle a worker target through CDP, so the throttled column ran the same `stepWorld` on the page's main thread (desktop worker and main thread agree within 10 %). Raw tables: [performance results](../bezier-performance-results.md#collision-playground-step-cost--2026-11-07).
- **Polygon limits (CP9, 2026-11-08; lowered in CP10 to 3 000 naive and 3 500 sweep for drawing cost, see the next bullet).** CP9 values were 4 500 (naive) and 5 000 (sweep). Same rule and profile. On the throttled profile the polygon naive step was 275 ms at n = 5 000 and the quadratic fit crosses 250 ms near n = 4 960, so the limit is 4 500 (rounded down from the fit; neither 4 500 nor 4 960 was run itself); polygon sweep took 3.7 ms at n = 5 000, below 8 ms, so the 5 000 cap applies. `MAX_COUNT` is per shape and method, and `clampCount` takes the shape. Table and counters: [performance results](../bezier-performance-results.md#collision-playground-polygon-step-cost--2026-11-08).
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
- **Polygon drawing uses sprites (CP10, 2026-11-08).** Path2D loops of every vertex cost 85 ms (desktop) and 365 ms (throttled) per frame at 5 000 boxes, 496 and 2 144 ms with pieces. `polygonSprites.ts` rasterises each template once (fill plain or touching, plus the stage outline with its dash and width) per (unit, dpr, stage, colours) into a component-owned cache; a body costs one `drawImage` at a whole-pixel position, touching rings stay a Path2D of arcs. Outlines of overlapping bodies can now be covered by the later body's fill. Plain fills are composited per body rather than as one union, but two plain fills can only overlap where two bodies overlap, and such bodies are touching and drawn opaque in the touching colour, so the 0.85 alpha does not visibly stack. Measured after: desktop draw median about 6 ms; throttled 31 to 39 ms at 4 500 bodies (about 8.5 ms per 1 000 bodies), and naive at 4 000 still left throttled frames over 50 ms in the draw callback. The polygon limits were therefore lowered, for drawing rather than stepping, to 3 000 (naive) and 3 500 (sweep), which keeps sweep above naive. Decision by the CP10 handler instead of a further renderer change (an `OffscreenCanvas` in the worker would move drawing off the main thread but is a separate migration); the owner may revisit it. Results: `docs/reviews/collision-playground/cp10/`.

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
- **Batch C (convexity placement):** polygon bodies. An overlay toggles box → hull → convex pieces. Readouts add how many pairs each stage removed. Switching the stage does not announce, because it changes only the drawing and no count; the readouts stay visible. After a reader action the live region speaks the object count, the method, the box tests and the pairs removed by the boxes, the hulls and the pieces, from one snapshot.

## Chapter integration

- **Generalize the chapter playground block.** `PlaygroundContent` becomes `{kind: 'playground'; playground: 'bezier-drawing' | 'collisions'; mode: 'draw' | 'inspect' | 'run'}`, with the valid mode pairs typed. Update the Bézier chapter's four blocks mechanically.
- **Render it in `FamilyChapterPage.tsx`** as `ChapterPage.tsx` does: lazily loaded behind `React.Suspense`, and the worker is created only when the component mounts. This changes shared learning-runtime code, so it lands in its own commit (stream rules, shared files).
- **Prose.** Bilingual and one-shot ([one-shot text](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)) in `sweepChapter.ts`:
  - in `sweep-idea`, before the playground: one short invitation ("raise the number of objects and watch what happens to testing every pair"), with no mathematics;
  - in `interval-sweep`, around *Look underneath*: the link between box shadows and intervals, the \(\binom n2\) count, sweep and prune as a broad phase followed by an exact test, and a note that real engines also use grids and bounding-box trees.
  - `lessonMathNotation.test.ts` covers this prose and must pass.
- **Batch C** adds a block and prose in the convexity chapter's `convex-hull` section (hull as a proxy) and links from `hull-robustness`/`bezier-hulls` as fits. **Placement decided in CP9 (2026-11-08):** the block sits in `convex-hull` *after* the guided example, as `{kind: 'playground', playground: 'collisions', mode: 'polygons'}` with one invitation before it and a three-paragraph passage after it (hull as a cheap proxy, separating-axis test, convex pieces, what each stage removes). Reason: the section teaches the hull, and the example ends the reading, so the playground applies what was just learned instead of interrupting it; the section therefore no longer ends with its example (the tests allow that for this section, as for `interval-sweep`). `bezier-hulls` gets one linked sentence before its example pointing back to the block; `hull-robustness` has no link because robustness does not bear on the proxy. No route, Demonstration, Preset or stored-data change.
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
| test ločilne osi | separating-axis test | Batch C, used in the polygon passage of `convex-hull` with the English gloss on first mention. |
| razdelitev na konveksne dele | convex decomposition | Batch C, used in the polygon passage of `convex-hull` with the English gloss on first mention; the UI says *konveksni deli* for the stage. |

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
