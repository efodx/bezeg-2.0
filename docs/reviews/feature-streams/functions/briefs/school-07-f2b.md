# Brief handoff-v12: school function graphs 07 F2b (register the geometric-series and conic-focal Demonstrations)

- **Role:** implementation (`bezeg-worker`, Sonnet 5.5 `medium`). You may edit in `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-functions` (branch `stream-functions`). Do not commit, push, stash or delegate. You are the only editor. Edit `sl.ts`, `en.ts` and `PresetCatalog.test.tsx` only with targeted Edit calls.
- **Goal:** add routes, Functions-family catalog entries and Demonstration registration for `GeometricSeriesGraph` (commit `10b38dc5`) and `ConicFocalGraph` (F2a-2, the latest commit on this branch), under ADR 0026 §3 (Functions family) and `docs/tasks/school-function-graphs/07-batch-c.md` (F2b). Existing routes, Demonstrations and stored Presets stay valid; the new routes are additions.
- **Pattern to copy exactly:** the 06 F2b registration commit `b5cad33f`. Run `git show --stat b5cad33f`, then read its diff file by file and mirror every part for the two new graphs: demonstrations registry, factories, pending posters, preview recipes, count/route tests, catalog title/description keys, the graph-side change and host tests, and the file contract. Counts have changed since; read the current values.
- **Routes and titles:** routes after `/functions/rational-functions`: `/functions/geometric-series` (id `geometric-series`) and `/functions/conics` (id `conic-focal`; keep the id equal to the Preset collection key, as 06 did). Titles: SL *Geometrijska vrsta in delne vsote* / *Stožnice: gorišče, vodnica, izsrednost*; EN *Geometric series and partial sums* / *Conics: focus, directrix, eccentricity*. Adjust only to fit the catalog's length conventions.
- Remove `"geometric-series"` and `"conic-focal"` from `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`, as `b5cad33f` did. Use the pending-poster mechanism (media is F5) and `lesson: false` until F3.

## Checks

- `npx tsc --noEmit --pretty false`, eslint on touched files.
- `just unit src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/graphs/functions src/graphs/base/presets src/localization` (logs to files), then `just build`.
- Report an observed pre-change failure for the new route/registration assertions.
- **Browser checks on the production preview (port 4315)** with `scripts/function-browser-perf.cjs`; extend it by targeted edits for the new routes:
  - S5: playback frame times at n = 50 (median/p95); a screenshot at 1280×720 and at 390 px width of a=5, q=1, n=50, checking whether the top-right caption overlaps tall bars.
  - S6: ε-slider sweep frame times on the hyperbola and ellipse; a screenshot of the hyperbola with both branches and the 50-unit cut, and of the bridge example with captions.
  - Save the screenshots under the log dir and report their paths. If this takes more than about 8 turns, stop and report it as not done.

## Return

≤ 300 words: files changed, the routes, checks with log paths, observed failures, frame numbers, screenshot paths with what you saw, and open questions. Logs go to `C:/Users/1337Hacker/.claude/jobs/dc88fd22/tmp/s07/`. Budget: grep before reading, ≤ 150 lines per read. On `HANDOFF` or after about 30 turns, write a handoff note to `docs/reviews/feature-streams/functions/worker-school-07-f2b-handoff.md` and return partial.
