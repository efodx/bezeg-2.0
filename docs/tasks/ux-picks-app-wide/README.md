# Board workspace (kept UX picks, app-wide): implementation tasks

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) and [parameter writes](../../specs/parameter-writes.md). Decisions: ADRs [0062](../../adr/0062-rebuild-ux-picks-on-master.md), [0063](../../adr/0063-cards-on-the-board.md), [0064](../../adr/0064-source-tagged-scene-writes.md), [0065](../../adr/0065-graphs-declare-presenters-render.md). The owner accepted the spec on 2026-11-22; work runs on the branch `board-workspace` (see Branches and the task table).

Reference prototype: branch `ux-picks` frozen at `aff6df6c` (R30; prototype code never merged), preview on the tailnet at port 4460. Prototype paths in the task files are read-only references at that commit. Night tooling (probe, fuzzer, guide, briefs) is in `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night/`.

Branches (owner, confirmed 2026-11-22): planning files stay on `ux-picks`. Code is built on a work branch cut from `master`; a finished, accepted stage is carried to `master` by the normal publish sequence. The work branch is `board-workspace` (cut from `origin/master` at `057d8d22`, worktree `.claude/worktrees/board-workspace`, pushed to `origin/board-workspace`); the planning files were brought to it from `ux-picks` at `c10e3b41` as one documentation-only commit. The stream's state note is [`docs/reviews/ux-picks-app-wide/state.md`](../../reviews/ux-picks-app-wide/state.md).

Phones are redesigned in task 09, last. Until then, do not design, test or smoke phone layouts of the changed workspace; skip a phone check the work breaks and list it in task 09.

Workers: `bezeg-worker`, Sonnet `medium`; return at most 400 words; bulky evidence to `docs/reviews/ux-picks-app-wide/`. The arbiter (01), the view adapter (01b), the contract types (02), the layout function (03) and the director (07) are tightly coupled cores: the handler keeps the design and delegates tests, ports and probes.

## Running the work economically

From the token audit of all Bezeg transcripts (2026-11-22, at the owner's request). On the prototype, 13 handler sessions cost 106 units and their 160 subagents 61; a handler turn costs about 4.3 times a worker turn because it re-reads a 100k to 330k context. These rules apply to every task here. The repo-wide rules and tools from the same audit are on `master` from `67f88549` (handler card, agent definitions, `just shot`, `bezeg-visual`, `just publish --wait`, the `STATE NOTE` hook signal; evidence in `docs/agent-workflow/handler-cost-2026-11-22.md`) and take precedence where they differ. The work branch is cut from `master` at or after that commit; `ux-picks` itself does not have them.

1. **State note.** This stream has its own note, `docs/reviews/ux-picks-app-wide/state.md`: present state only, at most about 8 KB (the hook signals `STATE NOTE` above 10,000 bytes) (work branch and commit, standing owner directions verbatim, task status one line each, open items, the next slice's brief inputs). Each handoff rewrites it in place; nothing is appended ([handler context budget](../../agent-workflow.md#handler-context-budget-claude), step 5). Handlers of this stream do not read the prototype's `docs/reviews/ux-picks/state.md` (124 KB, about 35k tokens): what the plan needs from it is in the spec. Reach it by section only for a named question.
2. **Delegate.** The prototype's UX sessions were handler-implemented (median 0 workers). Here the handler keeps the three named cores' design, builds one worked example and one brief per repeated change, and dispatches `bezeg-worker`s with owned paths. It reviews diffs and accepts; it does not apply a change file by file. Task 08 is the item-batch case and starts with the blocker triage. A repeated change gets one shared brief file that every worker reads (worked example, checklist, owned-path rule), so a dispatch only names the graph family; no rollout-specific agent definition is added.
3. **Screenshots.** Capture with `just shot` ([command guide](../../commands.md)): `--selector` crops to the changed panel or board, `--width 310 --selector <panel>` is the inspector-width check, and `--sheet` gives one contact sheet per batch of up to 8 graphs instead of one image per graph. No task writes its own Playwright screenshot script. Verdicts on shots go to `bezeg-visual` (Sonnet, read-only), which captures, reads and returns pass or fail per check as text, so images stay out of the handler's context. The handler looks at images at acceptance, not while iterating. (The audit counted a median of 26 screenshots read per UX handler session at about 1.1k tokens each, carried for the rest of the session.)
4. **Batch calls.** Briefs tell workers, and handlers do the same, to send independent reads and searches in one message.
5. **Launch.** Every handler and lane session starts with `--agent bezeg-handler` (about 22k input at start instead of 50k).
6. **Publish.** One publish per accepted batch or stage, never per graph. Start `just publish --background`, then `just publish --wait` as a background shell command; its exit notifies once and its last line says whether the push happened. No `--status` or `gh run` polling.
7. **Owner checkpoints.** Before asking the owner something that may wait more than an hour (a feel-slice preview, a taste choice, a stage sign-off), rewrite the state note first, so he can resume through a fresh successor instead of a reply that rebuilds a 300k cache.
8. **Checks.** Workers iterate with path-filtered `just unit <file>` in the foreground with a long timeout and do not poll log files for queued runs. Commands start from the working directory, and files are created with Write, not shell heredocs. The changed-suite run (`just check-changed`), the fuzzer matrix and smoke are the handler's gate.

Every task also checks spec acceptance 11 for what it touched (a phone-width page loads without a page error) and records its skipped phone checks in task 09.

Every task ends with: focused `just` checks, the fuzzer on the routes it touches, one minute of free play that interrupts what moves, a screenshot of each changed panel at 310 px, and smoke for changed routes ([smoke checklist](../../smoke-tests.md)).

Tasks 03 to 07 each end with a feel slice ([room to improve](../../specs/ux-picks-app-wide.md#room-to-improve-on-the-prototype)): the worker is asked to make the feature feel better than the prototype, not to copy it, and the owner sees the result on a tailnet preview before the task is closed. Reference paths in the task files show behaviour to keep, not visuals or motion to reproduce.

| Task | Depends on | Status |
| --- | --- | --- |
| [01 Source-tagged parameter writes](01-scene-store-and-fuzzer.md) | — | accepted 2026-11-22 (five 2D pilots bound; other graphs bind in 08) |
| [01b View adapter](01b-view-adapter.md) | 01 | accepted 2026-11-22 (every board has an adapter; the five pilots bind `view`; other graphs bind in 08) |
| [01c Check tooling in the repository](01c-check-tooling.md) | — (its acceptance run needs 01, 01b) | accepted 2026-11-23 (50-seed matrix on four pilot routes and the Taylor lesson; one real bug fixed, `057fc189`) |
| [02 Declaration contract and conversion tooling](02-declaration-contract.md) | 01 | accepted 2026-11-23 (eight pilots declared; preview mechanism ADR 0067; contract gaps for the 08 gate in the [guide](../../guides/converting-a-graph.md#6-known-contract-gaps)) |
| [03 Layout function and board cards](03-layout-and-board-cards.md) | 02 | not started |
| [04 Tools and lesson cards](04-tools-and-lesson-cards.md) | 03 | not started |
| [05 Pucks](05-pucks.md) | 01 (its measurement), 03 | not started |
| [06 Previews and sweeps](06-previews-and-sweeps.md) | 05; mechanism chosen in 02 | not started |
| [07 Lesson morph and view director](07-morph-and-view-director.md) | 01b, 03, 04, 05 | not started |
| [08 Convert all graphs](08-convert-all-graphs.md) | 02 to 07 accepted on the pilots and on `master` | not started |
| [09 Phone presenter](09-phone-presenter.md) | 08 | not started; needs its own spec |
| [10 Closeout](10-closeout.md) | 08, 09 | not started |

04 and 05 can run in parallel after 03.

## What reaches master when

- 01, 01b, 01c and 02 change nothing a learner sees (one exception in 01: touching a playing parameter stops it). Each goes to `master` when accepted.
- 03 to 07 change the workspace for every graph. They accumulate on the work branch and go to `master` **together**, once all five are accepted on the pilots. Landing them one at a time would remove the tools column for every graph before pucks and the view fit exist.
- From that release until task 08 finishes, an undeclared graph uses the fallback of task 04 (its present panels inside an Orodja card that starts open; its own view logic, no fit).
- 08 goes to `master` per round.

## Tests and CI

`.github/workflows/browser-smoke.yml` deploys only when every job passes, so each task that changes the workspace also moves the tests that describe it, in the same publish. Verified on `origin/master`: 11 files under `tests/` address the inspector (for example `tests/lesson-smoke-helpers.cjs`, `.inspector-tabs`); many unit tests find controls by `slider` or `spinbutton` role; suites such as `PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature` and the `GraphTransientState` tests iterate every graph.

- Pucks keep `role="slider"` (ranges) and `role="spinbutton"` (counts) with the control's accessible name, so role-based tests keep finding them.
- The all-graph suites are handler-owned: a lane never edits them. A lane owns only its demonstrations' own test files.
- Tasks 04 and 05 each carry a test-migration slice; the 03-to-07 release is not published until the full `just check` and smoke pass on the work branch.
- Phone-only checks are the one exception (skipped, listed in task 09).

Pilots (eight): Taylor, transformations, De Casteljau (has playback), linear map (seven modes), phase portrait (expensive redraw), one graph whose lesson uses the legacy `step()` builder, one surface demonstration (WebGL and a camera), and one point-set graph where the learner clicks the board to add points. Named from the task 02 inventory (handler, 2026-11-22; `docs/reviews/ux-picks-app-wide/inventory/inventory.md`): legacy step `projective-cross-ratio` (a component of one), surface `patch-coons` (the patch family is one component of nine, so its shared base is touched), point set `triangle-centres` (a component of one).
