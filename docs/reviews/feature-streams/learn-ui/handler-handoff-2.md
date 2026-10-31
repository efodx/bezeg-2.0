# Learn UI stream: handler handoff 2

Date: 2026-10-31. Handler 2 (Opus 5.5, `--permission-mode auto`, `--effort medium`) hands off after PG4a. It hands off by judgement rather than by watcher: Claude Code killed every background watcher, the self watcher included, because the machine was critically low on memory. Do not assume a watcher is running. Restart the self watcher only if memory allows.

## Where things are

- Worktree `.claude/worktrees/stream-learn-ui`, local branch `worktree-stream-learn-ui`, clean at `53fc732` plus this note.
- `origin/master` contains everything through PG3 (`438343c`).
- The branch has one commit beyond master, `53fc732` PG4a, backed up as `origin/stream-learn-ui-pg4a`. The old `origin/stream-learn-ui` (at `794e41d`) is stale; ignore it. Never force-push it.
- `node_modules` is a junction to the main checkout. Delete the junction before removing the worktree.
- Other streams push to master often, and each push cancels the running browser smoke (`cancel-in-progress`). Judge CI by the next completed run that contains your commit, not by the run on your own commit.

## Accepted this session

| Slice | Commit | Evidence |
| --- | --- | --- |
| LL2 CI | `ece8730` | Hosted browser smoke **success** on `6c31ee6`, which contains it. Section 2 is complete. |
| PG2 repair and acceptance | `4a0382c`, `db0c23e` on master | All 11 review findings repaired, and the new assertions fail on the pre-repair code. Handler ran playground unit tests, typecheck and lint, before and after the rebase. *Ročica* is confirmed by Inkscape `po/sl.po` (1.3.x; "Handle" → *Ročica*). The two-placement sync is documented in the spec's Persistence section. |
| PG3 overlays | `024f04a`, `438343c` on master | Mathematical review found no defect. UI/a11y review found 6 items, all repaired ([pg3-review-findings.md](pg3-review-findings.md)). Tests use hand-computed values, and each assertion group fails under a mutation. Handler ran unit, typecheck, lint and `check-localization` (with build), before and after the rebase. |
| PG4a chapter integration | `53fc732`, **branch only** | Engineering review found nothing blocking. The handler added a reserved-height lazy fallback in `ChapterPage.css`. Unit (content, chapter, playground and notation tests), typecheck, lint and `check-localization` passed on the final code. Handler `just build` passed, with the playground in its own lazy chunk `DrawingPlayground-*.js` (15 KB) and absent from the main index chunk. |

## Next: PG4b (criteria 5, 7, and real-browser 2)

**Stop condition:** push `53fc732` to master only after PG4b passes. A miss against criterion 5 goes to the owner; do not push until the owner accepts it.

1. Rebase onto `origin/master` and rebuild.
2. Performance (criterion 5, spec line 116). No harness exists: `scripts/bezier-benchmark` cannot be built. Dispatch one `bezeg-worker` to write a Playwright frame-interval script, for example `scripts/playground-perf.cjs`, against `just preview` on `SMOKE_PORT=4312`.
   - Seed a 20-anchor closed drawing through `localStorage['bezier-playground.drawing.v1']` before load, open `/bezeg-2.0/learn/bezier-curves`, and drag one handle with scripted mouse moves while sampling `requestAnimationFrame` intervals.
   - Run in the draw block with no overlays, and in the inspect block with all four switches on (one curve included).
   - Run on desktop 1440, and at 390×844 with 4× CDP CPU throttling.
   - Record median and p95 next to the JSXGraph phone baseline (median 100 ms, p95 183 ms; [results](../../../bezier-performance-results.md)) in `docs/bezier-performance-results.md` or the spec.
   - Targets: median ≤16.7 ms on desktop, ≤33.3 ms throttled.
   - Memory is tight; run serially and close browsers.
3. Real-browser criterion 2 plus the PG2/PG3 carry-overs. Run on desktop and at 390×844 with touch:
   - double-click type switching after pointer capture, and a double click on empty canvas adding one anchor;
   - Alt-drag; touch scroll outside the canvas; 44 px targets; the focus-visible ring;
   - in inspect mode, a segment press against append and drag; overlay label overlap;
   - the keyboard-only path building and closing a four-anchor shape and moving a handle.
4. Smoke (criterion 7): use `$smoke-tester` with `bezeg-smoke` and `SMOKE_PORT=4312` on `/bezeg-2.0/learn/bezier-curves` in SL and EN, including a live switch. Check that both blocks mount in the right sections, the spline link works, and the drawing persists across reload into both placements. Run the Learn landing as a regression check.
5. If everything passes: push PG4a and PG4b to master, wait for a completed CI run that contains them, and mark section 1 accepted in `docs/tasks/feature-streams/learn-ui.md`.

Then section 3, guided example highlights: redo audit 00 against current master, then **stop and report** for the owner's decisions before tasks 03/04.

## Open items

- `do-log` evaluation records for this session's dispatches were not written: the PG2 repair, the PG3 implementation, the two PG3 reviews, PG4a and the PG4a review. All workers were Sonnet 5.5 medium, and none needed `HANDOFF`. PG4a returned partial because the slow machine kept its final checks from finishing; the handler completed them.
- Joint codes C0/G1/C1 stay untranslated, with a localized legend. Owner may revisit.
- `just check` has not been run. It runs once per feature at F6.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 medium. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` with `SMOKE_PORT=4312`. At most two workers, and fewer while memory is low.
