# Brief handoff-v12: school function graphs 06 F2b (register the polynomial-zeros and rational-function Demonstrations)

- **Role:** implementation; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push or delegate. You are the only editor. Edit `sl.ts`, `en.ts` and `PresetCatalog.test.tsx` only with targeted Edit calls.
- **Goal:** routes, Functions-family catalog entries and Demonstration registration for `PolynomialZerosGraph` (commit `57b30256`) and `RationalFunctionGraph` (commit `ed2d95b0`), under ADR 0026 §3 (Functions family) and `docs/tasks/school-function-graphs/06-batch-b.md` (F2b). Existing routes, Demonstrations and stored Presets stay valid; the new routes are additions.
- **Pattern to copy exactly:** the Batch A registration commit `f63ddc82` (S1/S2 part only; ignore Fourier). Run `git show --stat f63ddc82`, then read its diff file by file: `src/demonstrations.ts`, `graphFactories.ts` if touched, `src/demonstrationPosterPending.ts`, `scripts/demonstration-preview-recipes.cjs`, `src/learning/model.ts` if needed, the count/route tests (`Routes.test.tsx`, `demonstrations.test.ts`, `DemonstrationsPage.test.tsx`, plus `familyChapters.test.ts`/`lessonCatalog.test.ts` if counts there change), catalog title/description keys, and the graph-side change to `FunctionTransformationGraph.tsx` with its host test; mirror that in both new graphs. Counts have changed since; read the current values. Routes after `/functions/inverse`: `/functions/polynomial-zeros` and `/functions/rational-functions` (check the naming of the Batch A routes and keep it consistent). Titles: SL *Ničle polinoma in večkratnost* / *Racionalne funkcije: ničle, poli, asimptote*; EN *Polynomial zeros and multiplicity* / *Rational functions: zeros, poles, asymptotes* (adjust only to fit the catalog's length conventions).
- Remove `"polynomial-zeros"` and `"rational-function"` from `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx` and update that test the way `f63ddc82` did.
- Media (posters, preview clips) belong to F5: use the pending-poster mechanism as Batch A did. `lesson: false` until F3.

## Checks

- `npx tsc --noEmit --pretty false`, eslint on touched files.
- `just unit src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/graphs/functions src/graphs/base/presets src/localization` (logs to files), then `just build`.
- An observed pre-change failure for the new route/registration assertions.
- Browser frame measurement F2a deferred to the route: run the browser cases named at the end of the ADR 0026 measurement addendum (`docs/adr/0026-school-function-catalogue.md`) on the production preview (port 4315) with the existing perf script the projective slice used (`scripts/projective-browser-perf.cjs`, adapt by copy only if it cannot target these routes; report which). If that takes more than about 6 turns, stop and report it as not done.

## Return

≤ 300 words: files changed, the routes, checks with log paths, observed failures, frame numbers, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/`. Budget: grep before reading, ≤ 150 lines per read. On `HANDOFF` or after about 25 turns, write a handoff note to `docs/reviews/feature-streams/functions/worker-school-06-f2b-handoff.md` and return partial.
