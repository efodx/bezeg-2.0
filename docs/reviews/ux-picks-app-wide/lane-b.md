# Task 08 stream B: long-pole lanes (side handler)

Owner, 2026-11-27: task 08 runs as two parallel lane streams. Stream A (the board workspace handler, worktree
`.claude/worktrees/board-workspace`, branch `board-workspace-2`) runs the small lanes and owns integration, gates and
publishes. **Stream B (you)** runs the long-pole lanes, in this order: **L54, L50, L49, L44, L47**
(`inventory/08-partition.json`; L54 has 15 demonstrations in 5 sessions).

## Setup (once)

- In the main checkout (on `master`, clean apart from untracked files), `git merge --ff-only origin/master` first, so the
  project hook there carries the 175k worker signal (the hook runs from `$CLAUDE_PROJECT_DIR`).
- From the main checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`: `git worktree add -b lane-b .claude/worktrees/lane-b board-workspace-2`,
  then link `node_modules` as a junction to the main checkout's (PowerShell `New-Item -ItemType Junction`). Enter it with
  EnterWorktree by path. Never create a worktree inside another worktree. Before ever removing it, unlink the junction with
  PowerShell first (`(Get-Item <wt>/node_modules).Delete()`), or the shared `node_modules` is wiped.
- Read: the handler card `docs/agent-workflow/handler-card.md`, then the state note `docs/reviews/ux-picks-app-wide/state.md`
  ("Next slice's brief inputs" item 2 and the owner's 2026-11-27 line), then `briefs/08-lane.md` and a finished dispatch
  (`briefs/08-lane-L25.md`) as the brief template.

## Rules

- Work and commit only on branch `lane-b` in your worktree, one commit per lane (or per L54 session). **Never push, never
  publish, never touch master or `board-workspace-2`.** Stream A cherry-picks your commits into `board-workspace-2` and
  publishes; tell it by SendMessage to "Board workspace handler 11" (or its successor named in the state note) with the
  commit ids after each accepted lane.
- One lane at a time; one Sonnet `bezeg-worker` at a time (the owner allows two parallel lanes in total, one per stream).
  Worker HANDOFF is at 175k. Heavy commands queue machine-wide through the test slots; keep lane checks focused (graph-check,
  golden check for the id, own tests, tsc, lint, the lesson test), and run one `just build` + `just smoke-lesson` per lane.
- Standing owner permission: lane workers may wrap untagged writes in any shared test in `runAs('learner', ...)` with
  asserted values unchanged; any other shared-test change stops that parameter and is reported.
- Re-record a golden only when the difference is notes/rows/legend moving to cards (as stream A does). Check Slovenian
  rewording of lesson prose yourself; the term for pucks is *krmilnik*.
- Tough handler choices: consult a Fable advisor (Agent `Plan`, model `fable`, effort `high`, read-only brief with the
  facts and options; owner, 2026-11-27).
- Owner decisions go to the owner (AskUserQuestion) after you update this file's "Status" section.
- Budget: at `BUDGET HANDOFF` update "Status" below, commit it on `lane-b`, and start your successor from the main
  checkout with `claude --bg -n 'Board workspace lane B handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this file>"`, confirm it with `claude logs <id>`, and pass this rule on.
- Never end a turn with nothing running and nothing asked.

## Status

Rewritten by handler 3 (2026-11-28) after L47. Present state only.

### Where

- Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`, branch `lane-b` (`node_modules` junction;
  unlink with PowerShell before ever removing). Last merge of `board-workspace-2`: `f9204e8c6`. Merge again before each
  lane; conflicts are list unions (`fragments/index.ts`, `parity.test.tsx`, `*FirstTask.test.tsx`, lesson files, lane
  notes): keep both sides (a Sonnet worker resolves them; Grep `^(<<<<<<<|>>>>>>>)` before committing the merge).
- Stream A = **"Board workspace handler 15"**: send every accepted commit id there; it cherry-picks and publishes.
- Lane-b Vite dev server on 4484 (`npx vite --port 4484 --strictPort --host 127.0.0.1`, background; check the port's
  owner before restarting): `http://127.0.0.1:4484/bezeg-2.0/`. Lesson smoke port 4395. graph-check needs
  `MSYS_NO_PATHCONV=1` for `--route` in git-bash and `--base http://127.0.0.1:4484/bezeg-2.0` for its browser line.

### Done (all sent to A; picked unless noted)

- **L54** (15 compgeo), **L50** (8 analysis), **L49** (6 curve-geometry): see `git log lane-b`.
- **L44** (6 splines): spline-c1 `5935789bb` (hook `BaseSplineCurveGraph.declaresSplineWorkspace()`), c2 `af5c5c982`,
  cn `766eb9d20`, g1 `c694370af`, g1-symmetric `962cb4ef5`, parameterization `1032bb8fa`.
- **L47** (5 probability; brief `451b53c0d`): prob-density `573f10f56` + tsc fix `699b21b38`; prob-binomial-normal
  `84c0f92e7` + view fix `aabed49b9`; prob-clt `717a7430f`; prob-summary `553efeb38` + comment `e5e931268`;
  prob-correlation `130b5048c` (sent; pick not yet confirmed).

### Known, owned elsewhere

- The view director's zoom-out cap (`DEFAULT_MAX_OUT` 2.2, `src/workspace/view/fitIntent.ts`) is the owner's open
  lesson-mode question; prob-summary's `followBox()` works around it and names it for removal.
- Long lesson prompts / Orodja content clipped behind "Več vsebine" on short boards (prob-clt step 5 at 1280): owner.
- Stale clip/preview script rows: forwarded to A per demo; A repoints them in one slice.
- prob-binomial-normal: near-zero far-right bars (k≥12) tuck slightly under Odčitki in steps 2 and last (A: acceptable).

### How a demonstration goes

1. One Sonnet `bezeg-worker`: "read `briefs/08-lane-<L>.md` whole; finished examples <ids>; settled rules; order (a)
   fixture grep + parity, (b) conversion, (c) tests red first, (d) checks, (e) captures, view every image; ≤300 words;
   notes section <id>; never read stdin, scripts under `.command-logs/`". It usually hands off partway at 175k.
2. A finish worker from its notes section: remaining tests, checks, captures.
3. Accept: read the reworded Slovenian yourself (imperatives; "s krmilnikom X"; "v kartici Orodja …"; "v kartici
   Odčitki"; pronoun gender); open one 1280x720 capture; watched content under a card needs `must` marks plus a
   `followView` with a red-first test. Re-record the golden when only captions/rows moved
   (`BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`),
   commit with explicit paths (skip `*.report.txt`), send the id to A.

### Rules learned (copy into any new lane brief)

- Grep shared tests for a graph as an "undeclared graph" fixture before declaring; move it, or let the fixture override
  `declaration()` to undefined with a comment naming the lane (`BaseFunctionGraph.authority.test.tsx`, accepted by A).
- `parity.test.tsx` counts declared notes and rows; a caption moved into a row or note gets an `<id>Accepted` entry.
- FirstTask "pucks" tests query `#board-card-tools` after `openTools()`, shown red.
- Playback writing a puck's parameter uses an animation lease (`useLease`, ADR 0064).
- Owner, 2026-11-27: remove board captions and labels that repeat a legend entry or readout row.
- After a golden re-record, run `git ls-files "src/graphs/*golden.json" | sed 's#.*/##' | sort | uniq -d`: the check
  reads the first `<id>.golden.json` anywhere, so delete a stale shadowed copy of our id (A, 2026-11-28).
  L45 landed on `board-workspace-2`: `BaseRationalCurveGraph.declaresRationalWorkspace()` opt-in (only `rational` opts in); merge before rational-extrapolation and opt in from its subclass.
- Merging `board-workspace-2`: in `fragments/index.ts` keep exactly one import line per fragment (A has `subdivision`
  further down; drop lane-b's top-of-file copy), then tsc.
- A renamed control named by a guided-example recipe (`src/learning/chapter/guidedExampleHighlights.ts` set-control
  labels): update it there and in `guidedExampleHighlightExpectations.test.ts`, run
  `node scripts/generate-guided-example-inventory.cjs`, tell A (it recaptures).
- Narrow view marks on `kind`, never cast (strict readonly `ViewMark` on board-workspace-2).
- Puck rule (A, 2026-11-28): a range/choice/switch becomes a puck only if a lesson step asks the learner to set it;
  multi-value data editors and setup choosers stay in Orodja.

### Next

1. Stream A (handler 14, 2026-11-28) assigned more lanes, in order, after a merge of `board-workspace-2`:
   (a) **L41** extrapolation, rational-extrapolation, rational-subdivision, repeated-subdivision, subdivision
   (`constructionGuidedLessons`); (b) **L48** circle, decasteljau-alternative, farin (`rationalConstructionGuidedLessons`):
   first check whether it uses `BaseRationalCurveGraph`; A's L45 owns that base first, so if L48 needs it and L45 is not on
   `board-workspace-2`, tell A and wait for sequencing; (c) **L57** bernstein, complex-multiplication, rational-elevation
   (`foundationGuidedLessons`) last: ComplexMultiplicationGraph and rational-elevation are undeclared-graph fixtures in
   `src/workspace` and `src/graphs/base` tests (and `typedPointPaths.test.tsx:88`), so L57 first moves them to a test-only
   undeclared graph (values unchanged). Avoid (A owns): `src/graphs/curves/ph/**`, `src/graphs/curves/parametrisations/**`,
   `src/graphs/patches/**`, `BaseRationalCurveGraph` until L45 lands. Same rules; ids per demonstration.
2. Open for the owner from stream B: none.
