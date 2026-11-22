# Board workspace stream: state

Present state only; rewritten in place at every handoff, about 8 KB at most. Plan: [task README](../../tasks/ux-picks-app-wide/README.md) (read whole), [spec](../../specs/ux-picks-app-wide.md) by section, [parameter writes](../../specs/parameter-writes.md), [ADR 0064](../../adr/0064-source-tagged-scene-writes.md). Do not read the prototype's `docs/reviews/ux-picks/state.md`.

## Where

- Work branch `board-workspace`, worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (`node_modules` is a junction to the main checkout; unlink it with PowerShell before removing the worktree). No upstream set: push with `git push origin board-workspace`, never force. Keep the worktree root as cwd: a `cd` into a subfolder persists and the worktree guard then refuses `git -C`.
- Prototype reference: branch `ux-picks` frozen at `aff6df6c` (read-only; never merge or copy its write paths).
- Running (handler 2's shells; inherited by a successor in this worktree): dev server `http://127.0.0.1:4482/bezeg-2.0/` (strict), production preview `http://127.0.0.1:4471/bezeg-2.0/` (build of `9405cd92`-era source; rebuild with `just build` before trusting it). The fuzz matrix `bash .command-logs/fuzz-matrix.sh` runs against 4482, about one seed a minute; logs `.command-logs/fuzz/matrix/<route>.log`, shrunk failures `min-*.json` there. At handoff: Taylor 41/41 passed, then transformations, De Casteljau, phase portrait, Taylor lesson.

## Standing owner directions (verbatim from the handler-1 prompt, 2026-11-22)

- "Stop and ask the owner before anything the plan marks as his (taste choices, feel-slice previews, stage sign-offs), after rewriting the state note."
- "Tasks 01, 01b, 01c and 02 may go to master when accepted, by the normal publish sequence (`just publish`), because they show a learner nothing new. Tasks 03 to 07 accumulate on the work branch and go to master together."
- "CI deploys only when every job passes: a task that changes the workspace migrates its desktop tests in the same publish. Phone layouts are out of scope until task 09; skip a phone check the work breaks and list it in task 09."
- "When the owner needs to see something, serve it to the tailnet with `tailscale serve` and give the tailnet URL, never localhost."
- Successors start from the main checkout with `claude --bg -n 'Board workspace handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this note>"`, confirm with `claude logs <id>`, and pass this rule on.
- Message the "UX picks app-wide planner" session when a plan statement contradicts the code; code is the authority.
- Owner, 2026-11-22 (handler 2): fix the cleanup sweep killing dev servers (done, `d124fc82`); never end a turn with nothing running and nothing asked (rule in `.claude/agents/bezeg-handler.md`, `14690f6b`).

## Task status

- **01, 01b accepted, on master** (master head `14690f6b`, CI green for `38fc48c3`).
- **01c**: implemented, acceptance pending the fuzz matrix. On master: `81b5eaad` bridge path. Branch only: `9abecba9` fuzzer/probe/cases/baseline/smoke checklist, `ea78cdc9` Esc pauses playback and ends leases on board graphs (user-visible; fuzzer finding I3). Full `just check` passed at `ea78cdc9`.
- **02**: done on branch except slice 5a and the `patch-coons` pilot. Slices 1 `44437c66`/`2c648640`; 2 `cf0fb2cf`; 3 contract test `c92616bb` (+ chapter-lesson discovery `3779b47e`); 4 parity `c63246f2` (+ check-mode coverage of a control's read-off by parameter symbol, `cd31e769`); 5 inventory `98e6f0ee`; 5b fragments ADR 0066 built `56414ad2`; 6 `just graph-check <graph-id>` `2212571c`/`f9250bc6`/`2698e33f`/`3779b47e`; 7 guide `docs/guides/converting-a-graph.md` `07c84123`; 8 pilots: Taylor `d34e9f9b`, transformations/De Casteljau/phase portrait `a87ba078`, triangle centres `cd31e769`, linear map + projective cross-ratio `18c97a67` (each passes `just graph-check`). Shared pilot brief `briefs/02-pilot-declare.md`.
- 03 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the five pilots bind parameters and `view` until 08; every board has a `ViewAdapter` (`boardView`); `setIntent` / `following` / `resizing` classes (08 rechecks `following` sites); Presets store the intent box.
- 02: text is a catalog `Message` (or `FormattedValue` for numbers the graph formats; no words); ids per-graph union with `frameDeclarer<Ids>()`; the declaration reproduces the present panel (parity), new text is a later task; new declaration keys go into per-family fragments (ADR 0066); lesson files switch to `guidedStep` when their graph converts.

## Running (handler 3)

- Fuzz matrix `.command-logs/fuzz-matrix-resume.sh` against handler 3's dev server `http://127.0.0.1:4483/bezeg-2.0/` (handler 2's run died of low memory; 4471 is down, 4482 is handler 2's). Taylor 50 seeds: 49 pass + seed 49 failed with a Vite HMR error ("frame is not defined") from a worker editing lesson files; replaying `min-analysis_taylor-49.json` passed 5/5. Transformations: seed 17 the same HMR artefact ("frameDeclarer is not defined"), replay passed 5/5. Then De Casteljau, phase portrait, Taylor lesson. Any failure: replay its `min-*.json` first; an HMR "[vite] ReferenceError" is a harness artefact of live edits.
- De Casteljau seed 27 was a real I1 bug (pending play start survived a learner write), fixed `057fc189` mid-run: rerun De Casteljau's 50 seeds after the matrix ends. Open: `DecasteljauGraph2.tsx` has the same start-after-commit pattern (check in 08).
- Since: `0c3422fb` patch-coons (all 8 pilots declared); `4ee51098` preview harness (`just preview-measure --base http://127.0.0.1:4483/bezeg-2.0/ --n 30 --throttle 1,4`, needs the dev server; smoke: A ≈0.2 ms, B cold 31-51 ms, warm 6-19 ms); task 03 slice 1 started early: design `03-layout-design.md` `425c7030`, pure `src/workspace/layout/boardLayout.ts` `0acfc95b` (18 tests); slice 4 `storedLayout.ts` `e64662c1`; slice 1a `measureCards.ts`/`useMeasuredCards.ts` `49f4bb6c` (unwired). Open for slice 3 wiring: the hook remeasures only on id/width change or one font/typeset event; a content change that alters height (a row group appearing, language switch) needs a content key input.

## Contract gaps (decide before the freeze at the 08 gate)

- Math notation with letters (rule "y = a f(...)"): `FormattedValue` rejects letters; pilots use a fragment template key with formatted pieces. A formula value kind would be cleaner.
- No point-valued / point-set parameter kind (phase-portrait seeds, point sets, vectors).
- Choice option values are strings; the arbiter reads `phase-equilibrium` as 0/1.
- No place for board captions/insets (phase portrait matrix columns, trace–determinant inset).
- Declarations read `state`, which lags the live value during playback (De Casteljau `t`); presenters need the arbiter read.
- `RationalDecasteljauGraph` inherits De Casteljau's declaration unreviewed; De Casteljau speed `v` unbound, undeclared.
- Parity does not compare `status`; a legend entry for several objects resolves to the first visible one; the linear map's inspector now renders from its declaration and only basis/determinant are recorded (reviewer read-through found no panel change in all seven modes, both languages). Full list in the guide, section 6.

## Open items

- Probe gaps (note in `measure/probe-baseline.md`): board pan measured nothing on transformations and at 1024 on De Casteljau and phase portrait.
- Inventory's 6 new-string candidates is implausibly low; recheck before relying on it.
- For the owner: Esc now pauses playback on board graphs (lands with 01c); touching a playing parameter pauses it (task 01, on master).

## Next slice's brief inputs

1. (done: patch-coons accepted.)
2. When the matrix ends (then rerun De Casteljau): all routes pass (or only replay-passing HMR artefacts) → write the 01c evaluation entry. 01c and 02 publish together (02 commits sit on top of 01c's): after 5a, run full `just check` on the branch, smoke the pilot routes (phase portrait's wrap curve visibility changed; linear map inspector now renders from the declaration), then `just publish --background` + `just publish --wait`.
3. Slice 5a (browser, only after the matrix ends so measurements do not share CPU): shadow board (option B) vs geometry from state (option A) for Taylor, De Casteljau, phase portrait; capture cost and frame gaps at 1× and 4× CPU throttle (docs/performance-plan.md; probe in scripts/probe/); new ADR with the numbers. Worker brief; handler owns the ADR decision.
4. Then 02 acceptance against the task file's Acceptance list (files touched per pilot are in each worker's report and the guide's table), and on to task 03 (layout function: handler-owned core).
