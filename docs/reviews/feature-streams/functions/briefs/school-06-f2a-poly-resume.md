# Brief handoff-v12: school function graphs 06 F2a-1 resume (polynomial-zeros graph, S3: verification)

- **Role:** tests, checks and fixes; edit permission in `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. You are the only editor.
- **Start here:** the original brief `docs/reviews/feature-streams/functions/briefs/school-06-f2a-poly.md` (its Checks and Return sections are your acceptance) and the previous worker's note `docs/reviews/feature-streams/functions/worker-school-06-f2a-poly-handoff.md` (state, decisions, shared interface, remaining steps). The implementation is written and uncommitted (`git status`). The handler ran `npx tsc --noEmit --pretty false` at this state: clean, 0 errors.
- **Do:** review the written code against the original brief only as far as the tests need, then write the model tests (`src/analysis/zeroListModel.test.ts`, `polynomialZerosModel.test.ts`), the Preset collection test additions, the host test `PolynomialZerosGraph.host.test.tsx` (including the synchronous multi-action scene), and fix what they expose. Check the `src/learning` name-union tests still pass after the `model.ts` additions. Add the new Slovenian terms (*obnašanje v neskončnosti*, *enojna/dvojna/trojna ničla*, *presečišče z osjo y*) to the localization table in `docs/localization.md` the way the S1 slice did (`git show 629a471d -- docs/localization.md`), with their basis.
- **Checks:** `npx tsc --noEmit --pretty false`; `npx eslint` on touched files; `just unit src/analysis src/graphs/functions src/graphs/base/presets src/localization src/learning` (logs to files; never bare `npx vitest`; not the full suite); four mutations as listed in the original brief.

## Return

≤ 400 words as in the original brief (files, checks with log paths, mutation evidence, fixes made as `file:line`, the shared interface for the S4 worker confirmed or changed, open questions). Logs to `C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/`.

Budget: locate before reading; read ≤ 150 lines per call; test output to log files. On `HANDOFF` or after about 30 turns, append your state to the handoff note above under a new heading and return as partial.
