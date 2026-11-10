# Families-prep state note

Handler 3 handed off at BUDGET SOFT (2026-11-10, about 11:10Z). Successor: handler 4. Rewrite this note at each handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take two minutes or more while three agents run; give commits about 300 s and tsc about 200 s.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <ids oldest first>`, then check `just publish --status`. Pushed hashes differ from local ones (rebase).
- The publish gate rejects trailing whitespace: tell workers to check, and check yourself before committing.
- Edit spec text with the Edit tool. Shell or Python replacement strings must not contain `\b`, `\v`, `\a` or `\t`: they write control characters. Handler 3 found and fixed two old cases (`\varphi` in the waves spec, `\alpha` in guided-example-highlights). Check with `grep -cP '[\x00-\x08\x0b\x0c\x0e-\x1f]' <file>`.

## Done

- **F0:** all 15 families (ADRs 0044–0058).
- **F1 accepted, committed and published:** trigonometry, circle, lines, isometries (handler 2); combinatorics 01, randomness 01–02, kinematics 01, solids 01–02, recursion 01, level-sets 01–03, phase-portraits 01–02, waves 01, mechanical-curves 01, complex-maps 08, linear-maps 10 (handler 3). All ungated F1 is done.
- **F2a:** trigonometry 03 and 04 (unit-circle graph, `src/graphs/trig/UnitCircleGraph.tsx`). Task 04's browser drag measurement is owed at Batch A F2b (recorded in trigonometry task 06).
- **Spec corrections made at F1** (each marked "corrected at F1, 2026-11-10" in the spec): solids SV1 hexagon example, recursion RG2 example, phase-portraits PP2 energy, waves WV5 markup and numbers, level-sets LS2 and LS3 numbers, mechanical-curves MC1 depth note, complex-maps M7 product-rule bound, linear-maps L6 `iterationOutcome` inputs.
- Last published local commit: `30c31be7` (level-sets 03). Handler 3 started a background publish of `2dc9f781`, `d121cd69` and the handoff-note commit; check its status and republish if it failed. Check `git log origin/master..HEAD` and `just publish --status`.

## In the worktree, not committed

1. **Trigonometry task 05** (triangle solver graph, F2a). A Sonnet worker is running; its note will be `notes/f2a-trig-05.md`. When it returns, run an engineering (Sonnet) review, a UI and accessibility (Haiku) review and a mathematical review of the readouts, in parallel, with the same brief shapes as task 04 (see commit `18367459`). Then repairs, recheck (tsc, `just unit src/graphs/trig src/trig`, lint, build) and commit.

2. **Handler 4 (started 2026-11-10):** published state confirmed (`82beec19` pushed as `60eb961f`). Dispatched a fresh Sonnet worker for trig 05 (locale drafts copied to ignored `.command-logs/trig05-{sl,en}_block.txt`) and a Sonnet worker for **circle-geometry 02** (`src/compgeo/circleConstructionModel.ts`, `src/graphs/compgeo/CircleConstructionGraph.tsx`, locale block after the triangle-geometry keys; note `notes/f2a-circle-02.md`). Both edit `sl.ts`/`en.ts` in separate blocks: stage each slice's block alone (`git diff` the file, filter the hunk, `git apply --cached`).
   - Trig 05 implementation done (14 tests, 10 mutations). Engineering, UI/a11y and maths reviews done: no high findings. Handler decisions, now with a repair worker: solve mode fits the view to the solution and extends the ray past the largest c (the spec SSA a=9 example left the fixed view); sides and circle modes clamp user-input vertices to x in [-2, 8] (left of the bars) without changing the kernel's `snapVertexInput`. Repairs also cover a vacuous rebuild test, key help on every vertex field, B₁/B₂ in the two-solution status, "right angle at B" and the solve-row separators. After the repairs: recheck, commit, publish.
   - Circle 02: the first worker handed off after the model, its 49 tests and 70 locale keys. A second worker is writing the graph from the note. Settled: coordinate range [-16,16]; degenerate states give a status, not a parse error; the graph checks all three radical axes (the kernel checks only 12 and 13). For the maths review, ask whether the kernel labelling the single tangent of an internal contact `external` is wrong.

If the handler that started these workers is gone, the reports may not reach you. Check the notes and the working tree. If a slice is complete per its note, recheck and commit it. Otherwise dispatch a fresh worker from the note.

## Next, in order

1. The item above. The worker stopped at handoff with a partial draft: untracked `src/graphs/trig/TriangleSolverGraph.tsx` has 55 tsc errors, because the locale block was drafted in git-bash `/tmp/sl_block.txt` and `/tmp/en_block.txt` but never inserted. There are no tests yet. Dispatch a fresh Sonnet worker from `notes/f2a-trig-05.md`. If the /tmp drafts are gone, it rewrites the block.
2. F2a, one worker each, with engineering, UI and accessibility reviews and a jsdom drag placeholder (no route, so no smoke): circle 02, lines 02, isometries 03.
3. When only gated work remains, set `Run state: stopped: preparation done; F2a (playback, 3D) waits on Controls step 5 and F2b–F5 on Controls step 7` in `docs/tasks/feature-streams/families-prep.md`, push, and end.

## Pipeline that worked

- **F1:** brief = task file + spec sections + ADR + required mutations + independent oracles + `just unit <dir>`, `tsc` (ignore only other workers' paths, let it finish), `just lint <dir>`, whitespace check. Then a Sonnet mathematical review with a checklist that names any spec doubt the worker raised. Low findings go back to the same worker through SendMessage. The handler fixes the spec text itself, after checking the numbers by hand. Recheck, mark the task row and stream row, commit, publish in the background.
- Every review found something real; about half of the families had a spec number or example that was wrong. Never skip the review, and ask the reviewer to verify the worker's spec claims.
- Graph slices (F2a) cost more: plan for a worker handoff mid-slice and two parallel reviews.

Rules to keep: at most two workers in the stream at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
