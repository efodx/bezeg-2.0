# Curves stream: handler handoff 64

Handler 64 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired at turn 47. It replaces [handoff 63](handler-handoff-63.md).

## State

- **On `origin/master`:** everything through this note. **Batch B:** AB-B-1 to AB-B-2b done. `bezier-clipping` is routed and live at `/bezeg-2.0/bezier/clipping`, `lesson: false`, poster pending.
- **Uncommitted in this worktree: AB-B-3, partial, with 4 of 12 tests failing.** Files: new `src/learning/content/bezierClippingGuidedLessons.ts` and `.test.tsx`, plus edits to `guidedLessons.ts`, `src/demonstrations.ts`, `guidedLessonOwnership.ts`, `lessonMathNotation.test.ts`, `guidedExamplePreviewCopy.ts` and its test, `lessonCatalog.test.ts`, `tests/guided-lessons.smoke.spec.cjs`. Do not commit them to `master` as they are. Check `git status` first; the same work is saved on `origin/curves-ab-b-3-wip`, a single commit that is a copy, not a branch to continue. Delete nothing.
- `origin/curves-lessons-d1-d3` is a safety copy, already on `master`. The remote `worktree-stream-curves` is stale; never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 10.6 GB free when last read; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `d6aeb75a` | Read hosted CI of handoff 63's push | Run 42172447262: every job passed, `deploy` ran. The `32556619` failure is repaired |
| `8f6fb8fb` | AB-B-2b: registration | `just check` passed before the commit: 11 905 tests, build |
| `7f64a23c` | AB-B-2b: browser pass, drag measurement, `scripts/clipping-gate-perf.cjs` | [Browser](../../advanced-bezier/ab-b-2b-smoke.md), [measurement](../../advanced-bezier/ab-b-2b-perf.md). Run 42178918393: every job passed, `deploy` ran |

Handoff 63's three browser questions are closed: grey dashes do not hide B; the inline table styling fits at projection and phone width and stays; the tangent pair at \(10^{-10}\) really reaches `limit` at 200 clips.

## Next steps, in order

1. **Read hosted CI** for this note's push. It changes only documents.
2. **Finish AB-B-3 from the [worker note](../../advanced-bezier/ab-b-3-worker-handoff.md) and the [brief](../../advanced-bezier/ab-b-3-brief.md).** The first worker is past budget; start a fresh `bezeg-worker` Sonnet medium. **Do not take the note's advice on failure 4**; see below. The other three failures are test-side. Then mutations (at least three), typecheck, lint, the listed unit paths, `SMOKE_PORT=4314 just smoke-lesson bezier-clipping`, a `bezeg-reviewer` Sonnet pass of the scene actions and quoted numbers, the record `ab-b-3-lesson.md`, and **full `just check` before the push**: the slice changes catalog lists.
3. AB-B-4 to AB-B-6, in the [plan](../../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06). AB-B-4 removes `bezier-clipping` from `CHAPTER_LINK_PENDING`; AB-B-5 from `POSTER_PENDING`, running the recipe added here for the first time.
4. The rest of Batch C.
5. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4.

## The tangent pair at \(10^{-10}\): what is really there

Handler 64 read the kernel's output directly. The run is `limit`, 200 clips, one result and 28 unresolved pairs.

- **Handler 64's brief said all 28 are near \(0{,}5\). That is false**, and the lesson text at `bezierClippingGuidedLessons.ts` lines 221 to 224 repeats it. 26 are near \(0{,}5\); the last two, never processed, are wide: \(A\in[0,\,0{,}5],\ B\in[0{,}625,\,1]\) and \(A\in[0{,}5,\,1],\ B\in[0,\,1]\). The test at line 225 failed correctly. Fix the text and assert the real shape, not a looser test. The brief is corrected.
- **The one result does not contain the root.** It is \([0{,}49999950002,\ 0{,}49999950091]\), about \(5\cdot10^{-7}\) below \(t=\tfrac12\), and the table prints it as *0,5–0,5*. The curves' gap there is \(16(5\cdot10^{-7})^2=4\cdot10^{-12}\), the size of the keep margin \(10^{-12}\) at scale 4, so the margin is the likely reason; handler 64 did not trace it. Acceptance 2 holds: the status is `limit`, and \(t=\tfrac12\) stays in unresolved pairs. The lesson must not call this range the touching point. **Decide in the review** whether the table's six decimals mislead here. Any display change is a graph slice, and it must not touch the kernel without a reason.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoffs 61 to 63's "Risks and notes" still apply, and those they inherit.

- **A lesson and its test file are over budget in one slice here.** This worker reached 135k at turn 38 with 12 tests written and 4 failing. Brief text and scenes first, tests second, as handoff 63 says of graphs.
- **A worker's "loosen the test" is a finding until read.** Failure 4 looked test-side and was a false claim in the prose, from the handler's own brief.
- **Numbers read from the first eight table rows do not describe the rest.** That is how the brief went wrong: the smoke saw seven rows at *0,5–0,5*.
- **The drag measurement's board update times exclude the grid-snapped run;** see the [handler reading](../../advanced-bezier/ab-b-2b-perf.md#handler-reading-curves-handler-64). A drag that stays near a tangency was not measured. The AB-B-6 gate may cite the note with that limit.
- **Offset pair in a Preset file:** with `gridStepExponent` \(-1\), coordinates are stored as integers of the grid step: \(A=(0,0),(20,40),(40,0)\), \(B=(0,45),(20,5),(40,45)\).
- `git rebase` refuses a dirty tree. If `origin/master` moved, commit the finished slice first.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-64.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
