# Families-prep state note

Handler 4 handed off at BUDGET SOFT on 2026-11-11 to handler 5. The stream is active again (see "Restart" below). Two workers dispatched by handler 4 were still running at handoff (combinatorics `CountingTreeGraph`, randomness missing scene elements), and their reports go to handler 4, not to you. Watch their notes (`notes/f2a-comb-02.md`, `notes/f2a-rand-03.md`) and the working tree. Do not dispatch a second worker on either slice until its note shows the worker has stopped (final evidence, or a HANDOFF state). Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take two minutes or more while agents run. Give commits about 300 s and tsc about 200 s, and prefer the file tools for reading.
- Publish with `just publish --background --recipe runtime --base <last published local commit> --commits <ids oldest first>`, then check `just publish --status`. Pushed hashes differ from local ones, because publish rebases.
- The publish gate rejects trailing whitespace. Tell workers to check for it, and check yourself before committing.
- Edit spec text with the Edit tool. Shell or Python replacement strings must not contain `\b`, `\v`, `\a` or `\t`, because they write control characters. Check with `grep -cP '[\x00-\x08\x0b\x0c\x0e-\x1f]' <file>`.
- When two slices share `sl.ts`/`en.ts`, stage one slice's block alone with `.command-logs/h4-filter.py <keep-prefix> <drop-prefix> <out.patch>`, then `git apply --cached --unidiff-zero <out.patch>`. Confirm afterwards that the staged locale lines carry only the kept prefix.

## Done

- **F0:** all 15 families (ADRs 0044–0058).
- **F1:** all ungated F1 (handlers 2 and 3).
- **F2a** (handlers 2–4). Every graph has no route yet. Each passed engineering, UI/accessibility and maths reviews, and its repairs. Evidence is in `notes/f2a-*.md`.
  - Trigonometry 03–05: unit circle, and the triangle solver (`1a3784a2`).
  - Circle geometry 02: construction graph (`019b9edd`).
  - Analytic lines 02: line graph (`bf4c29eb`).
  - Isometries 03: isometry graph, committed by handler 4 at close.
- **Handler decisions at F2a** are recorded in the specs:
  - lines: a fixed [-17,17]² view, a normal arrow of fixed length, the second line through two points;
  - isometries: the L3 rotation choice, `rosettePoint`, the fixed point for k = 1, period 4–8;
  - trig 05: a solve-mode view that fits the solution, and vertex input clamped left of the bars (recorded in the task 05 note and commit).
- **Owed at F2b**, recorded in each family's release task:
  - browser drag measurements (every F2a drag time is a jsdom placeholder);
  - Preset restore through the model parsers;
  - a rendered check that the frieze's NaN breaks render correctly.
- **Controls-stream gaps** are filed in `docs/tasks/feature-streams/controls.md`: `NumberInput` may stay 40 px on touch in the inspector (a CSS specificity issue), and there is no checkbox group control.

## Restart (handler 4, 2026-11-10 evening)

The owner said "continue". Controls step 5 and step 7 are both `accepted` on master, so the stream is active again (Run state edited, uncommitted; commit it with the first slice). Publish history: the last stop commit `f1764b2c` was pushed as `f957d661`.

The worktree now uses branch `worktree-stream-families-prep-2`, created from `origin/master` at `328c2a2e`. Auto mode blocked `git reset --hard`. The old branch `worktree-stream-families-prep` holds only commits already on master. Publish base for the next slice: `328c2a2e`, or the current `origin/master`.

In flight. Both slices are larger than one worker context, so each worker gets one narrow step. Decisions are in each spec's new "F2a decisions" bullet (uncommitted; commit them with the slice).
- **Combinatorics 02** (note `notes/f2a-comb-02.md`):
  - Done: the model and its tests pass; the locale block sits before `projective_k1_board_label`.
  - Done: `LatticePathGraph`, with 27 tests and 12 mutations. Its jsdom placeholder: merged curves 6.5 ms against 23.1 ms per route.
  - In progress (dispatched by handler 4): a worker is building `CountingTreeGraph`, its tests and `just build`, then rewriting the note as final evidence.
  - Next: three reviews (engineering Sonnet, maths Sonnet, UI Haiku, at most two at a time), repairs, recheck, then commit with the spec edit, the Run state edit and this note.
- **Randomness 03** (note `notes/f2a-rand-03.md`):
  - Done: the model and the new `src/random/samplePaths.ts` are tested; the paths' tallies equal the kernel runners' tallies.
  - Done: the graph compiles, the 97-key `random_graph_*` block sits before `isometry_graph_board_label`, about 53 tests pass, and 10 mutations ran.
  - In progress (dispatched by handler 4): a worker is adding the missing scene elements (RS6 exact bars, Markov box, RS3 second shape, RS2 second plot, overlaid seeds, speed slider), the measurements and `just build`.
  - Next: three reviews, repairs, recheck, commit.
- **Update after handoff (handler 4): combinatorics 02 is ready for review.**
  - `CountingTreeGraph` is done: 33 tests and 15 mutations. The whole task passes tsc, `just unit` (122 tests), lint and build (exit 0).
  - `notes/f2a-comb-02.md` is the final evidence.
  - Put these doubts in the review briefs:
    - Unordered kinds always show the table, because `treeShown` needs `ordered`.
    - The k! orderings per combination are a readout list (k = 1..4), not a drawn grouping.
    - The weight bars scale to the tallest bar, and the caption does not say so.
    - `combinatorics_counting_cap_weights` now uses Unicode superscripts, because `^` rendered as `<sup>` markup.
  - Next: three reviews, repairs, recheck, commit, publish.
- **Update after handoff (handler 4), randomness:**
  - The randomness worker stopped at HANDOFF with all six scene elements implemented. Owed: graph tests, mutations, measurements, tsc, lint, build, README term rows, and the final note.
  - Never restore from `.command-logs/rand03d-*.orig`: those are pre-session copies and would wipe the new work.
  - Dispatch a fresh worker from `notes/f2a-rand-03.md`.
- If the workers' reports do not reach the successor, read their notes and the working tree. A note rewritten as final evidence means the slice is ready for review.

Next, in rank order, at most two in the stream:
- F2a: kinematics 02, recursion 02, waves 02, mechanical-curves 02, phase-portraits 03, solids 03 (3D, measure first), level-sets 04, linear-maps 11, complex-maps 09.
- Then a Controls-compliance review of the four earlier F2a graphs (trig 04–05, circle 02, lines 02, isometries 03) against `docs/specs/shared-graph-controls.md`. Their task files expect a follow-up once Controls R1 settles readouts, and R1 is now accepted.
- Then F2b–F6 per family release task. Read the family template in `docs/tasks/feature-streams/README.md` and its shared-file rules first.

Shared controls are in `src/inputs/` and `src/graphs/base/controls/` (PlaybackButtons, StepCounter, ReadoutParts, LiveReadout). Rules: `docs/specs/shared-graph-controls.md` and `docs/specs/playback-button-reasons.md`.

## Pipeline that worked

- **F1:** each brief carries the task file, spec sections, ADR, required mutations, independent oracles, `just unit <dir>`, tsc, `just lint <dir>` and a whitespace check. Then a Sonnet maths review, given a checklist that names every spec doubt the worker raised.
- **F2a graphs:** expect two or three worker handoffs per graph: model, then graph, then verification. Brief each successor from the note. Then run three reviews: engineering (Sonnet), maths (Sonnet) and UI/accessibility (Haiku). Run them one or two at a time, within the two-agent stream limit. One repair worker follows, and the handler rechecks unit, lint, tsc and build.
- Each brief opens with the previous review findings: help linked to every field, visible ranges, board captions for every element the readouts name, no hard-coded captions, a derived cache keyed on state identity, lines through two owned hidden points, a real rebuild test, and disposal back to the pre-mount count. This cut repeat findings, though the UI review still found new ones on each graph.
- Mutation backups go in `.command-logs/<slice>-<name>.bak` and never in `/tmp`. A stale `/tmp/orig.tsx` destroyed one graph, which then had to be rewritten.
- One repair worker sent only "placeholder" as its report. Its note had the real state, and the handler reran the checks.

Rules to keep: at most two workers in the stream at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
