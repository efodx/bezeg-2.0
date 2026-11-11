# Controls visual stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [stream file](../../../tasks/feature-streams/controls-visual.md) and the [spec](../../../specs/control-visual-polish.md) (sections Acceptance criteria, Tokens, Decisions).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-visual`, `worktree-stream-visual`, own `npm ci`. Run state: **active**. Stream port 4327 for previews of this worktree's `build/` (Vite output is `build/`); `just controls-fixture` uses 4328. A `just build` fails provenance ("Build inputs changed while building") while a worker edits files; build when no worker is editing, or verify in the clean worktree.
- **Clean worktree for publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, then `just publish --background --recipe runtime --base <origin/master sha> --commits <ids, oldest first>`; `just publish --status`; then `just ci <pushed sha>`. Focused browser specs there: `just smoke <spec files> -g "<pattern>"`.
- **Branch updates:** `git merge origin/master`, never rebase. Conflicts in files master holds only as cherry-picked copies resolve to the stream side (`git checkout --ours`) after `git log <merge-base>..origin/master -- <file>` shows only our own commits.
- **Owner directions:** handlers decide and record, with no confirmation. Launch successors with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium` at budget handoff, passing this rule on; end without a successor when no actionable work is left.

## Done

- Handler 1: audit, tokens and prototype, 3a, step 5 slices 1–3 (see git log and spec Decisions).
- Handler 2 (2026-11-11), all published; master `1418471c` CI green:
  - 3b (count setters, point collections, disclosures, remove/delete buttons, disabled = dashed + muted ink, Presentation chevron, "Strni"), 3c (function action buttons, affine, Presentation text residuals; Pascal 44 px floor is a recorded exception).
  - Presentation fixes: pressed "Zapri predstavitev" (was cream on cream since the prototype), header topic buttons.
  - Step 4 complete: `reducedMotion.ts` subscription, `reducedMotionReason`, `PlaybackButtons describedBy` (linear `StepCounter.tsx` removed), shared `CheckboxGroup`.
  - Token 44 px also at `(max-width: 700px)`: master smoke `10e3df2e` failed on count-setter and lesson views at narrow fine-pointer widths; fixed in `1418471c`.
  - Step 3 close-out audit: stream `.command-logs/cv-close/` (summary in spec Decisions).

## Not yet published

Stream commits `0c699319` (step 5 slice 4: `typedRefusalBehaviour.ts`, inventory assessment), `d5201412` (last audit residuals: B-spline extraction buttons, degree-elevation fill; spec decisions) and this state commit. Checks: slice 4 `just check-changed` passed; residuals measured on the built app in both themes. Handler 2 started their background publish from the clean worktree at handoff (run id in the successor prompt): check `just publish --status` there, then `just ci <sha>`; if it failed, read its log, cherry-pick these three oldest first onto fresh `origin/master` and republish. The `d5201412` change touches a lesson's button (`bsplineExtractionGuidedLessons`); its unit test selects by `data-action`, unaffected.

## Next

1. Confirm the publish above and its CI.
2. **Step 5:** the two sweeps proposed in the [inventory](test-redundancy-inventory.md) "Slice 4 assessment": `graphTeardownContract` (absorbs about 16 StrictMode and 12 scene-change/unmount tests) and `graphLanguageContract` (about 35 repeated language tests). One worker each, sequential; each must see its sweep fail once and name the covering test per deleted test; report `just test-cost`.
3. Criterion 6 bookkeeping: copy before/after screenshots for 3b/3c into the clean worktree `.command-logs/` and list them in a short `docs/reviews/feature-streams/controls-visual/rollout.md` (sources: stream `.command-logs/cv-3b/`, `cv-3c/`, `cv-close/`).
4. When 2 and 3 are done, no actionable work is left: set the stream file's run state to complete, record it here, push, and end without a successor.

## Risks and working notes

- Look at before/after screenshots yourself: Presentation regressions (cream on cream) passed numeric checks.
- Repository smoke specs assert 44 px at narrow widths without touch emulation; check `tests/*.cjs` before changing a size token.
- A new shared rule at (0,2,0)+ outranks Bootstrap and component state rules; check pressed, active, disabled and hover after each slice.
- `--bezeg-*` palette variables are not on `:root`; tokens use literals.
- The audit script's "text contrast" for checkbox and range inputs is an artefact (no text). `pres-text.cjs` samples every 4th route unless the `i%4` filter is removed.
- Haiku smoke cannot Write files; ask for summaries in the return text or via a script.
- Line endings: many files have CRLF working copies; edit by hand or by line-number `sed`, not `\s*` regexes.
- PhasePortrait and Descent graphs have no route; their reduced-motion reasons are unit-tested only.
