# Families-prep state note

Handler 4 stopped the stream on 2026-11-10 (Run state `stopped: preparation done`). All ungated work is done. No successor was launched, because the owner restarts the stream when a gate opens. The next handler rewrites this note.

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

## Remaining (gated)

- F2a slices that need playback or 3D wait on Controls step 5.
- F2b–F5 for every family wait on Controls step 7.

## Pipeline that worked

- **F1:** each brief carries the task file, spec sections, ADR, required mutations, independent oracles, `just unit <dir>`, tsc, `just lint <dir>` and a whitespace check. Then a Sonnet maths review, given a checklist that names every spec doubt the worker raised.
- **F2a graphs:** expect two or three worker handoffs per graph: model, then graph, then verification. Brief each successor from the note. Then run three reviews: engineering (Sonnet), maths (Sonnet) and UI/accessibility (Haiku). Run them one or two at a time, within the two-agent stream limit. One repair worker follows, and the handler rechecks unit, lint, tsc and build.
- Each brief opens with the previous review findings: help linked to every field, visible ranges, board captions for every element the readouts name, no hard-coded captions, a derived cache keyed on state identity, lines through two owned hidden points, a real rebuild test, and disposal back to the pre-mount count. This cut repeat findings, though the UI review still found new ones on each graph.
- Mutation backups go in `.command-logs/<slice>-<name>.bak` and never in `/tmp`. A stale `/tmp/orig.tsx` destroyed one graph, which then had to be rewritten.
- One repair worker sent only "placeholder" as its report. Its note had the real state, and the handler reran the checks.

Rules to keep: at most two workers in the stream at once; never edit shared host files. At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
