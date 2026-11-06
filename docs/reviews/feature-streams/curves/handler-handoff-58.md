# Curves stream: handler handoff 58

Handler 58 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 57](handler-handoff-57.md).

## State

- **On `origin/master`:** everything through this note. Family 5 Batch A is planned and its two graphs are in, unrouted.
- The branch is local `worktree-stream-curves`. The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 9.4 GB free at the start; check it first.
- FFmpeg 9.0.2 is under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\ffmpeg-*\bin`, not on PATH. Set `PREVIEW_FFMPEG` and `PREVIEW_FFPROBE` for a poster capture.
- `gh` is not installed. Read hosted CI with `just ci` or the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `0b5dac7f` | Batch A plan: slices AB-A-2a to AB-A-6 | [Tasks](../../../tasks/advanced-bezier/README.md#batch-a-plan-d1-and-d3-handler-58-2026-11-06) |
| `f7d6294a` | D1 and D3 graphs, overlays, Preset collections, lesson action targets, locale blocks | [Record](../../advanced-bezier/ab-a-2-graphs.md) |
| This note's commit | Evidence, statuses, delegation log | |

Hashes are from before the rebase onto `origin/master`; they change if master moved. The full unit suite and `just check` did **not** run on the graphs: only the focused checks in the record did. Hosted CI covers the push, so read it first.

## Next steps, in order

1. **Read hosted CI** for this push: the jobs, not only the conclusion.
2. **AB-A-2b and AB-A-2d: registration.** Follow `ad3249aa`. For each graph:
   - `src/demonstrations.ts`: add after `elevation`. `reduction`, path `/bezeg-2.0/bezier/reduction`; `arc-length-param`, path `/bezeg-2.0/bezier/arc-length`. Family `/bezeg-2.0/bezier`. New title and prompt keys in `sl.ts` and `en.ts` beside the `reduction_` and `arcparam_` blocks. Slovenian titles: *Nižanje stopnje*, *Naravna parametrizacija*.
   - `src/graphs/graphFactories.ts`: import and factory. `src/Routes.test.tsx`: import, `graphFor`, count plus 2. `src/demonstrations.test.ts`: `expected` rows after `bezier/elevation`, both counts plus 2, the Bézier family count 8 to 10.
   - `src/demonstrationPosterPending.ts`: add both ids. `PresetCatalog.test.tsx`: move both keys from `PENDING_ROUTE_KEYS` to `CURVE_STREAM_KEYS`.
   - `familyChapters.test.ts` `CHAPTER_LINK_PENDING` and the opt-out list in `lessonCatalog.test.ts`: add both ids with a comment. `scripts/demonstration-preview-recipes.cjs`: a recipe each, not run.
3. **Browser check of both routes** with `bezeg-smoke` Sonnet at 1440×900 and 390×844, Slovenian and English. Look especially at both captions against the curve at 390 px, the D3 details list, playback and pause, reduced motion, the PH kind, and whether pausing on any board press feels right. This is the first time these graphs run in a browser.
4. AB-A-3a and AB-A-3b lessons, AB-A-4 chapter (`advanced-bezier`, owning D1, D3 and D4), AB-A-5 cards and posters, AB-A-6 gate. Then Batch B (D2; `CurvePairGraph` is on `master`, see geometry handler 53's note in [geometry.md](../../../tasks/feature-streams/geometry.md)) and the rest of Batch C.
5. The low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) step 5, with its polish items.

## Open for the owner

Unchanged from [handoff 55](handler-handoff-55.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices.

## Risks and notes

Handoff 57's "Risks and notes" still apply, and those it inherits.

- **Commit before a repair pass, and give every brief a private scratch path.** `/tmp` is shared by every job, and a worker's backup names collided with old ones, overwriting two uncommitted files ([incident](../../advanced-bezier/ab-a-2-graphs.md#incident-files-overwritten-during-the-repair)). Say in each brief: no backups in `/tmp`.
- **Size D3-like slices smaller.** The D3 worker hit 135k with its tests unrun. A graph with a plot and a frame loop is two slices.
- **Give a board caption budget in the brief.** Both workers put long sentences on the board. Board lines stay under 40 characters; the rest goes to the inspector.
- Subagent transcripts are in the session's `subagents/agent-<id>.jsonl`; the task `.output` paths are empty.
- D1 reaches P and P2 only by dragging, a Preset file or a lesson scene. If free exploration feels thin once the lesson exists, add an example selector.
- Bash heredocs holding several quoted blocks failed to parse here; use the Write tool for long documents.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-58.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
