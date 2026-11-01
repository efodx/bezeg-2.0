# Learn UI stream: handler handoff 9

Date: 2026-11-01. Handler 7 stops at its 150k context threshold. Earlier context: [handoff 8](handler-handoff-8.md). Source: [spec](../../../specs/guided-example-highlights.md), [tasks](../../../tasks/guided-example-highlights/README.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

Branch `worktree-stream-learn-ui` in `.claude/worktrees/stream-learn-ui`, rebased onto `origin/master` `d38a6ad5`: `d7f52129` (figures → prose), `b41056dd` (lint), `adc4da94` (03b recipes and captures), `18a6bfc2` (`\le` fix plus gate), `90b05ab8` (docs). See the push status at the end of this note.

## Done this session

- **Task 03 done.** Batch 03b accepted. Evidence and gaps for task 05: [batch-a-note.md](../../guided-example-highlights/batch-a-note.md). Two sequential Sonnet workers (foundations + rational: about 111k tokens, 52 tools; splines: about 110k, 53 tools). One Sonnet smoke worker (37k, 17 tools). Handler repairs: alt/caption corrections after viewing every PNG; an unused import after the figure tests.
- CI run 41291109433 (`d19b8586`): our jobs passed. `other-specs` fails on master since `27dc4f7a` (before batch A), because seven computational-geometry demonstrations lack generated previews. That belongs to the geometry stream; it is recorded in the batch A note, not fixed here.

## Next, in order

1. If this note's push line says "not pushed", run `git fetch`, rebase onto `origin/master`, `just check`, then `git push origin HEAD:master`.
2. Batches 04 (task [04-batch-b.md](../../../tasks/guided-example-highlights/04-batch-b.md)) and 06 ([06-batch-patches.md](../../../tasks/guided-example-highlights/06-batch-patches.md)), one worker at a time; both share `guidedExampleHighlights.ts`, the copy file and the manifest. Pattern that worked: one worker per one or two chapters, about 6–9 examples each. Brief items that helped: verify the audit's numbers against the graph preset; read the visible curve objects before `curveCount`; mutation-check each helper; leave the capture and build to the handler. Then the handler runs `just build`, `just preview 4387` (background), the full capture, views every changed PNG against its alt text, runs `just check`, and runs smoke.
3. Task 05 (acceptance), after 04 and 06.
4. D10 (quintic card d = −2.5) is still open with the owner.

## Notes

- Bash heredocs lose backslashes here. Write scripts that contain `\` with the Write tool.
- Test slots are contended: each `just check` took about 10 minutes, mostly waiting.
- `do-log` records for handlers 3–7 are still unwritten (numbers above and in handoff 8).
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet; smoke `bezeg-smoke` Sonnet; capture preview on 4387 (handler 7's preview process may still be running; reuse it or restart it); smoke `SMOKE_PORT=4312`.

## Push status

**Not pushed to `master`.** The `just check` on the rebased HEAD was killed by Claude Code's low-memory reaper before it ran: it had waited 1339 s for a test slot. The reaper also stopped the 4387 preview and the handler watcher. The commits are pushed to `origin/learn-ui-handler-7` so they survive (`origin/worktree-stream-learn-ui` holds older pre-rebase commits; it was not force-pushed). The previous base (`4d7db55c`) passed `just check` and smoke. Master's new commits touch shared learning files (`guidedLessonOwnership.ts`, `lessonMathNotation.test.ts`, `guidedExamplePreviewCopy.ts`), so recheck before pushing (Next step 1). No successor was launched, because of the memory pressure.
