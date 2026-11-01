# Learn UI stream: handler handoff 8

Date: 2026-11-01. Handler 6 stops at its context threshold. Earlier context: [handoff 7](handler-handoff-7.md). Source: [spec](../../../specs/guided-example-highlights.md), [tasks](../../../tasks/guided-example-highlights/README.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

## Done this session

- Rebased onto `origin/master` (clean); scene inventory unchanged by Platform A4/A7. `just check` on that HEAD: typecheck and lint passed, and all unit tests passed except two failures that came from 03a edits landing mid-run (copy test, previews test). Both pass on the final tree.
- **Batch 03a (bezier-curves) accepted and pushed** with task 01: `master` at `d19b8586` (feature commit `3480c155` before the rebase; see `git log`). Details and the out-of-scope extrapolation preview-tail finding are in the stream record.
- Hosted CI run 41291109433 on that push: checks, build and `unit (2)` passed; `unit (1)` was **cancelled** by concurrency (no test failure). Re-run of the failed job queued. **First step for the successor: `gh run view 41291109433`**. If it fails for real, fix it before pushing anything else.

## In flight: batch 03b (foundations, rational-curves, splines)

The worker stopped at its context budget after part 1 only. **Uncommitted** in this worktree, unchecked:

- `src/learning/content/familyChapters.ts`: six standalone figures removed (audit §3 rows 1–6), with SL/EN prose for reading-bernstein and complex-plane.
- `src/learning/content/familyChapterSequences.ts`: `fig0` removed from four sections, with SL/EN sentences carrying the absorbed distinctions.

Worker plan for the rest (frames, fixtures, formulas, planned start fallbacks): [03b-worker-handoff-1.md](03b-worker-handoff-1.md). Summary: start recipes planned for complex-multiplication (the "Show product" button cannot be pressed by any step kind), worked-weight, circle and parabola-derivatives. Farin points are `slider` elements, so check them with `types` only. The stacked-area Bernstein samples are hand-derived and unverified.

Next for 03b:

1. Run `just unit src/learning` on the figure removal first. Chapter and sequence tests may assert figure counts or `fig0` indices; fix what they show. Review the prose diff (notation rules, SL/EN parity).
2. Dispatch a fresh worker for recipes, expectations, copy and inventory, using the 03a brief pattern (commit `3480c155`) and the worker note. Tell it to read each graph's visible curve and point count before setting `curveCount`. In 03a, a subdivision overlay was the third curve.
3. Handler: `just build`, `just preview 4387` (background), then the full capture `node scripts/capture-guided-example-previews.cjs docs/reviews/illustrated-chapter-examples/capture-inventory.json`. View every changed PNG and check alt text against the image (03a's Bernstein alt was wrong). Then the focused checks, the commit, and the push.
4. Task 03's completion also requires smoke for these chapters in both languages (launch/return, narrow layout) and `docs/reviews/guided-example-highlights/batch-a-note.md` for task 05.

Then 04a, 04b and 06, as in handoff 7 *Next* 3. D10 (quintic card d = −2.5) is still open with the owner.

## Notes

- Test slots are contended: `just build` waited 632 s. The stream runs one worker at a time.
- `do-log` records for handlers 3–6 are still unwritten (03a: one Sonnet worker, about 102k tokens and 51 tool uses, with three handler repairs; 03b part 1: about 145k tokens and 78 tool uses, partial).
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet; capture preview on 4387; smoke `SMOKE_PORT=4312`.
