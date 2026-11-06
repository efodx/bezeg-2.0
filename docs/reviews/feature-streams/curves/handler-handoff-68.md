# Curves stream: handler handoff 68

Handler 68 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the IA-F6 gate. It replaces [handoff 67](handler-handoff-67.md).

## State

- **On `origin/master`:** everything through this note. **Family 5 is complete; Batch C released.** **Family 3 waits only on hosted CI of this push:** [gate](../../interpolation-approximation/ia-f6-gate.md).
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4314 is free.
- **One stray process:** `python.exe -` (PID 33116, from the smoke worker, waiting on stdin). The worker's `taskkill` was denied, so this handler left it and told the owner. Other `python.exe tools/agent-usage/...` watchers on the machine belong to earlier sessions; leave them.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 20.5 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. A run took over 50 minutes today. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `5d03d134` | F3 settled with no defect, AB-C-6 passed, Batch C released | [Gate](../../advanced-bezier/ab-c-6-gate.md), [recheck](../../advanced-bezier/ab-c-6-f3-smoke.md) |
| `a8c66fa8` | G1 to G4: route prompt, chapter strings, the I3 loop example, section-scoped pins, three Slovenian slips | [IA-F6 gate](../../interpolation-approximation/ia-f6-gate.md) |
| `1f93be07` | Point lists wrap at large text; example moved into the visible prompt | `just check` exit 0 at this revision; production measurement in the gate |
| This push | IA-F6 gate record, stale rows, this note | **Hosted CI not yet read** |

Handoff 67's CI item is closed: run 42206706487 on `44da1664` passed.

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first. On success, change the gate's first line and its CI row, the IA-F6 row in `docs/tasks/interpolation-approximation/README.md`, and the family 3 stream line to complete. That closes the five families.
2. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4, plus the carried polish of [AB-B-6](../../advanced-bezier/ab-b-6-gate.md#carried-polish), [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish) and [IA-F6](../../interpolation-approximation/ia-f6-gate.md#carried-polish), and its G5 and G6. The shared slider box at 200% now appears in all three lists and is the most repeated item.
3. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner). New, both authored text no student sees:

- **Chapter `investigationPrompts` are displayed nowhere** for the interpolation chapter (browser-checked for I3 and I4), and D4's was not either. Other chapters were not checked. Decide whether to show them or delete them.
- **`expectedObservations` are rendered by nothing.** Only lesson content and tests name the field; `src/learning/runtime` does not read it. This covers every lesson that sets it. Decide whether the lesson should reveal them after a prediction, or whether the field goes.

## Risks and notes

Handoffs 61 to 67's "Risks and notes" still apply, and those they inherit.

- **A background command's exit code can be its last pipe stage.** `just check > log; echo; tail` reports `tail`'s. Read the echoed line.
- **Chapter math is typeset lazily.** Raw `\(...\)` in `innerText` before a scroll is not a defect.
- **Check normal size when fixing large text.** Wrapping at 200% first wrapped at 100% too, as the panel is 280 px. Measure both.
- **A smoke worker's script can hang.** Two leftovers this session. Briefs now ask for `browser.close()` in a `finally`.
- **Heredocs halve backslashes in Python here,** as well as garbling non-ASCII. Use the Write tool.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-68.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
