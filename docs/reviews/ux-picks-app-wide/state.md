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
- **02**: slices 1 (`44437c66` contract, `2c648640` FormattedValue + locked min = max), 2 (`cf0fb2cf` frame `declare` field, shared `guidedStep`, transformations and phase portrait lessons use it; 43 local copies switch in 08), 4 (`c63246f2` parity recorder and six recordings), 5 (`98e6f0ee` inventory: 138 demonstrations, 29 components), 5b (ADR 0066 catalog fragments, in `c63246f2`; mechanism not built), 8 Taylor (`d34e9f9b` hooks `declaration()/getDeclaration()/drawnObject()/performAction()` on BaseGraph, Taylor declares, parity passes). Pilots named in the README: `projective-cross-ratio`, `patch-coons`, `triangle-centres`.
- 03 to 10: not started.

## Decisions in force (handler)

- 01/01b: global source with ambient learner input; only the five pilots bind parameters and `view` until 08; every board has a `ViewAdapter` (`boardView`); `setIntent` / `following` / `resizing` classes (08 rechecks `following` sites); Presets store the intent box.
- 02: text is a catalog `Message` (or `FormattedValue` for numbers the graph formats; no words); ids per-graph union with `frameDeclarer<Ids>()`; the declaration reproduces the present panel (parity), new text is a later task; new declaration keys go into per-family fragments (ADR 0066); lesson files switch to `guidedStep` when their graph converts.

## Open items

- Taylor still uses the pass-through key `taylor_value_text` ("{value0}") and added 8 keys straight into `sl.ts`/`en.ts`: replace the pass-through with `FormattedValue`, build the fragment mechanism (`src/localization/fragments/<family>.ts`, spread into `sl`/`en`, collision test) and move Taylor's keys there.
- Probe gaps (note in `measure/probe-baseline.md`): board pan measured nothing on transformations and at 1024 on De Casteljau and phase portrait.
- Inventory's 6 new-string candidates is implausibly low; recheck before relying on it.
- For the owner: Esc now pauses playback on board graphs (lands with 01c); touching a playing parameter pauses it (task 01, on master).

## Next slice's brief inputs

1. Read the matrix logs. All pass: write the 01c evaluation entry, then publish `9abecba9..` with 02's commits only once 02 is accepted, or publish 01c now from base `14690f6b` (declare exactly base..HEAD; 02 commits are on top, so publishing 01c alone needs 02 accepted too or a separate branch: simplest is to publish 01c and 02 together). A failure: replay the `min-*.json`, decide app bug or harness artefact, fix, rerun that route.
2. 02 remaining: Taylor follow-up (open item 1); slice 3 contract test over every declaring graph's lesson frames (build on `src/learning/content/sceneContentAgainstGraphs.test.tsx`; Taylor step 1 part 3 "Pokaži oceno napake" `uses: ['show-error']` is the worked frame example; seeded wrong id, hidden highlighted row, undrawn legend entry must fail); slice 5a preview mechanism measurement + ADR (browser; after the matrix); slice 6 per-graph recipe; slice 7 conversion guide (inputs: `02-taylor-placement.md`, `02-parity.md`, `02-shared-inputs.md`, night-tooling `GUIDE.md`); slice 8 the other seven pilots with one shared brief and Taylor (`d34e9f9b`) as the worked example.
