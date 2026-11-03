# Brief (handoff-v12): T3 task 20 continuation (20b)

- **Role:** implementation continuation, edit permission in the existing worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\agent-a6cad592b3cce9bc2` (branch `worktree-agent-a6cad592b3cce9bc2`, WIP commit `97095256`; `node_modules` junction should exist, else create it per the original brief). Work only there; do not push or delegate.
- **Read first:** `docs/reviews/triangulation-voronoi/20-handoff.md` in that worktree (state), then the original brief `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry\docs\reviews\triangulation-voronoi\20-brief.md` (all rules still apply). Do not reread the spec or the whole graph unless a failure needs it.
- **Remaining:**
  1. Run the new tests (`degenerateSites.test.ts`, `DegenerateSitesGraph.host.test.tsx`) and fix failures.
  2. Mutation checks for every new assertion group, at least: the determinant taken in clockwise order, a degree-4 vertex not merged, the collinear branch leaving a blank board (no message), an unknown `mode` accepted on import, a duplicate not refused. Observe each failing, revert, and confirm byte-identical restore with `cmp` against a backup.
  3. Checks, one at a time, logs to `docs/reviews/triangulation-voronoi/20-*.log`: `npx tsc --noEmit --pretty false`; eslint on every touched `.ts`/`.tsx` including `src/localization/sl.ts` and `en.ts`; `just unit src/graphs/compgeo src/localization --maxWorkers=2`; `just build`.
  4. Make one final commit on top of the WIP with the brief's commit message (do not amend or squash).
- **Return (≤250 words):** final commit hash; check results with test counts; mutation evidence (mutation → failing test name); anything left open, flagged `file:line`.
- **Budget:** read ≤150 lines per call; on `HANDOFF` or past about 30 turns, stop, update `20-handoff.md`, commit, and return partial.
