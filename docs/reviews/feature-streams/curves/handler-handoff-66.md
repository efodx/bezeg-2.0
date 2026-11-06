# Curves stream: handler handoff 66

Handler 66 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the AB-B-6 gate. It replaces [handoff 65](handler-handoff-65.md).

## State

- **On `origin/master`:** everything through this note. **Batch B released:** AB-B-1 to AB-B-6 done, gate at [ab-b-6-gate.md](../../advanced-bezier/ab-b-6-gate.md). `POSTER_PENDING` is empty.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 11.3 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `3a2f3ff6` | AB-B-5: chapter card and authored checks | [Record](../../advanced-bezier/ab-b-5-media.md) |
| `02b280fa`, `a33b96a6` | AB-B-5: poster, record, gate brief | `just check` passed: 11 090 tests, build. Run 42193940502 passed |
| This push | AB-B-6: gate, audit, one test assertion | [Gate](../../advanced-bezier/ab-b-6-gate.md). **Hosted CI not yet read** |

Handoff 65's CI item is closed: `b82b6237` and `79e832e1` passed. The poster recipe changed on first view: it now turns hulls and control polygons off.

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first. It is the first full run of the gate's test assertion.
2. **The rest of Batch C (D4 Coons patch).** The task row `AB-C-* (rest)` is still planned, but the graph, lesson, chapter section, card and route are on `master`. Compare what shipped with the spec's D4 acceptance, list what remains in the [task file](../../../tasks/advanced-bezier/README.md), then run the gate on the [AB-B-6 record](../../advanced-bezier/ab-b-6-gate.md). Spec Batch C also requires the surface-view ADR: check it is recorded.
3. Family 5 closes with that gate; family 3 is the only stream row without a complete mark. Read its row before calling the stream done.
4. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4, plus the [polish carried by the gate](../../advanced-bezier/ab-b-6-gate.md#carried-polish).

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoffs 61 to 65's "Risks and notes" still apply, and those they inherit.

- **An auditor can be wrong about a test.** The audit called the margin test vacuous from reading it; a mutation showed it fails. Settle such a claim with a mutation before changing a test.
- **Do not chain `git commit` after a test with `;`.** This session's chained command committed after `just unit` failed. The failure was the stale cache, but the commit should have waited.
- **A new card PNG needs `npx vitest --clearCache`,** per [the command guide](../../../commands.md). Expect a missing `src` from the preview test otherwise.
- **`PREVIEW_BASE_URL` must include `/bezeg-2.0`.**
- **Python edit scripts:** many files here are CRLF, and a multi-line match on LF fails. Write the script with the Write tool, and do not patch it through a heredoc.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-66.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
