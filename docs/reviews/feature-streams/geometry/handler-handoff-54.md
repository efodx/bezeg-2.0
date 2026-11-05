# Geometry stream: handler handoff 54

Written 2026-11-05 by handler 54 (Opus 5.5, auto, effort medium). Continues [handoff 53](handler-handoff-53.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher reached 175k with tasks 28, 29 and the F5 poster done.

## Done this run

1. **Hosted CI gap found.** The push of handoff 53 never verified Batch 3. Run 41972716173 (`86eed561`, code) was cancelled by the docs push, and the docs run 41972746491 passed in 25 s with `checks`, `build`, `unit`, `chromium` and `deploy` all skipped. A manual dispatch (41972922776) passed `checks`, `build` and all Chromium shards on `d18a34cb`; a Curves push then cancelled its units, so the `smoke` gate failed and deploy was skipped. The push carrying this note is the first full run of Batch 3.
2. **Task 28 accepted.** `set-trace-step`, lesson A6 (7 steps, 17 frames), chapter section `bezier-hulls`.
3. **Task 29 accepted.** 27 new tests in `compgeoBezierHullsLesson.test.ts` and `BezierHullsLessonActions.host.test.tsx`; three observed mutations (logs `29-mut1..3`).
4. **F5 poster captured,** selective, viewed by eye. Pending list after the rebase: `curve-comb`, `curve-evolute` (Curves').
5. **Browser smoke:** 10 pass, 0 fail ([report](../../convexity-hulls/f6b3-smoke/report.md)). It covers the Preset save and reload, the grab inside a filled kept piece, chapter focus return, exports, and the SL→EN switch. Its scripts are renamed `.cjs.txt`: `just check` lints `.cjs` files under `docs/reviews`.
6. **Review:** no blocker. Its one repair is in (lesson view top 6.5). Its assertion note at `compgeoBezierHullsLesson.test.ts:146` is left: redundant, not wrong.

## Decisions made

- **Half-unit points cannot be reached.** `set-points` forces `gridStepExponent` 0, and the grid step is 1. Step 5 gives the doubled-grid twin \((0,0),(4,8),(8,0)\) and \((1,6),(5,-2),(9,6)\) instead of saying the student can move \(B\) half a unit. The smoke typed it: 2 of 256.
- **Discarded pairs are not drawn thin.** Reading the card-hidden pictures (`f6b3-smoke/hidden-step*.png`) showed all four hulls thick at step 4: each piece is still in a kept pair. Step 4's observation and `bezierhulls_playback_note` now speak of pieces.
- **Step 6** now says the curves only seem to touch at this zoom, and to zoom in. **Step 7** names the Skrij button, because the coordinate fields are inert while the card is open.
- The lesson card covers the board at 1440×900. The accepted `hull-robustness` lesson does too, so this is the platform's behaviour, not an A6 defect. Screenshots for the picture check must hide the card (`f6b3-smoke/h1.cjs.txt`).

## Branch state

`origin/master` holds everything, including this note. Evidence logs under `docs/reviews/convexity-hulls/` stay untracked, as before.

Gates: `just check` passed at `6b79df51` before the last rebase (default transient scope). After resolving the `CHAPTER_LINK_PENDING`, opt-out and `POSTER_PENDING` conflicts as unions: typecheck, `just unit src/learning src/demonstration src/Demonstration src/Routes src/graphs/base/presets src/graphs/compgeo/BezierHulls src/compgeo/curvePair` (472 s), build and `just smoke-lesson bezier-hulls` passed at `87a77d14` (log `f6-rebased.log`). The lesson view margin came after the screenshots were read.

## Next steps, exactly

1. Confirm the **full** hosted run for this push: `gh run list --branch master`, then check that `unit`, `chromium` and `deploy` ran (`gh run view <id> --json jobs`). If a newer docs-only push cancelled it, a descendant's green run proves nothing: dispatch `gh workflow run browser-smoke.yml --ref master`.
2. F6 acceptance as task 29's end says: the criterion-to-test matrix for spec A6, in `docs/reviews/feature-streams/geometry/f6-convexity-batch3-acceptance.md` (template: the Batch 2 record). Glance at `hidden-step6.png` again at the new view if you recapture.
3. Docs: `GLOSSARY.md`, `docs/capabilities.md` (no `bezier-hulls` lesson entry yet; `hull-robustness` is at line 80), `docs/current-architecture.md` (it still says `hull-robustness` has no poster and no lesson; correct it). Update the convexity README's last row and the stream status line.
4. Convexity is then complete. Record the evaluation entries for this batch.
5. **Cleanup needs the owner.** `origin/geometry-batch2-wip` and `origin/geometry-batch3-wip` can be deleted with permission. The other lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Ask before acting.

## Risks and lessons

- **Push code and docs together.** Each job cancels the same job of an obsolete run, and a docs-only run skips everything, so a docs push right after a code push silently loses verification and deploy. Any other stream's push cancels too.
- **A background wrapper's exit code is the last pipe's.** `just check ... | tail` showed 0 on a failed check. Record `$?` in the log and read it.
- **Heredocs through the Bash tool halve doubled backslashes** in Python strings. Use Edit for lesson text; `lessonMathNotation.test.ts` caught it.
- Worker 28 went to 135k in 57 turns: the lesson's research took more than the brief allowed for. Split a lesson's reading from its writing if another one comes.

## Live processes

The 215k self-watcher, stopped at this handoff. No worker or preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet; Haiku for a routine visual check), smoke `bezeg-smoke` (Sonnet). At most two at once, each with the watcher the launch hook prints.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 56" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same, only if work remains.
