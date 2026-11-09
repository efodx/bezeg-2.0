# Wave 3 slice P2a brief: Euler, Epicycle and collision playback

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `p2a`. Decisions 56–58 apply (search `^56\.`); P1's result `w3-p1.md` shows how `PlaybackButtons` now takes optional Next and Reset, the `reduced-motion` reason and `data-playing`.

## Rows (from `w3-triage.md`)

C12-05 (Euler), C12-06 and C24-07 (Epicycle), C12-08, C12-09 and C24-06 (collision playground and Inspect).

## Owned paths

`src/graphs/functions/EulerGraph.tsx`, `src/graphs/functions/EpicycleGraph.tsx`, `src/learning/playground/collisions/CollisionPlayground.tsx`, `CollisionInspect.tsx` (and the collision loop file only if the pause rule needs it), tests beside them, `sl.ts`/`en.ts` shared. Read-only: `src/graphs/base/controls/PlaybackButtons.tsx` (report a needed change instead of editing it).

Two other workers run at the same time: P2b (trace policy: `tracePlayback.ts`, `IterativeFunctionGraph`, De Boor, SubdivisionCurve and compgeo imports) and V1 (Reset example, ComplexRoots, Pascal, `ChoiceSelect`, `PointCollection`). Do not touch their files.

## Work

1. **Euler** (decision 56): Next step and Show all stay a two-button group of `UnavailableButton`s with reasons (at the end: no more steps; Show all when everything is shown) instead of bare `aria-disabled`.
2. **Epicycle**: Play/Pause becomes `PlaybackButtons` without Next (add Reset only if the graph has a run reset today); reduced motion blocks Play with the reason if the graph animates without a static alternative check (record what it does today). Decision 57: a time-slider seek, a model edit and a mode change pause; display switches do not. Record today's behaviour first.
3. **Collision playground** (decisions 56, 58): Play, Step once and New arrangement become one `PlaybackButtons` group: Step once is Next (blocked with `playing` while playing, no native `disabled`), Play/Pause, no Reset; New arrangement is an `UnavailableButton` in the group's `children`. **Inspect**: Previous, Next, Play, New: `PlaybackButtons` with Next and Play, Previous as an `UnavailableButton` child (reason at the first step), New as a child. Keep the worker-driven loop and the `LiveReadout` muted while playing (decision 55). Decision 57: settings that change the arrangement or method pause; record the rest.

## Accepted visible changes

Those in decisions 56–58 only; list each in your return for *User impact*.

## Checks

Common checks plus the Euler, Epicycle and collision tests and any lesson tests that drive them (search their lesson action names). Name any e2e test under `tests/` that locates these buttons (do not run it).
