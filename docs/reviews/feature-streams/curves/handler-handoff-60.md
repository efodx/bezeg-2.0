# Curves stream: handler handoff 60

Handler 60 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 59](handler-handoff-59.md).

## State

- **On `origin/master`:** everything through this note: the D1 and D3 lessons with their repairs and the `advanced-bezier` chapter. Handoff 59's push (`228f2690`) is green in every hosted job, deploy included.
- `origin/curves-lessons-d1-d3` is a safety copy of the lesson commit, now on `master`. Delete nothing. The remote `worktree-stream-curves` is stale; never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 11.2 GB free at the start; check it first.
- FFmpeg and `gh` as in [handoff 58](handler-handoff-58.md#state). Read hosted CI with the public API (`/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `2f7346db` | Review repairs of D1 and D3: four over-general claims, D1 decimal whitelist, D3 session tests; browser walk | [Record](../../advanced-bezier/ab-a-3-lessons.md) |
| `a6df91f7` | AB-A-4 chapter, three owners moved, `CHAPTER_LINK_PENDING` empty | [Record](../../advanced-bezier/ab-a-4-chapter.md) |
| This note's commit | Delegation log | |

**`just check` has not run on these commits.** Hosted CI is their first full run.

## Next steps, in order

1. **Read hosted CI** for `2f7346db` and this push: the jobs, not only the conclusion.
2. **AB-A-5:** chapter cards for `reduction`, `arc-length-param` and `patch-coons`, and posters for the first two (`POSTER_PENDING` empties). Templates: `62523452` and `3335bd59` for cards, [CG-B2-5 media](../../curve-geometry/cg-b2-5-media.md) for the capture flags. Touchpoints: `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` in `guidedExamplePreviews.ts`, `scripts/generate-guided-example-inventory.cjs`, `scripts/capture-guided-example-previews.cjs`, the card row in `guidedExamplePreviews.test.ts`, `src/images/learning/examples/advanced-bezier/`. `patch-coons` is a surface: its entry needs `expected.surface` ([commands](../../../commands.md)). Whether chapter mode can mix board and surface cards is not yet checked; check that first. Compare preview copy with the posters: handler 59 wrote it blind. The `advanced-bezier` thumbnail may then move to a better poster.
3. **AB-A-6 gate.** Then Batch B (D2; `CurvePairGraph` is on `master`, see geometry handler 53's note in [geometry.md](../../../tasks/feature-streams/geometry.md)) and the rest of Batch C.
4. The low-priority list, unchanged from [handoff 51](handler-handoff-51.md#next-steps-in-order) step 5, with its polish items, plus: D1's curve is 86 px wide at 390 px after *Opazuj na grafu*. A lesson view has one box for all viewports.

## Open for the owner

Unchanged from [handoff 55](handler-handoff-55.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices.

New, for the owner to overturn if unwanted: the second Learn strand is now *Ploskve in napredne teme*, and the `?example=` ids of the three lessons under their interim owner stopped resolving ([record](../../advanced-bezier/ab-a-4-chapter.md#breaking-change)).

## Risks and notes

Handoff 59's "Risks and notes" still apply, and those it inherits.

- **The lesson panel covers the board at 390 px on every lesson**, compact frames included. Judge a phone board after *Opazuj na grafu*, never with the panel open.
- **Name frames in a smoke brief.** "Naslednji okvir" moves one frame; a walker that counts steps stops halfway.
- **`elementFromPoint` hits `guided-lesson-graph-catcher`,** a transparent overlay, while the panel is open. It says nothing about visible cover.
- **`git status` can show a file as modified after a worker's reverted mutation.** Check `git diff`, which was empty here.
- **Strands must follow chapter order** (`LearningPage.test.tsx`), so a chapter's strand is tied to its place in `familyChapters`.
- **Python here prints in cp1252:** set `PYTHONIOENCODING=utf-8` before printing Slovenian, or a script can stop between its writes.
- **A `cd` in a Bash command changes the session directory:** use full paths.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-60.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
