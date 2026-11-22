# Jank probe

Measures interaction smoothness on a built preview (production build, quiet machine, one run at a time).

```
node scripts/probe/probe.cjs --base http://127.0.0.1:4471/bezeg-2.0/ [--route <path>]... [--viewport 1440x900] [--throttle 4] [--json <file>]
node scripts/probe/summarize.cjs label=<file.json>...
```

- Default routes: Taylor, transformations, De Casteljau, phase portrait, and `analysis/taylor?lesson` (a `?lesson` suffix opens the lesson and steps Next x12, Back x3).
- Per route: slider drag, board pan (plain, then Shift), point drag, Play then a slider touch, lesson steps. Each action reports frame gaps (p95, max), long tasks, layout shift and value flicker; steps add glides, jumps, settle time and Back return.
- Thresholds live in `thresholds.cjs` (acceptance 6 of `docs/specs/ux-picks-app-wide.md`). Throttled runs (`--throttle`) double the frame limits and report long tasks without judging them.
- One line per non-ok check plus the frame lines; exit 1 when any threshold fails. `n/a` marks a metric whose subject is absent (card cover, puck width drift) or an action with no subject on the route.
- Baseline and noise on master: `docs/reviews/ux-picks-app-wide/measure/probe-baseline.md`.
