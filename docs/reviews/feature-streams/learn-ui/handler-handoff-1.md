# Learn UI stream: handler handoff 1

Date: 2026-10-31. Handler 1 (Opus 5.5, `--permission-mode auto`, `--effort medium`) reached the 150k soft threshold and hands off.

## Where things are

- Worktree `.claude/worktrees/stream-learn-ui`, local branch `worktree-stream-learn-ui`, backed up as `origin/stream-learn-ui` at `794e41d`. The local branch is **not yet rebased** onto `origin/master`. It still contains `4bbc161`/`aeca86d`/`794e41d`, which are patch-identical to master's `192f0e8`/`c2e9c17`/`ece8730`, so a rebase drops them. Only `7be3f5b` (PG2 WIP) is branch-only. Step 1 of the next session: `git fetch && git rebase origin/master`. Expect the three duplicates to be skipped, leaving `7be3f5b` on top of master, which includes `a6cd11a` (test-slot fix: 1 shared slot of 4 workers; path-filtered `just unit` is capped at 2 workers).
- `node_modules` in the worktree is a **junction** to the main checkout's install. Delete the junction before removing the worktree.
- Pushing with a dirty tree: handler 1 cherry-picked accepted commits onto `origin/master` in a temporary `git worktree add --detach <job tmp>/push-wt origin/master`, pushed `HEAD:master`, then removed it. That avoids rebasing while workers have uncommitted edits.

## Accepted and pushed to master

| Slice | Commit on master | Evidence |
| --- | --- | --- |
| Run state `active` | `f571545` | — |
| PG1 drawing model | `192f0e8` | Unit tests pass, including the absolute 1e-12 kernel/Bernstein check, typecheck and lint. Sonnet mathematical review: one medium (smooth type with coincident neighbours) and three low findings, repaired by the handler with 5 new degenerate tests that fail on the pre-fix code. G1 tolerance note added to the spec. |
| LL1 Learn landing tasks 1–3 | `c2e9c17` | Unit (new plural/count test failed before the change), typecheck, lint, screenshots at 1440/1920/390, contrast 6.2–9.5:1. Hosted CI browser smoke **success** (run 41217229598). |
| LL2 Learn landing task 4 | `ece8730` | 390px height 2903/3037 (sl/en), down from 3299/3433. No horizontal scroll at 320–1920. Live language switch, focus order and hash scroll pass. Local smoke 11/11, possibly against a stale build. Hosted CI was running at handoff: confirm with `just ci ece8730`. If it failed, fix it before pushing anything else. |

Section 2 (Learn landing visual alignment) is **complete** once CI on `ece8730` is green. For the owner: on phones, LL2 hides each chapter's Contents counts visually (they stay for screen readers) so the read link and Contents fit on one line.

## In progress: PG2 (canvas, criteria 2, 4, 8)

WIP commit `7be3f5b` (branch only) contains `DrawingPlayground.tsx/.css/.test.tsx`, 20 `playground_*` keys after `chapter_restarted` in `sl.ts`/`en.ts`, the localization term rows and the spec's Terms section. The worker reported unit tests, `npx tsc` and lint passing.

Engineering and UI/a11y reviews are done. **Repair list:** [pg2-review-findings.md](pg2-review-findings.md). The two medium bugs to fix first: (1) the double-click toggle is probably dead in real browsers, because pointer capture retargets `dblclick` to the svg; (2) a double click on empty canvas adds two anchors. Also: the focus ring is an outline on `<g>`, and the anchor CSS has hard-coded hex colours. Next steps:

1. Dispatch one `bezeg-worker` (Sonnet 5.5 medium) with the findings file as its repair brief. It writes tests that fail on the current code, especially a double click dispatched to the svg.
2. Handler confirms local repairs. Re-review only if shared interfaces change.
3. Settle *ročica*: no external source was confirmed (inkscape.org returned 403). Check Inkscape's `po/sl.po` (`gitlab.com/inkscape/inkscape/-/raw/master/po/sl.po`, grep the `handle` msgids) and update the term row and spec.
4. Real-browser coverage of criterion 2 (pointer capture, touch scroll, 44px targets, Alt-drag, double click) needs a mounted route. Do it at PG4a/PG4b, or earlier through a temporary test page if the double-click fix needs browser proof.
5. Accept PG2 and push it to master. The spec allows PG1–PG3 to land before mounting.

## Remaining queue, in order

PG2 repair → PG3 overlays (Mathematical + UI review; the overlay context exposes `drawing, selectedAnchor, mode, unitsPerPx`, and PG3 owns selected-segment state, or adds it to the context) → PG4a chapter blocks, prose, terms, docs → PG4b performance measurement and smoke. **Stop condition:** a criterion 5 miss goes to the owner; do not push PG4a's chapter blocks before PG4b passes. Then section 3, guided example highlights: redo audit 00 against current master, then **stop and report** for the owner's decisions before tasks 03/04.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 medium. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` with `SMOKE_PORT=4312`. At most two workers. Start the worker watcher after each dispatch, and the self watcher at session start.

## Checks and revisions

- PG1: `just unit src/learning/playground/drawingModel.test.ts`, `just typecheck`, and lint on `src/learning/playground`, all at the dirty tree before `4bbc161`.
- LL1: CI success on `c2e9c17`.
- LL2: worker checks only, plus CI on `ece8730`, pending at handoff.
- `just check` has not been run. It runs once per feature at F6.
