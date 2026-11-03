# Geometry stream: handler handoff 44

Written 2026-11-03 by handler 44 (Opus 5.5, auto, effort medium). Continues [handoff 43](handler-handoff-43.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the prompt's objective was delivered (CI confirmation, task 22, task 23), and the context is too high to start task 24.

## Done this run

1. **Handoff 43 step 1.** `ecd629c2` is on `origin/master`, and its hosted CI run 41611833265 is green. The stream row records it.
2. **Sweep task 22 (Fortune kernel) accepted** ([record](../../sweep-algorithms/22-acceptance.md)). On master as `fa370a32` (kernel) and `5f4534e9` (lint); the docs commit `b6b4dc66` is green in CI run 41614323543.
   - A worker finished the open items: mutations (a) to (e) all observed failing, plus the cancel rule for cocircular sets.
   - **Doubles search.** It found a real case: exact rational ties between distinct circles become doubles one ulp apart and reverse the tie-by-\(x\) order. That case is now a pinned test.
   - **Mathematical review:** no defects. Its two test findings were added: a test pinning the tie convention, and a test of an exact hit at unequal heights.
3. **Sweep task 23 (Fortune graph) accepted** ([record](../../sweep-algorithms/23-acceptance.md)). On master as `a1912d06` (squashed) and `9669bc98` (docs). Before the push, `just check` passed at the pre-rebase `dd7578f4`, and tsc, the focused units and the build passed after the rebase.
   - **Beach line:** one polyline, chosen by measurement. Both approaches had a median of 16.7 ms; the polyline had no dropped frame and needs 1 board object instead of 11.
   - **Steps are pop groups.**
   - **Follow box:** now the shared `followBox.ts`, used by the Voronoi graph too.
   - **Global `.visually-hidden` rule** in `src/index.css`. Before it, screen-reader-only text rendered visibly in the sweep graphs.
   - **Reviews:** mathematical, engineering and UI/accessibility. All repairs were done, each new assertion with an observed mutation failure.
   - **Defect fixed:** `fortuneBox` threw a `RangeError` on the random 12-site set.
4. **Workers used:**
   - kernel finish: one Sonnet worker at high effort, returned complete;
   - 23a: two workers (one handoff), then 23b: one worker, returned partial at its budget;
   - one repair worker.

   Each Fortune graph slice needed about 135k tokens. Keep worker slices that small.

## Branch state

Branch `stream-geometry` equals `origin/master` at `9669bc98` plus this note. Hosted CI for `9669bc98` is green (run 41625482842).

`origin/stream-geometry` is stale (it was not force-pushed); master is the reference.

## Next steps, exactly

1. **Check hosted CI** for the latest master run containing the commit of this note (`9669bc98` itself is green). If it is red, read the failure first. If a unit test fails only on an `import.meta.glob` result, clear `node_modules/.vite/vitest` and `node_modules/.vitest-cache` and rerun before calling it a regression.
2. **Task 24 (Fortune registration)**, [24-fortune-registration.md](../../../tasks/sweep-algorithms/24-fortune-registration.md). Read its "Carried from task 23" section:
   - the browser check of the Fortune graph at 1280×720 and 390×844;
   - a check that the global `.visually-hidden` rule hides the screen-reader-only text of one existing sweep graph and loses nothing meant to be visible;
   - one perf rerun on the registered route.
   - The pattern is [18 S2 registration](../../../tasks/sweep-algorithms/18-s2-registration.md).
3. **Then task 25 (lesson C5)** and **task 26 (chapter section)**, then the **S3 F6** acceptance.
4. **Worktree cleanup still needs the owner.** Ask before acting. The list is in handoffs 40 and 41, plus 43's two entries. New this run:
   - `agent-ad42460681997836f` (Fortune graph worker branch, squashed onto master);
   - `agent-a4439a1de43c1003c` (kernel, now merged as squashed commits; handoff 43 said to keep it, and it is no longer needed);
   - the remote branch `origin/geometry-fortune-kernel-wip` (merged as squashed commits).

## Risks and lessons

- **Shared CSS.** The global `.visually-hidden` rule changes what renders in every component that uses the class. The worker checked every usage, but no browser check has run yet (step 2).
- **Live region.** `FortuneControls.tsx` calls `setAnnounced` during render (an adjusted-state pattern; lint passes). A drag that changes the clamped step is still announced, by design.
- **Large circles.** `fortuneBox` skips circles with radius above 3·span, which come from near-collinear sites. They are drawn clipped, by design.
- **Workers in existing worktrees** cannot run `cmd mklink`. Create a `node_modules` junction with Node: `fs.symlinkSync(target, path, 'junction')`.
- **Handler edits in another worktree.** The Edit tool needs a Read of the file first. A failed Edit left a mutation run meaningless once this run; it was rerun.

## Live processes

None, apart from this run's own watchers. All workers returned, and no preview is running (the 23a preview on port 4323 was stopped by its worker).

## Settings to keep

- **Handler:** Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- **Workers:** `bezeg-worker` (Sonnet), effort high for exact kernels and graphs, medium for repairs. At most two at once, watcher at 135k.
- **Reviews and smoke:** reviews use `bezeg-reviewer`; smoke uses `bezeg-smoke`.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 46" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor starts its own successor the same way and tells it to do the same.
