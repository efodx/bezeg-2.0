# Brief: task 08 step 3 — golden values for every remaining demonstration

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push.

## Goal

Task 08 step 3 (`docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`): "record every remaining demonstration's present panel
values with the parity tool, in one run, before any lane removes a panel." Remaining = the 125 demonstrations in lanes of
`docs/reviews/ux-picks-app-wide/inventory/08-partition.json` (13 are declared).

The parity tool today records hand-written `SAMPLES` (`src/graphs/base/declare/parity.test.tsx`, `parity.ts`; recordings in
`src/graphs/**/__parity__/<id>.json`). Hand-writing 125 samples is lane work; this step needs an automatic baseline:

- States per demonstration, generated: the default state, then **each step of each lesson on it** with its scene applied
  synchronously (reuse how `src/learning/content/declarationContract.test.tsx` finds lessons per demonstration and applies a
  step's scene), deduplicated when two states record identical outputs. Cap at about 12 states per demonstration.
- Recorded with the parity recorder's existing panel walk (same output format), into
  `src/graphs/**/__parity__/<id>.golden.json` next to the graph (a separate name so a lane's own hand-written
  `<id>.json` recording does not collide).
- A check mode that compares the current panels against the golden files, in the same test file or a sibling
  (`parityGolden.test.tsx`), enabled by an env flag like the existing ones (`BEZEG_PARITY_GOLDEN_RECORD=1`,
  `BEZEG_PARITY_GOLDEN_CHECK=1`), filterable to one demonstration (env var or test name filter), and skipped by default so
  `just check` stays as fast as now.
- Teach `just graph-check <id>` (`scripts/graph-check.cjs`) to run the golden check for that id when a golden file exists,
  as a separate row (it does not replace the declaration's parity). One line in `docs/guides/converting-a-graph.md` section 7.

## Acceptance

1. One record run writes a golden file for each of the 125 (list any that cannot be recorded, with the reason: no panel output,
   a crash under jsdom, a lesson scene that throws). Log to `docs/reviews/ux-picks-app-wide/briefs/notes/08-golden-record.log`.
2. Check mode passes on all of them immediately after recording, and is deterministic: run it twice.
3. Red check: change one shown value in one graph temporarily (e.g. a format decimal), see the golden check fail with a
   readable difference, restore.
4. `just graph-check function-inverse` shows the golden row passing.
5. `npx tsc --noEmit --pretty false`; `just lint <changed files>`.

Owned: `src/graphs/base/declare/` (new golden test/helpers; do not change existing parity rules), `scripts/graph-check.cjs`,
the guide line, the new `*.golden.json` files. Do not edit graph files, lessons or all-graph suites.
Run the unit tests path-filtered in the foreground with a long timeout; never bare `npm test`/`npx vitest`.
Send independent reads in one message.

## Return

At most 300 words: counts recorded / skipped with reasons, run time of the record and check runs, the red failure text,
files changed. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-golden.md`.
