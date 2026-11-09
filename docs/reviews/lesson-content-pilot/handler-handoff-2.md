# Lesson content pilot: handler handoff 2 (writer-model previews)

Reviewers must not read this file: it maps configs to models.

## State

- The writer-model comparison is complete and pushed: `model-comparison/results.md`, `best/`, `drafts/`, `reviews/`, `repeat/` and `cost-log.md`. The results commit is `e4c860e8`. The dollar-cost update is in the commit that adds this note.
- Config key: w-a Opus high, w-b Sonnet high, w-c Haiku max, w-d Fable low, w-e Sonnet medium (baseline).
- Scores (mean /27): w-b 22.4, w-d 22.4, w-e 20.9, w-a 20.8, w-c 20.7. Verdict: Sonnet high for first drafts. Fable ties it at 2.6 times the price. Opus and Haiku give no gain.
- Dollar costs come from per-request transcript usage at list API prices. Scripts: `C:/tmp/mc/cost.py` and `usage.py`, which read `~/.claude/projects/*lesson-content-pilot*/*/subagents/*.jsonl`. They are untracked scratch files.

## Standing owner directions (verbatim)

> I want you to keep the best rewrites from them so I can judge at the end and see if it's worth using better models.

> also tokens per lesson mean nothing to me, I want you to use the current api pricing (or w/e is used in my usage estimates) to estimate that

> can you spin up preview servers that would have this content in, so I can judge it from the actual site?

> At your own context handoff, write handler-handoff-<n+1>.md, commit and push it, then start your successor yourself with claude --bg the same way and pass this rule on.

## Next: preview servers (not started)

Decision (handler 2, made without confirmation per standing rule): one preview per writer config, so the owner can compare models on the real site. Plus the current site as the r0 reference.

1. **Branches.** For each config X in a–e, create a git worktree on a new local branch `preview-w-X` from `origin/master` (for example `git worktree add .claude/worktrees/preview-w-X -b preview-w-X origin/master`). These branches are preview-only: **never merge or push them to master**. Pushing them as non-master branches is optional.
2. **Ports.** Port `drafts/w-X/<lesson>.md` into the lesson sources in that worktree. Use `bezeg-worker`, Sonnet medium, one lesson per worker.
   - Sources: `bezier-pilot` → `src/learning/content/guidedLessons.ts` (lesson around lines 303–452, scene helpers 128–184). `subdivision-guided` → `constructionGuidedLessons.ts`. `curve-curvature-guided` → `curveGeometryGuidedLessons.ts` (scenes around 228–247). `polynomial-zeros-guided` → `schoolFunctionGraphsBatchBGuidedLessons.ts` (from about line 64).
   - The four lessons live in different files, so up to three workers can run in one worktree. First check whether lesson text also goes through `src/localization/sl.ts`/`en.ts`. If it does, they become a shared file: give them one owner, or port a worktree's lessons sequentially.
   - Brief: **transcribe faithfully**. Keep the wording, steps, frames and scenes as written; do not improve the text or fix the blockers listed in `results.md`, because the owner is judging each model's output. Where the runtime cannot do something, take the closest achievable scene and log it in `model-comparison/previews/w-X.md` (deviations, ≤150 words).
   - Keep the `lessonMathNotation` rules: `\(...\)`, `{,}`, doubled backslashes in TS strings. Update test expectations that pin step counts or text, such as `lessonCatalog.test.ts`, only as far as the port requires.
3. **Checks per worktree.** Run `npx tsc --noEmit --pretty false`, then focused `just unit` on the touched lesson tests and `lessonMathNotation.test.ts`, then `just build`.
4. **Serve.**
   - Run `just preview <port>` per worktree in the background: w-a 4401, w-b 4402, w-c 4403, w-d 4404, w-e 4405. Serve current master (r0) on 4400, from a clean `origin/master` worktree or the main checkout if it is clean.
   - Confirm each URL with curl. Then give the owner one table: port, model, score, and the four lesson URLs (find the guided-lesson route with `just smoke-lesson` or the catalog).
   - Optionally have a Haiku `bezeg-smoke` open each lesson once to confirm it loads, using `just smoke-lesson <ids>` per worktree.
5. **Closeout.** Commit the deviation notes on this branch and push to master as AGENTS.md describes (docs only). Report to the owner and leave the servers running.

## Open

- Clean-Opus caveat: Opus wrote from a plan made in an over-budget run.
- Owner judgement of `best/` and the previews is pending.
- The shipped curvature defect (`scripts/curve-curvature-guided.r0.md:39`) is recorded in `results.md`. Fix it when that lesson is next edited.

## Settings

Handler Opus 5.5, permission mode auto. Workers `bezeg-worker` Sonnet medium; at most 3 at once.
