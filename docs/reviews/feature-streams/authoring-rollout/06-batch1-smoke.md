# Task 06 batch 1 browser smoke (B-spline family-local registration)

## Run details

- Checkout: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-authoring-rollout`
- HEAD: `beb539aa`; working tree dirty (includes another worker's uncommitted Interpolation/Hermite/SubdivisionCurve edits, which were built in and ignored)
- Build: `just build` passed (7.3 s), provenance dirty at build time, warnings present (see the build log in `.command-logs`)
- Preview type: production build served by `just smoke-built`, which starts and disposes its own loopback preview
- Port: `SMOKE_PORT=4331`. Port 4323 was held by PID 19508, which was not touched.
- Browser: Playwright Chromium, 1 test slot, 5 workers, desktop viewport for the route checks and 390x844 for the English lesson walks
- Elapsed: about 4 minutes of smoke time
- Cleanup: the preview released port 4331 (only TIME_WAIT sockets remain). No source files, commits or presets were changed; the smoke specs create and remove their own temporary data.

## Results

| Check | Selection | Status | Evidence |
| --- | --- | --- | --- |
| Direct load of six routes, heading, board and inspector, no console errors | `bspline-basis`, `-deboor`, `-insertion`, `-extraction`, `-nurbs`, `-blossom` in `demonstrations.smoke.spec.cjs` | Passed (6/6) | Each `bspline-* renders its heading, graph, and inspector` test passed. The spec fails on runtime errors. |
| Guided lesson walk, sl desktop, every frame in order | `Lesson bspline-*` sl walk, six rows | Passed (6/6) | Each row walked to completion with pointer Next clicks, in exact frame order |
| Guided lesson walk, en 390x844, Next/Exit placement, no overflow, math inside viewport | `Lesson bspline-*` en walk, six rows | Passed (6/6) | Each row passed |
| Catalog page lists 6 B-spline cards in order, family posters and links | `the catalogue shows every demonstration in teaching order...` | Passed | The spec checks every card's title order against the catalog source, plus poster, family label and link. Order is also unchanged from HEAD: the same six ids sit in the same sequence (`git show HEAD:src/demonstrations.ts`). |
| Deep link with query and hash, refresh, Exit | `production deep links retain filters...` | Passed | Covers bezier, not a B-spline route |
| Preset save, change and reopen | `saving, changing, and reopening a preset...` | Passed | Covers Bezier only, not a B-spline route |
| Learn chapter examples return to owning section | `Learn opens chapters whose Guided examples return...` | Passed | Covers chapters generally, not the B-spline examples specifically |
| Unknown path `/bezeg-2.0/bspline/<unknown>` shows not-found handling | No spec for this path | Not covered | The existing unknown-route check uses `/bezeg-2.0/not-a-demonstration` only |

Total filtered run: 20 passed (first run), plus 2 passed (second run).

## Coverage gaps

- **Refresh** on each B-spline route: not covered. The per-route specs load directly and do not reload.
- **Query/hash variants** on B-spline routes: only `?learn=1` is exercised, via the lesson walks. No other query or hash variant was tested on these routes.
- **Unknown path under `/bezeg-2.0/bspline/`**: not covered. No spec exercises it, and the worker has no ad hoc browser access to check it.
- **Preset menu on a B-spline route**: not covered. The existing preset spec runs on Bezier only. The Preset menu has not been opened or loaded on any of the six routes.
- **Return to the exact lesson section** for the B-spline examples: the walks reach completion, but no Exit/re-entry check runs for these rows. Only `EXIT_SAMPLE` rows get that check, and no B-spline row appears in it.
- **Catalog family position**: the spec checks card order against the catalog source. It does not hard-code the family's position on the page, and the in-app position was not separately observed.
- **Console errors**: enforced by the existing specs. No separate console-log capture was run.
- **Demonstration interaction** (dragging, sliders, NURBS weights): not tested, since the specs check render only.
- **Not tested**: the Interpolation, Hermite and SubdivisionCurve edits belonging to another worker.

No new spec was written. The worker had no ad hoc browser access (only the `just` recipes), so the uncovered checks above remain open for the handler to decide.
