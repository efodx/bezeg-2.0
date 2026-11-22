# Board workspace (kept UX picks, app-wide): implementation tasks

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) and [parameter writes](../../specs/parameter-writes.md). Decisions: ADRs [0062](../../adr/0062-rebuild-ux-picks-on-master.md), [0063](../../adr/0063-cards-on-the-board.md), [0064](../../adr/0064-source-tagged-scene-writes.md), [0065](../../adr/0065-graphs-declare-presenters-render.md). The owner accepted the spec on 2026-11-22; no task has started.

Reference prototype: branch `ux-picks` frozen at `aff6df6c` (R30; prototype code never merged), preview on the tailnet at port 4460. Prototype paths in the task files are read-only references at that commit. Night tooling (probe, fuzzer, guide, briefs) is in `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night/`.

Branches (owner, confirmed 2026-11-22): planning files stay on `ux-picks`. Code is built on a work branch cut from `master`; a finished, accepted stage is carried to `master` by the normal publish sequence. The first handler names the work branch here and brings these planning files to it as a documentation-only cherry-pick.

Phones are redesigned in task 09, last. Until then, do not design, test or smoke phone layouts of the changed workspace; skip a phone check the work breaks and list it in task 09.

Workers: `bezeg-worker`, Sonnet `medium`; return at most 400 words; bulky evidence to `docs/reviews/ux-picks-app-wide/`. The store core (01), the layout function (03) and the arbiter's use by the director (07) are tightly coupled cores: the handler keeps the design and delegates tests, ports and probes.

## Running the work economically

From the token audit of all Bezeg transcripts (2026-11-22, at the owner's request). On the prototype, 13 handler sessions cost 106 units and their 160 subagents 61; a handler turn costs about 4.3 times a worker turn because it re-reads a 100k to 330k context. These rules apply to every task here; repo-wide rule changes from the same audit are landing on `master` separately and take precedence where they differ.

1. **State note.** This stream has its own note, `docs/reviews/ux-picks-app-wide/state.md`: present state only, at most about 8 KB (work branch and commit, standing owner directions verbatim, task status one line each, open items, the next slice's brief inputs). Each handoff rewrites it in place; nothing is appended ([handler context budget](../../agent-workflow.md#handler-context-budget-claude), step 5). Handlers of this stream do not read the prototype's `docs/reviews/ux-picks/state.md` (124 KB, about 35k tokens): what the plan needs from it is in the spec. Reach it by section only for a named question.
2. **Delegate.** The prototype's UX sessions were handler-implemented (median 0 workers). Here the handler keeps the three named cores' design, builds one worked example and one brief per repeated change, and dispatches `bezeg-worker`s with owned paths. It reviews diffs and accepts; it does not apply a change file by file. Task 08 is the item-batch case and starts with the blocker triage.
3. **Screenshots.** Workers crop to the changed panel or board, not the full page, and produce one contact sheet per batch of graphs, not one image per graph. A `bezeg-smoke` worker judges shots against a named checklist and returns text plus only the failing image. The handler looks at images at acceptance, not while iterating. (The audit counted a median of 26 screenshots read per UX handler session at about 1.1k tokens each, carried for the rest of the session.)
4. **Batch calls.** Briefs tell workers, and handlers do the same, to send independent reads and searches in one message.
5. **Launch.** Every handler and lane session starts with `--agent bezeg-handler` (about 22k input at start instead of 50k).
6. **Publish.** One publish per accepted batch or stage, never per graph. Wait with one background command that notifies on exit (`just publish --background`, then one `just publish --status` before reporting), not with repeated status or `gh run` polls.
7. **Owner checkpoints.** Before asking the owner something that may wait more than an hour (a feel-slice preview, a taste choice, a stage sign-off), rewrite the state note first, so he can resume through a fresh successor instead of a reply that rebuilds a 300k cache.
8. **Checks.** Workers iterate with path-filtered `just unit <file>` in the foreground and do not poll log files for queued runs. The changed-suite run (`just check-changed`), the fuzzer matrix and smoke are the handler's gate.

Every task ends with: focused `just` checks, the fuzzer on the routes it touches, one minute of free play that interrupts what moves, a screenshot of each changed panel at 310 px, and smoke for changed routes ([smoke checklist](../../smoke-tests.md)).

Tasks 03 to 07 each end with a feel slice ([room to improve](../../specs/ux-picks-app-wide.md#room-to-improve-on-the-prototype)): the worker is asked to make the feature feel better than the prototype, not to copy it, and the owner sees the result on a tailnet preview before the task is closed. Reference paths in the task files show behaviour to keep, not visuals or motion to reproduce.

Pilot graphs for 03 to 07: Taylor, transformations, De Casteljau, linear map, phase portrait, and one graph whose lesson uses the legacy `step()` builder (chosen in 02).

| Task | Depends on | Status |
| --- | --- | --- |
| [01 Scene store, arbiter, fuzzer](01-scene-store-and-fuzzer.md) | — | not started |
| [02 Declaration contract and conversion tooling](02-declaration-contract.md) | 01 | not started |
| [03 Layout function and board cards](03-layout-and-board-cards.md) | 02 | not started |
| [04 Tools and lesson cards](04-tools-and-lesson-cards.md) | 03 | not started |
| [05 Pucks](05-pucks.md) | 01, 03 | not started |
| [06 Previews and sweeps](06-previews-and-sweeps.md) | 05 | not started |
| [07 Lesson morph and view director](07-morph-and-view-director.md) | 03, 04 | not started |
| [08 Convert all graphs](08-convert-all-graphs.md) | 02 to 07 accepted on the pilots | not started |
| [09 Phone presenter](09-phone-presenter.md) | 08 | not started; needs its own spec |
| [10 Closeout](10-closeout.md) | 08, 09 | not started |

04 and 05 can run in parallel after 03.
