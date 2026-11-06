# Curves stream: handler handoff 61

Handler 61 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 60](handler-handoff-60.md).

## State

- **On `origin/master`:** everything through this note, including AB-A-5. Handoff 60's push (`33eb9915`) concluded `success`; its jobs were not read one by one.
- `origin/curves-lessons-d1-d3` is a safety copy, already on `master`. Delete nothing. The remote `worktree-stream-curves` is stale; never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 10.7 GB free at the start; check it first.
- FFmpeg and `gh` as in [handoff 58](handler-handoff-58.md#state). Read hosted CI with the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`) through `curl`: Python's `urllib` fails certificate verification here.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `1e4c69d9` | AB-A-5 cards, `advanced-bezier` capture family, arc-length copy fix | [Record](../../advanced-bezier/ab-a-5-media.md) |
| `36090c34` | Posters of `reduction` and `arc-length-param`; `POSTER_PENDING` empty | [Record](../../advanced-bezier/ab-a-5-media.md#posters) |
| This note's commit | Record, statuses, delegation log | |

**`just check` has not run on these commits or handoff 60's.** Hosted CI is their first full run.

## Next steps, in order

1. **Read hosted CI** for this push: the jobs, not only the conclusion.
2. **AB-A-6 gate** (Batch A): follow the CG-B3-6 gate as the template. It must include a browser view of the `advanced-bezier` chapter page with its three cards and of both new catalog posters: AB-A-5 ran no browser check of them.
3. Batch B (D2; `CurvePairGraph` is on `master`, see geometry handler 53's note in [geometry.md](../../../tasks/feature-streams/geometry.md)), then the rest of Batch C.
4. The low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) step 5, with its polish items, plus: D1's curve is 86 px wide at 390 px after *Opazuj na grafu*, and the `patch-coons` lesson opens with a small patch (the Preset's 0.45-aspect camera, about 180 px wide on the 840 px card).

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoff 60's "Risks and notes" still apply, and those it inherits.

- **The self-watcher counts the whole request input,** and this session's startup and reads reached 176k in 23 turns. Read long task tables by column (`cut`), never whole: `curves.md` alone printed 33 KB.
- **Long Bash heredocs with quotes can fail to parse here.** Write edit scripts with the Write tool, then run them.
- **`just preview` exits 127 when its process is stopped;** that is not a failure.
- Do not read `advanced-bezier` card evidence for `points` on the Coons entry: surface entries have only `expected.surface`.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-61.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
