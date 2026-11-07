# CP5 notes: Look underneath

## Decisions

- Main thread, no worker. CP3 measured one step at n = 100 on the 4x throttled profile at 0.03 ms (naive) and 0.005 ms (sweep), far below the 1 ms bar at n <= 40 (docs/bezier-performance-results.md, "Collision playground step cost"). The comment is at the top of `CollisionInspect.tsx`. The pure model is used directly; `broadPhase.ts` is unchanged (`traceSweep` needed no new export).
- `sweepTrace.ts` (pure): `traceSweep(bodies, initialOrder?)` copies the persistent order, runs the same stable insertion sort and the same strict exit test, and emits `leave`, `box-test`, `candidate` or `y-rejected`, then `enter`, per inserted body. Each event carries `x` (the inserted body's x_min), `body` and `other` (-1 for enter and leave). A `leave` is emitted when the removal is noticed, so its `x` is the sweep x of the body being inserted. `replaySweep(events, applied)` derives active list, decided pairs, box-test count and sweep x for the step-through.
- Step-through state is one integer (`applied`, events shown). Previous, Next and the overlays are all derived from the trace of the live world; Play shows the whole trace each frame (fixed 1/60 s steps from the rAF clock, at most 5 per frame), Pause keeps the end of the trace.
- Drawing: SVG, not canvas. n <= 40 gives a few hundred elements, labels are real text, dashes are attributes. The viewBox is the measured pixel width (ResizeObserver, 640 fallback), so labels are 12 px at every width.
- Passing pairs are solid `--collision-touching`, y-rejected pairs dashed `6 4` in `--collision-body`; the legend repeats both. Colours come from the custom properties of `.collision-playground` (the component carries that class and imports its CSS). No `prefers-color-scheme` rules.
- Terms follow the sweep chapter's C1 lesson (`intervalsweep_*`): pometalna premica, Stanje (odprti intervali), vstop / izstop. Objects are numbered from 1 in the UI.
- Live region: polite, set only in Previous, Next, New, count change and the Play/Pause toggle; frames of Play do not speak; an alternating no-break space makes a repeated message audible.
- Slider: the shared Slider with step 1. A plain arrow is the native one-step range change; the number field reports its unchanged value on blur, so the count handler ignores an unchanged count (otherwise tabbing out of the field restarted the step-through; found by the keyboard test).
- Caption (plain text): box tests so far against n(n - 1)/2 and the O(n^2) versus about O(n log n + k) comparison, k being the candidate pairs.

## Mutation log (each new assertion seen failing)

sweepTrace: exit test `<` to `<=` fails the tie test; sort comparison `>` to `<` fails 9 equivalence/order tests. Equivalence tests alone do not catch the tie (random floats rarely tie), hence the explicit tie case.
Component: removing the dash on rejected lines fails "passing solid, rejected dashed"; dropping `atEnd` from Next's disabled fails the end-of-trace and Play tests; non-alternating live suffix fails the repeat-message test; `n*n/2` in the caption fails the count test; not showing the whole trace while playing fails the Play test.

## Harness

`/bezeg-2.0/harness/collision-playground` (query `inspect=0` hides the view, `inspectCount=30` sets its count). The inspect view is below the Run component.

## Not verified

Real-browser check at both widths (labels, dashes) is the handler's.
