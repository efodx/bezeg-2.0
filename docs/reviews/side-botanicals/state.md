# Side botanicals: state

Updated 2026-11-13. Spec: [side botanicals](../../specs/side-botanicals.md). Tasks: [docs/tasks/side-botanicals](../../tasks/side-botanicals/README.md).

## Done (on master)

Step 1 shipped in five pushes: elder branches in the gutters of Home, Demonstrations and Learn at 1600px and wider; branch sway (1°), head bob (2°) and individual floret shimmer; reduced motion stops all motion; corner sprig hidden at 1600px and wider. Density is fixed at the owner's choice of the 2048px look (three branches per side, four heads each). Size grows with the square root of the gutter width.

## Code map

- `src/sideBotanicals/elderGeometry.ts`: pure seeded geometry and `ELDER_SETTINGS` (owner's end state, seed 3).
- `src/sideBotanicals/growth.ts`: pure growth (load ramp, scroll goal, visit maximum) and the scroll-listener driver that writes `--growth`.
- `src/sideBotanicals/gutters.ts`: gutter widths from the measured content column (`data-content-column` on the three page roots).
- `src/sideBotanicals/SideBotanicals.tsx`: width gate, column measurement, `fitToGutter`, rendering. `SideBotanicals.css`: growth, sway keyframes, clipping, reduced motion.
- `src/App.tsx`: route gate.

## Working agreements with the owner

- The owner reviews a running preview (`just build` then `just preview`) before every push.
- The owner prefers continuing in one session over handoffs.
- The art prototype lives outside the repository: `C:\Users\1337Hacker\Desktop\bezeg-side-botanicals-mockup\playground.html`, served with `npx http-server <folder> -p 4380 -c-1`.

## Not yet on master

Step 2 (growth on scroll, `6256c695`) and the measured column (`cca41e8c`) are committed on the `worktree-side-botanicals` branch with their docs. Checks and browser results: [verification](verification.md).

## Next

Owner decision 2026-11-13 (spec decision 15): no growth on scroll; the branches grow to full size once on load. Implemented on the branch.

1. The owner reviews the preview (`just build`, then `just preview`), then `just publish --recipe runtime`.
2. The owner decides whether the playground becomes a dev-only route or script in the repository.
