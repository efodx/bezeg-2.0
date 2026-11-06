# Curves stream: handler handoff 59

Handler 59 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 58](handler-handoff-58.md).

## State

- **On `origin/master`:** everything through this note: both routes registered and the browser repairs. Handoff 58's push is green in every hosted job, deploy included.
- **Not on `master`:** the D1 and D3 lessons with their wiring. They are the one commit after this note, local on `worktree-stream-curves` and pushed to `origin/curves-lessons-d1-d3` for safety. They wait for review (step 2). Push them to `master` after it; delete nothing.
- The remote `worktree-stream-curves` is stale and diverged; leave it and never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 12.3 GB free at the start; check it first.
- FFmpeg and `gh` as in [handoff 58](handler-handoff-58.md#state). Read hosted CI with the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`): `just ci` fails without `gh`.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `c6357d83` | AB-A-2b, AB-A-2d: routes `/bezier/reduction`, `/bezier/arc-length`, `lesson: false`, posters pending, recipes not run | `just check` passed in full on this tree (24 minutes), the first full run over the graphs |
| `a5a39055` | Browser repairs below; `ArcDetails` is now the shared `src/graphs/curves/ReadoutDetails.tsx` | Focused unit tests and lint; each new test failed under mutation. No browser recheck yet |
| This note's commit | Statuses, delegation log | |
| Next commit | AB-A-3a, AB-A-3b lessons and wiring | [Record](../../advanced-bezier/ab-a-3-lessons.md) |

Hashes are from before the rebase onto `origin/master`.

**First browser run** (`bezeg-smoke` Sonnet, `c6357d83`, both viewports and languages): 11 of 13 checks passed, no console error, no horizontal scroll. Decisions:

- Fixed: D1's five board lines covered the curve at 390 px. The board keeps reducibility and maximum error; an inspector list holds all five.
- Fixed: D3's disabled position slider stayed at 0 during playback. The inspector renders every 250 ms, not per frame.
- Fixed: the position input overhung the panel at 1440 px. Its label is now short (*Lega točke*), assuming the wrapped label caused it. **Not rechecked.**
- Left: a bare click on the board does not pause playback; a press-drag does. That reads as right: a click moves nothing. Handoff 58's question is answered.
- Left: D3's two captions touch axis ticks at 390 px, not the curve.

## Next steps, in order

1. **Read hosted CI** for this push: the jobs, not only the conclusion.
2. **Review the lesson commit**, then push it. Parallel `bezeg-reviewer` Sonnet: engineering (scene independence, navigation, wiring) and mathematics (quoted numbers, formula blocks, the D3 straight-line argument). Prose is one-shot and outside review. Start with the [record's open items](../../advanced-bezier/ab-a-3-lessons.md#open-items). Add `degreeReductionGuidedLessons` and `arcLengthGuidedLessons` real-`LessonSession` checks if review wants them now the lessons are wired.
3. **Narrow browser recheck** with `bezeg-smoke` Haiku on a fresh build: D1's two lines and details list at 390 px, D3's slider moving during Play, the input at 1440 px. Then a Sonnet walk of both lessons looking at the board: each scene's curve clear of the lesson panel at 390 px, and D1's tall view `[-1.5, 9.5, 5.5, -1.5]` not leaving the curve too small on a desktop board.
4. AB-A-4 chapter (`advanced-bezier`, owning D1, D3 and D4: move the three interim owners in `guidedLessonOwnership.ts`, empty `CHAPTER_LINK_PENDING`), AB-A-5 cards and posters, AB-A-6 gate. Then Batch B (D2; `CurvePairGraph` is on `master`, see geometry handler 53's note in [geometry.md](../../../tasks/feature-streams/geometry.md)) and the rest of Batch C.
5. The low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) step 5, with its polish items.

## Open for the owner

Unchanged from [handoff 55](handler-handoff-55.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices.

## Risks and notes

Handoff 58's "Risks and notes" still apply, and those it inherits.

- **`just check` takes about 24 minutes** when other jobs share the machine. A `src/learning` unit run alone passed 500 s; start it in the background.
- **Check a worker's frame count.** The D3 worker reported 16 frames; there are 15, and the smoke's floor caught it. Count steps times two plus calculation frames.
- **Parallel lesson workers with the handler doing the wiring worked**: no write conflicts and neither hit 135k (119k and 125k). Brief: tell them not to build while a smoke uses `dist`.
- `DegreeReductionGraph.tsx` has mixed line endings. Match edits line by line.
- A `re.escape` of a label escapes its spaces, which ESLint rejects in the smoke spec.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-59.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
