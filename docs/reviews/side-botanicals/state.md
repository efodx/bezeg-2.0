# Side botanicals: state

Updated 2026-11-13. Spec: [side botanicals](../../specs/side-botanicals.md). Tasks: [docs/tasks/side-botanicals](../../tasks/side-botanicals/README.md).

## Done (on master)

Step 1 shipped in five pushes: elder branches in the gutters of Home, Demonstrations and Learn at 1600px and wider; branch sway (1°), head bob (2°) and individual floret shimmer; reduced motion stops all motion; corner sprig hidden at 1600px and wider. Density is fixed at the owner's choice of the 2048px look (three branches per side, four heads each). Size grows with the square root of the gutter width.

## Code map

- `src/sideBotanicals/elderGeometry.ts`: pure seeded geometry and `ELDER_SETTINGS` (owner's end state, seed 3).
- `src/sideBotanicals/SideBotanicals.tsx`: width and route gates, `fitToGutter`, rendering. `SideBotanicals.css`: sway keyframes, clipping, reduced motion.
- `src/App.tsx`: route gate and the hard-coded column width (to be replaced by task 2).

## Working agreements with the owner

- The owner reviews a running preview (`just build` then `just preview`) before every push.
- The owner prefers continuing in one session over handoffs.
- The art prototype lives outside the repository: `C:\Users\1337Hacker\Desktop\bezeg-side-botanicals-mockup\playground.html`, served with `npx http-server <folder> -p 4380 -c-1`.

## Next

Task 1 (growth on scroll), then task 2 (measured column), then task 3 (verification and docs).
