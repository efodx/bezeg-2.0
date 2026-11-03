# Geometry stream: handler handoff 42

Written 2026-11-03 by handler 42 (Opus 5.5, auto, effort medium). Continues [handoff 41](handler-handoff-41.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run

1. **T3 23/24b, the F6 matrix and the poster recipes are on `master`** (`37a4922f..ed7f816d`).
   - Rebased twice. The second rebase followed master's fixes: functions `fourier-coefficients` (`37a4922f`) and curves' `prob-correlation` transient test (`7e4e8c23`).
   - The count conflicts in `familyChapters.test.ts` and `lessonCatalog.test.ts` were mechanical. `CHAPTER_LINK_PENDING` and the lessonless list now hold `fourier-coefficients` and `prob-correlation`.
   - The focused units and tsc passed before the push.
   - The owner confirmed in this session that a push failing only on functions' `PresetCatalog` would be allowed. It was not needed, because master turned green.
2. **T3 F6 gaps:**
   - the B4 prerequisite/caveat test, with 2 mutations (`737ce397`);
   - capabilities and glossary entries (`1b97297a`).
3. **Joint poster capture** (`22295a42`): all 11 `POSTER_PENDING` ids, every image viewed. The `monotone-triangulation` window was shifted. Notes to Curves (`prob-clt` reads empty) and Functions (`fourier-coefficients` bottom clipped, `rational-function` label overlap) are in the stream file's Notes. The catalog and motion smoke specs pass.
4. **Bilingual smoke and the F6 record:**
   - Smoke: [f6-t3-smoke.md](f6-t3-smoke.md). Record: [f6-t3-acceptance.md](f6-t3-acceptance.md), **partially accepted**.
   - Perf at 40 sites: 16.7 ms median frame interval.
   - The smoke failures are in shared lesson runtime: Next moves focus to the section, Exit returns focus to its invoker, and the lesson card covers the board at 1280×720.

## Branch state

Branch `stream-geometry` in this worktree. The last commit is the one recording this note; it is pushed to `master` if the full `just check` (`42-check2.log`) passed, and the stream row names the hosted CI run. If the note says nothing more, check `git log origin/master` for `handler handoff 42`.

## Next steps, exactly

1. Check that this note's commit is on `origin/master` and that hosted CI for it is green. If CI is red, read the failure first, and only then touch anything else.
2. **Close the one open T3 F6 row:** Gate 3 projection readability (B4.4).
   - With `just preview 4313`, capture V steps 4 and 5 and D step 3 at 1280×720 with the lesson card hidden ("Skrij"), dragged aside, or in "Predstavitveni način".
   - View the images. If they are legible, mark the record accepted and update the stream row.
   - Otherwise, write a note to learn-ui in its stream file.
3. Send the shared-runtime findings to learn-ui: a note in `docs/tasks/feature-streams/learn-ui.md`, citing `GuidedLesson.tsx:323` (Next moves focus to the section) and the card covering the board at 1280×720.
4. Then S3 (C5 Fortune). Its release condition is T0 and T3 accepted plus a beach-line performance measurement. No task files exist yet, so start from the sweep spec.
5. Worktree cleanup still needs the owner, who has refused `--force`/`-D` before. Ask before acting. The list is in handoffs 40 and 41.

## Risks and lessons

- Never chain `git rebase` with a test run: a conflicted rebase leaves the tree half-applied.
- `bezeg-smoke` resolves to Haiku. Its watcher fired at 78k, and it still finished.
- The full check lints `docs/reviews` scripts. Lint the smoke folder before `just check`.
- Rebuilding swaps `dist` under a running preview, so wait for any smoke run first.

## Live processes

None. The previews on 3012 and 4313 were stopped, and the smoke worker returned.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, watcher at 135k (78k for Haiku). Reviews: `bezeg-reviewer`. Smoke: `bezeg-smoke`.
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 44" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor starts its own successor the same way and tells it to do the same.
