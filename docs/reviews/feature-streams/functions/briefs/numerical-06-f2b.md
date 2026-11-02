# Brief handoff-v12: numerical methods 06 F2b (register the quadrature Demonstration)

- **Role:** implementation; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push or delegate. Another worker concurrently builds the projective K5 graph (`src/graphs/projective/`, `PresetImport.ts`, `projective_*` keys): do not touch those. Edit `sl.ts`, `en.ts` and `PresetCatalog.test.tsx` only with targeted Edit calls (if an Edit fails because the text moved, re-read that region).
- **Goal:** the route, the Analysis-family catalog entry and the Demonstration registration for `QuadratureGraph` (accepted in `1c3d7368`), under ADR 0023 §4 (Analysis family) and `docs/tasks/numerical-methods/06-batch-b.md` (F2b). Existing routes, Demonstrations and stored Presets stay valid; the new route is an addition.
- **Pattern to copy exactly:** the Batch A root-finding registration commit `c5e75f50`. Run `git show --stat c5e75f50`, then read its diff file by file. It touches `src/demonstrations.ts`, `src/graphs/graphFactories.ts`, `src/demonstrationPosterPending.ts`, `scripts/demonstration-preview-recipes.cjs`, `src/learning/model.ts`, the count/route tests (`Routes.test.tsx`, `demonstrations.test.ts`, `DemonstrationsPage.test.tsx`, `familyChapters.test.ts`, `lessonCatalog.test.ts`), the catalog title/description keys, and a graph-side change to `RootFindingGraph.tsx`; mirror that change in `QuadratureGraph.tsx`. Follow what Platform A10 left in place. Counts have changed since, so read the current values. Put the route next to root finding (check how `/analysis/root-finding` is named), e.g. `/analysis/quadrature`.
- Remove `"quadrature"` from `PENDING_ROUTE_KEYS` in `src/graphs/base/presets/PresetCatalog.test.tsx` and update the test the way `c5e75f50` did for root finding.
- Media (poster, preview clip) belong to F5: use the pending-poster mechanism as root finding did.

## Checks

- `npx tsc --noEmit --pretty false` (report errors outside your files), eslint on touched files.
- `just unit src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/graphs/functions src/graphs/base/presets src/localization` (logs to files), then `just build`.
- An observed pre-change failure for the new route/registration assertions (the counts and the route test fail without the registration).

## Return

≤ 250 words: files changed, the route, checks with log paths, observed failures, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/n06b/`. Budget: grep before reading, ≤150 lines per read. On `HANDOFF` or after about 20 turns, write a handoff note to `docs/reviews/feature-streams/functions/worker-numerical-06-f2b-handoff.md` and return partial.
