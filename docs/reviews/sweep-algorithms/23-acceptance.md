# Task 23 (Fortune graph and beach-line measurement): acceptance

Accepted 2026-11-03 by geometry handler 44. Source: [task 23](../../tasks/sweep-algorithms/23-fortune-graph.md). Commit `dd7578f4`, squashed from worker branch `worktree-agent-ad42460681997836f` (`752b54e6..b3c63b82`). Worker notes: [23a-handoff.md](23a-handoff.md) and [23b-handoff.md](23b-handoff.md).

## Decisions taken in the slice

- **Steps are pop groups.** Step 0 shows the filled queue. Each later step is one group of events popped together, and the last step is `done`. Inside a group the status is not yet a beach line, so the groups are what the graph shows. The class comment states this.
- **Beach line: one polyline, chosen by [measurement](23-perf.md).** The measurement used Chromium at 1440×900, the 12-site random preset, and a site dragged for about 3 s.
  - Per-arc curves: median 16.7 ms, p95 16.8 ms, max 33.3 ms.
  - Polyline: median 16.7 ms, p95 16.7 ms, max 16.8 ms.
  - Both medians are at the frame cap. The polyline is one board object instead of 11, so the per-arc path was removed.
  - The perf run used a temporary, uncommitted `/compgeo/fortune` route. The real route is registered in task 24.
- **Shared follow box.** The follow box became the shared `followBox.ts`, used by both `VoronoiGraph` and `FortuneGraph`. It moves the Voronoi logic unchanged, as the engineering review confirmed.
- **Global `.visually-hidden` rule** in `src/index.css`. Before it, the screen-reader-only text in the sweep graphs, Fortune included, rendered visibly, because the only rule was scoped to number-input labels. The worker checked every usage of the class: all are screen-reader-only text.
- **`PointSetGraph.pointName(index)`.** This is a protected hook that defaults to `P{n}`, so the sites can read A, B, C.

## Evidence

- **Defect found by the measurement:** `fortuneBox` threw a `RangeError` on the random 12-site set. Fixed, with a 30-seed regression test.
- **Mutation logs:** [23a-mut1–5](23a-mut1.log), [23b-mutations.log](23b-mutations.log), [23c-mut-resetview.log](23c-mut-resetview.log) and [23d-mutations.log](23d-mutations.log). They cover:
  - the drawing geometry: origins, height-text collapse, box containment;
  - the step tests and the queue (strike-through plus text);
  - the live region, in sl and en, and quiet during a drag;
  - keyboard stepping;
  - `drawingStats` equal to `VoronoiGraph`;
  - the follow view and its inset;
  - Reset view, which must restore the board view;
  - ownership: scene replacement, unmount, and handle identity across steps and drags;
  - refusals that name both sites.
- **Checks:**
  - before the push: `just check` at `dd7578f4` ([23-check.log](23-check.log));
  - on the worker branch: the focused unit, lint, tsc and build logs `23a-*`, `23b-*` and `23d-*`.

## Reviews

- **Mathematical (drawing geometry, `67098cc1`):** no defects. Every check agreed with the kernel over 3000 random runs:
  - the breakpoint formulas;
  - the half-edge origins;
  - the lower envelope;
  - the exact height text;
  - the box.

  The tests it asked for were added. The box skips circles with radius above 3·span, which come from near-collinear sites; they are drawn clipped by design, and a code comment says so.
- **Engineering:** no blocking defects. It asked for three tests: disposal on unmount, the refusal messages, and handle identity. All three were added, each with an observed mutation failure.
- **UI and accessibility (code reading):** no blockers. Repaired:
  - the global `.visually-hidden` rule;
  - the live region is always mounted;
  - no announcements during a drag;
  - no `aria-label` on queue items;
  - horizontal scroll for the LaTeX height line.

## Not verified, carried to task 24

The browser check at 1280×720 and 390×844 needs the route that task 24 registers. Task 24's smoke must cover:

- the Fortune readouts;
- the queue at 390 px;
- one existing sweep graph (Monotone partition), to confirm its screen-reader-only text is now hidden and nothing visible was lost.

The perf measurement ran headless on one machine, with no CPU throttling.
