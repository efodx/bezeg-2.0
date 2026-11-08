# Collision stream — handler handoff 3

Written 2026-11-08 by handler 3 at `BUDGET SOFT`, with CP9 committed but not pushed.

- **Worktree:** `.claude/worktrees/stream-collision`, branch `worktree-stream-collision`, port 4320.
- **Task table:** [collision-playground tasks](../../../tasks/collision-playground/README.md).
- **Settings:** Opus handler, `--permission-mode auto`.
- **Workers:** `bezeg-worker` Sonnet. Reviewers: Sonnet for engineering and mathematics, Haiku for routine slices. Smoke: Sonnet for a first pass, Haiku for rechecks.

## State

**Pushed to master and CI green:**
- 9a9a5f1a: CP8–CP10 task files.
- aa16b1fe: the catalogue smoke test's timeout raised to 150 s. It had taken 55 s against 60 s, and 1437c137 had been red once.
- aee538f1 and 88dec476: CP8 polygon model, accepted after a mathematical review.

**Local only:** b9dd9781 (CP9) and this note's commit sit on top of 88dec476. They are not pushed because CP9 is learner-visible and two smoke fixes still need their browser recheck.

## Next steps, in order

1. **Recheck CP9 with Haiku.** Start `just preview 4320` from a fresh `just build`; the last build was after the D1/D2 fixes but rebuild anyway. Dispatch `bezeg-smoke` (Haiku) with the skill path `.agents/skills/smoke-tester/SKILL.md`, in both languages at 1440×900 and 390×844:
   - **D1:** the `bezier-hulls` section of `/bezeg-2.0/learn/convexity-hulls` shows a link on "pri trkih" / "in collision detection" that lands on `#convex-hull`.
   - **D2:** in polygon mode, Pause, then change the count with PageUp. The readouts and the live region show nonzero box tests. "Removed by boxes" is no longer every pair.
   - Also look at a touching ring at a higher count; the first pass saw none at 10 objects.
   - Defects are in [cp9-browser.md](../../collision-playground/cp9-browser.md).
2. **Accept and push CP9.** Set the CP9 row in the task table to accepted, add an evaluation-log record (inputs below), and run `just publish --recipe runtime --base 88dec476 --commits <CP9 sha>,<docs sha>`. Then check `just ci <sha>`.
3. **CP10, batch C acceptance:** [10-batch-c-acceptance.md](../../../tasks/collision-playground/10-batch-c-acceptance.md).
   - `just collision-containment` on `/bezeg-2.0/learn/convexity-hulls` in polygon mode. The script (`scripts/collision-containment/README.md`) may need a selector for the polygon block. Run it with `MSYS_NO_PATHCONV=1` in Git Bash, and read the raw JSON before accepting a number.
   - Then the lifecycle mode, `just check`, a bilingual Sonnet smoke, the matrix in `docs/reviews/collision-playground/batch-c-acceptance.md`, the results in the performance doc and the performance plan link, and the stream file set to Released.
   - The harness page `CollisionHarness.tsx` (route in `src/Routes.tsx`) has no `shape=polygon` option. Add it only if the containment script needs the no-chapter baseline for polygons.

## CP9 facts for the evaluation record and review

- **First worker:** Sonnet, 141k tokens, 49 min. It stopped at the budget signal with a handoff note.
- **Continuation worker:** Sonnet, 59k tokens, 32 min.
- **Engineering review:** Sonnet, 34k tokens. Should-fix items: a per-frame array allocation in `drawPolygons`, fixed by the handler with `TEMPLATE_OUTLINES`; and the polygon naive limit called "measured" when it is fitted, now reworded in the spec and in `collisionProtocol.ts`.
- **UI/accessibility review:** Haiku, 47k tokens. Should-fix: the polygon announcement. Nits: the box readout's count and the hull dot width.
- **Fix worker:** Sonnet, 33k tokens, 14 min.
- **Smoke:** Sonnet, 45k tokens, 15 min, 5 of 7 items passed.
  - D1: the link label was not a substring of the paragraph, so the renderer dropped the link.
  - D2: a rebuild posted zero counters. This was true for circles too.
  - The handler fixed both. The new D2 test was seen failing with zeroed counters.
- **The worker misreported** that no harness page exists. The handler corrected `cp9-notes.md`.
- **Checks on b9dd9781's tree:**
  - `just unit src/learning/playground/collisions src/learning/content src/learning/chapter` (296 s);
  - `npx tsc --noEmit`;
  - `just lint src/learning src/localization scripts/collision-step-benchmark`;
  - `just build`;
  - a control-character scan of every CP9 file, which was clean.
- **Stream hazard:** script, heredoc and inline-Python edits turned LaTeX escapes (`\t`, `\b`, `\a`) into control characters. This happened in CP8's spec edit and in the handler's own evaluation-log edit. Write such text with the Edit tool and scan before committing.

## Open, no action unless the owner asks

- Hidden-tab pause has unit evidence only. No phone has been measured.
- The playground's colours are not re-read on a theme change. That is pre-existing, and the app has no dark theme yet.

## Successor rule

At your own handoff, launch your successor with the same flags (`claude --bg -n "collision handler <n+1>" --agent bezeg-handler --model claude-opus-5-5 --permission-mode auto "<prompt>"`), and pass this rule on.
