# Curves stream: handler handoff 67

Handler 67 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the AB-C-6 gate. It replaces [handoff 66](handler-handoff-66.md).

## State

- **On `origin/master`:** everything through this note. **Batch C is held, not released:** [gate](../../advanced-bezier/ab-c-6-gate.md), one open question, F3.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview, worker or watcher of this handler should be running. Port 4314 is free. A `capture-demonstration-previews.cjs` process seen during this session was not this handler's; leave such processes alone.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 10.5 GB free at this session's start; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `24381858` | D4 chapter prompt names the real controls | [Gate](../../advanced-bezier/ab-c-6-gate.md#audit-gaps) |
| `ad350c50` | AB-C-P drag measurement, D4 audit, briefs | [Measurement](../../advanced-bezier/ab-c-p-perf.md), [audit](../../advanced-bezier/ab-c-6-criterion-audit.md) |
| `c8ae4a88`, `59a9f35b` | D4 test gaps: disposal after move and import, pinned prose, chapter claims | Six mutations failed; tsc and unit passed at `59a9f35b` |
| This push | AB-C-6 gate record, browser report, IA-F6 audit | **Hosted CI not yet read** |

Handoff 66's CI item is closed: run 42196408763 on `95ae4718` passed.

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first.
2. **Settle F3 and close Batch C.** Run the narrow recheck in [the gate](../../advanced-bezier/ab-c-6-gate.md#open-f3-closing-the-lesson) with `bezeg-smoke` Haiku: open the lesson in the page, with no navigation. Then release, or fix it with a test. Update the gate's heading, the AB-C-6 row and the family 5 stream line; that closes family 5.
3. **Family 3's F6 gate (IA-F6).** It never ran. The [partial audit](../../interpolation-approximation/ia-f6-criterion-audit.md) is filed, most citations unread.
   - First check in the browser whether chapter investigation prompts are displayed at all; G1 and G2 rank on that. Route prompt `prompt_interp_hermite` is separate. The [audit](../../interpolation-approximation/ia-f6-criterion-audit.md#ranked-gaps) has locations.
   - G3 is the one spec acceptance gap: I3 asks a stated overshoot or loop example. Find a coordinate set, verify it in the kernel, add it to the prose and a test.
   - Then the family smoke in SL and EN, `just check`, CI, and mark the stale `(rest)` rows done.
4. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4, plus [AB-B-6's polish](../../advanced-bezier/ab-b-6-gate.md#carried-polish) and [AB-C-6's](../../advanced-bezier/ab-c-6-gate.md#carried-polish). The opening view of `patch-coons` now has numbers: 196×128 against a fitted 411×301.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner). New: investigation prompts of lesson-owned sections may be shown nowhere; if the browser check confirms it, the prompts are unused authored text across chapters.

## Risks and notes

Handoffs 61 to 66's "Risks and notes" still apply, and those they inherit.

- **A pipe hides a failure from `&&`.** `just typecheck | tail -1 && git commit` committed a failing tree. Send output to a file and let the command's own exit code gate the next step. This is the second such slip in two sessions.
- **`just check` ends with a build,** which overwrites what a running preview serves. Stop the preview first, and do not run it during a smoke.
- **`bezeg-reviewer` runs out of turns on five lessons at once.** Split family-wide audits, or say which test bodies matter.
- **Heredocs garble non-ASCII through Python here.** Write the script with the Write tool, as handoff 66 said for CRLF.
- **A worker reports with `waiting on its own background work`** can simply have finished. Check for stray processes before timing anything.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-67.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
