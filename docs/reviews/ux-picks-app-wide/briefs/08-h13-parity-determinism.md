# Parity recordings depend on the live view: find and fix the root cause

Role: `bezeg-worker` (Opus), edit permission. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`, branch `board-workspace-2`. Never commit, push, stash or create a worktree. Another worker edits logistic-map, growth, cobweb, counting-tree graphs and sl/en in the tree: leave those alone. One heavy command at a time, foreground.

## Observed

- Master CI (run 46007508407, unit shard 6) failed `src/graphs/base/declare/parity.test.tsx > parity recording extrema > records deterministically and every state changes a shown value`: two recordings of the same states differ in the "globalni maksimum/minimum" board label lines. Log `.command-logs/h13-ci1-failed.log` (strip ANSI). Locally extrema passes alone.
- The full `parity.test.tsx` run, under load, fails the same way on the sequence sample: the "N = 11" / "N = 30" captions present in one recording, absent in the other, either way round. `-t sequence` alone passes.
- Both graphs choose board text from the view: extrema `isCompact()` / `freeWidthPx()` (`src/graphs/functions/ExtremaGraph.tsx` ~211-238) = intent box x-range × `board.unitX` (the currently shown scale); sequence `thresholdInView` (`SequenceGraph.tsx:264`). Reduced motion in the harness (`1fd7cd606`) is already in.
- A previous worker changed `src/graphs/base/declare/parity.ts` (uncommitted; `git diff` it) to record only after panel, captions and bounding box are stable for 2 frames. It did not cure the sequence failure. Keep, change or revert it on the evidence.

## Goal

Recordings are deterministic regardless of load and test order, and the fix is at the cause:
- If graph text depends on a transient (mid-glide view, a scale read before the board is sized, a ResizeObserver or card-layout timing), the graph must compute from a settled quantity (e.g. the intent box and the target scale, not the current `unitX`), or the view must settle synchronously under reduced motion. Prefer fixing the shared mechanism (view director / BoardView / harness board size) over per-graph patches, if it is one mechanism.
- Do not loosen the determinism assertion, add retries, or exclude captions from the comparison.

## Method

1. Reproduce: run the full file under load (e.g. `just unit src/graphs/base/declare/parity.test.tsx` while a second `just unit src/graphs/functions` runs, or with fewer workers/more files) until it fails; record the frequency.
2. Instrument temporarily (remove afterwards): per recorded state log board size, intent box, `unitX`, glide in progress, and the text decision inputs, for both recordings, and diff them on a failure. State which input differs and why.
3. Fix; show the failure gone: the full file passes 5 times under the same load that reproduced it (logs `.command-logs/h13pd-*.log`). Then `BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx`, `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t extrema` and `-t sequence`, `just unit src/graphs/functions/Extrema src/graphs/functions/Sequence src/workspace/view`, tsc, eslint on changed files.
4. If a product behaviour changes (labels in the browser), say what changes for a learner.

A Fable advisor is available for a hard design choice: return `QUESTION:` with the choice and its options instead of guessing.

## Return

≤250 words: cause with evidence (`file:line`, the differing input), fix with `file:line`, reproduction frequency before and after, check results with log paths, browser-visible effect if any. Notes to `docs/reviews/ux-picks-app-wide/briefs/notes/08-h13-parity-determinism.md`; at `HANDOFF` write done/next there and return partial.
