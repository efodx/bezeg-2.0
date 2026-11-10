# s6b evidence: playback slot on every playback route

## Routes switched (placement="graph" on the one primary group): 22 call sites, 34 inventory rows minus the lists below
Pilots (s6a, unchanged): fixed-point, decasteljau (also decasteljau2, rational-decasteljau via the shared controls/host).
Switched now: bisection, sequence, root-finding, geometric-series, clt, deboor, subdivision (curves), arc-length parametrization, epicycles, parametric roll; compgeo: convex-hull, hull-robustness (chain mode), bezier-hulls, bezier-clipping, ear-clipping, delaunay, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune, voronoi, voronoi-degenerate (inherited).

## Left inline
- `/analysis/euler-method`: own-built `EulerRevealButtons` (Next step, Show all; no Play, no run). Not a playback run; moving it onto `PlaybackButtons` would add a Play it must not have. Candidate for the slot only if the owner wants stepping beside the graph; proposal, not built.
- `/patches/tensor`, `/patches/triangular`: sweeps are lesson-only, no workspace control.
- Collision run/inspect playgrounds (CollisionPlayground, CollisionInspect) and lesson hosts: outside `DemonstrationWorkspace`'s slot; no `placement` passed (unchanged).

## Primary-group choices
Voronoi / degenerate: one `PlaybackButtons` (construction: Next, Play, Reset, plus Back as child); the mode select and site buttons are not playback and stay in the inspector. Hull-robustness: the chain-mode group only. Delaunay: only the construction group is `PlaybackButtons`; the triangle list `inspector-playback` is a button list, not a run. No graph has two `PlaybackButtons`; the second-claimant warning remains the guard.

## Live-control proposals (nothing built)
De Casteljau keeps t and speed sliders in the inspector (variant B). No other route's motion needs a live control beside the graph (none has a speed control). Arc-length param: the mover slider is disabled while playing, so it needs none either. Epicycles: the time slider halts playback; on a phone it stays in the inspector (proposal: move with the group if smoke shows it matters).

## Focus across the breakpoint
`PlaybackButtons.tsx`: group onFocus records the focused `data-action`; a layout effect on the claim flag refocuses the same action in the new location if focus fell to body. Tests in `PlaybackSlot.test.tsx` (focus kept both directions; unfocused group takes no focus). Limit: a stale record is only cleared when focus moves to another element, so blur to nowhere followed by rotation could refocus; the guard is that activeElement must be body.

## Tests
New `base/PlaybackRoutes.test.tsx`: real graph through GraphHost per family (bisection, ear clipping, parametric roll), media true: the one play button is in the slot; media false: in the inspector.
Observed failures (placement removed in the three graphs and the focus call removed, then restored): 3 route tests and the focus test failed (4 failed, 11 passed); restored files pass 15/15.

## Checks
`just unit` passed for src/graphs/base, functions, compgeo, curves (full directories); `just typecheck` passed (after fixing a type-only import in the new test); `just lint` on touched files passed. Logs `.command-logs/w3-s6b-*.log`.
Not verified: browser (390x844, 360x640) for the rolled-out routes; `DemonstrationWorkspace.*` not edited, no change needed found.
