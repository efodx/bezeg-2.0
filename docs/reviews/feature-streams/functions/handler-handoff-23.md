# Functions stream: handler handoff 23

Handler 23 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`, pushed to `origin/master` after each accepted step.

## Done this session

- Projective Batch B F3 on master: 07e K4 lesson (`84bc11eb` wip, `49badb11`, docs `1a204a9f`) and 07f K5 lesson (`f2596b13`, docs `95ee1bfe`). Mutations 6/6 (K4) and 4/5 (K5; the fifth is an equivalent mutant), reviews without blocking findings, `just smoke-lesson projective-five-point projective-three-views` passed.
- Projective 07g (F4 chapter sections) and 07h (F5 chapter cards) on master: `773365da`, `29730ac3`, plus the repair `1d595e3a` (`773365da` alone contains conflict markers in `src/learning/content/familyChapters.test.ts`; the repair commit message names its pre-rebase hash `5522a511`). Recheck before push at the pre-rebase equivalent: `just typecheck`, `node --test` on the two guided-example script tests, `just unit src/learning src/graphs/projective src/demonstrations.test.ts src/DemonstrationsPage.test.tsx` (408 s) all green; the final rebase brought in only `src/analysis/binomialNormalModel*` (curves).
- The curves stream's joint poster capture (`ffe0bc38`) captured posters for `projective-five-point`, `projective-three-views` and `quadrature`; `POSTER_PENDING` is empty. Numerical F5 needs no poster work.

## Next, in order

1. Projective 07i (F6 gate): the K4 equality with the rational chapter (Batch B release condition, spec K4 acceptance 1 and 7: the S6 weight and existing rational Demonstrations, routes and Presets unchanged), `just check`, browser smoke of the two routes and `/learn/projective-conics` (seven sections, five cards) in SL/EN with a live switch, CI. Follow Batch A F6 (`06-batch-a-release.md` F6 row, brief `briefs/projective-06-f6-smoke.md`). Rebuild before smoke.
2. Numerical Batch B F3 (lesson N4, add `quadrature-*` names to `scripts/generate-guided-example-inventory.cjs` `numericalExpectedFor`), F4, F5 (cards only), F6 (`docs/tasks/numerical-methods/06-batch-b.md`).
3. Then `school-function-graphs/06` and `fourier-series/05`.

## Open risks and deferred findings

- Visual (low, deferred in row 07h): chapter card captures stretch boards about 1.4× horizontally (the shipped K3 card shows it too), so the K5 card's source circle looks like an ellipse; the K5 label "L: y = 2" crosses the panel frame. Worth checking whether the stretch is the capture pipeline only or also visible in the app at some viewport, before F6 smoke signs off.
- Deferred (low): K4 steps 1–4 and K5 steps 1–2 show the same board; parabola K4 example has no step.
- Pushing while a worker edits: use a temporary worktree (`git worktree add --detach`, junction `node_modules`, remove the junction with `cmd /c rmdir` before `git worktree remove`). Master moves every few minutes; rebase and push immediately after a green check, and recheck when the incoming range touches `src`, `scripts` or `tests`.
- Resolution scripts: files are mixed CRLF/LF; detect per file, and never chain `git add` after a script that may have failed (that is how `5522a511` got its markers).

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium` with a 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Port 4315. Briefs this session: `briefs/projective-07e.md` to `projective-07h.md`. Worker logs under `C:/Users/1337Hacker/.claude/jobs/a3c6f72c/tmp/` (not durable).
