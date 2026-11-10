# Families-prep state note

Handler 2 handed off at BUDGET SOFT (2026-11-10, about 04:40Z). Successor: handler 3. Rewrite this note at each handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- PIK M-MAT-2026 text: `C:\Users\1337Hacker\AppData\Local\Temp\pik-2026\M-MAT-2026.txt`. If it is missing, re-download it from the expansion research's Sources.
- Commits are slow, so give them about 300 s.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <ids oldest first>`, then check `just publish --status`. It rebases onto `origin/master`, so the pushed hashes differ from the local ones.
- Edit files with Python or the Edit tool. A regex replacement string containing `\b` wrote a backspace once, in ADR 0048, which was then fixed.

## Done

- **F0, all 15 families:** ADRs 0044–0058, task folders, and Slovenian terms in each task README. #11 and #12 got Batch D rows in `docs/tasks/linear-maps/` (tasks 10–11) and `docs/tasks/complex-maps/` (tasks 08–09).
- **F1 accepted and committed:**
  - #1 trigonometry `src/trig/`;
  - #6 circle `src/compgeo/circleConstructions.ts`;
  - #2 lines `src/compgeo/lineForms.ts`;
  - #5 isometries `src/isometry/` (isometry2, rosette, frieze).
- **F2a:** #1 task 03, `src/trig/trigModel.ts`.
- **Pushed:** everything up to `e08a9ddd`. `3f2b27fb` (Batch D F0 and the C(60,30) correction) and this note's commit may still need a publish, so check `git log origin/master..HEAD`.

## In the worktree, not committed

1. **#3 combinatorics F1 (task 01):** `src/combinatorics/` with 4 modules and tests. The worker's note is `notes/f1-combinatorics-01.md`. The worker saw the unit, tsc and lint checks pass and all mutations caught. **Next:** a Sonnet `bezeg-reviewer` mathematical review, with the same prompt shape as the circle, lines and isometry reviews: name the task, spec sections and ADR, a checklist, `just unit src/combinatorics`, at most 300 words. Then repair, a handler recheck, commit, and mark task 01 done in `docs/tasks/combinatorics/README.md` and the stream row.
2. **#1 task 04 (unit-circle graph, F2a):** not started. The partial note `notes/f2a-trig-04.md` says to use `BernsteinGraph` (which extends `BaseGraph`) as the ownership precedent and `src/graphs/base/boardlessGraph.test.tsx` plus `complex/*.host.test.tsx` for tests. Dispatch a fresh worker from that note with the task 04 brief: edit permission for `src/graphs/trig/`, and one locale block after the trigonometric-function keys in `sl.ts` and `en.ts`. Acceptance needs an engineering plus UI and accessibility review and a drag measurement.

## Next, in order

1. The two items above.
2. Ungated F1, one worker per task file, each followed by a mathematical review and a recheck:
   - circle task 02, lines task 02 and isometries task 03 are **F2a** and allowed now, like trigonometry 04–05;
   - **F1:** randomness 01–02, kinematics 01, solids 01–02, recursion 01, level-sets 01–03, phase-portraits 01–02, waves 01, mechanical-curves 01, linear-maps 10, complex-maps 08.
3. F2a for #1, #2, #5 and #6: trigonometry 04–05, circle 02, lines 02, isometries 03. These need an engineering plus UI and accessibility review and a drag measurement. There is no route, so no smoke.
4. When only gated work remains, set `Run state: stopped: preparation done; F2a (playback, 3D) waits on Controls step 5 and F2b–F5 on Controls step 7`, push, and end.

## Pipeline that worked

- **F1:** worker brief = task file + spec sections + ADR + required mutations + `just unit <dir>`, `tsc` (ignore only the other worker's paths), `just lint <dir>`. Then a Sonnet mathematical review. Low findings go back to the same worker through SendMessage, which is cheap. Then the handler reruns unit, lint and tsc, and commits with the task row marked done.
- **F0:** about 8k handler tokens per family. Check the next ADR number on `origin/master` first. The stream boundary in `families-prep.md` overrides a spec's own gating; #9 is the example.
- Every review so far found something real: spec numbers, oracle limits (`classifyEigen` rejects entries off the quarter grid), a test that a mutation would survive. Never skip the review.

Rules to keep: two workers at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
