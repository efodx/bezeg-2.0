# Families-prep state note

Handler 1 handed off at BUDGET SOFT (2026-11-10, about 02:20Z). Successor: handler 2. Rewrite this note at each handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- PIK M-MAT-2026 text is at `C:\Users\1337Hacker\AppData\Local\Temp\pik-2026\M-MAT-2026.txt` (`pdftotext -layout`, diacritics stripped, table of contents at lines 70–90). If it is missing, re-download it from the URL in the expansion research's Sources and extract it again.
- No git hooks are configured. Commits are slow on this machine, so give them about 300 s.

## Done (all on `origin/master`)

- **Specs:** all 15 accepted after a mathematical review, each listed in `new-lesson-families.md` with its status in the stream file. #11 and #12 are Batch D amendments of `linear-maps-lessons.md` and `complex-maps-lessons.md`.
- **F0:**
  - #1 trigonometry: `docs/tasks/trigonometry/`, ADR 0044.
  - #6 circle geometry: `docs/tasks/circle-geometry/`, ADR 0045.
  - #2 analytic lines: `docs/tasks/analytic-lines/`, ADR 0046.
- **F1:** the #1 trigonometry kernel `src/trig/` (`6af77364`), tasks 01–02 done.

## In the worktree, not committed: #6 circle F1 (task 01)

`src/compgeo/circleConstructions.ts` (377 lines) and its test file (19 tests).

- The worker reports that `just unit src/compgeo/circleConstructions`, a whole-repo `tsc` and `just lint src/compgeo` pass.
- It saw mutation failures for M1 (tolerance), M2 (coaxal folded into parallel), M3 (Apollonius sign) and M4 (sign of \(k\)).
- Decisions it made: invalid or off-grid input throws `RangeError` and degenerate cases return a status; it added `makeCircle` and `apolloniusContains`; inexact lines are unit-normal doubles.
- It found a spec wording error: the CG4 "tangent segments \(\sqrt{96}\), \(\sqrt{84}\)" are the distances between the two contact points, not lengths from \(X\). Fix the spec when accepting.

**Next step:** dispatch the mathematical review of this kernel (Sonnet `bezeg-reviewer`, same prompt shape as the trigonometry kernel review), repair, commit, push, and mark task 01 done in `docs/tasks/circle-geometry/README.md`.

## Pipeline that worked

- **Specs:** one shared brief (`spec-brief.md`) and a short dispatch prompt. Every spec review found real errors, so never skip the review.
- **F0:** the handler writes one ADR for the spec's decisions, a task README with the gate column and terms, F1 and F2a task files, and one gated `NN-release-batches.md` that is split when Controls step 7 opens.
  - Check the next ADR number on `origin/master` first, because other streams add ADRs.
  - About 15k handler tokens per family.
- **F1:** one worker per task file, with a brief that names the task file, the spec sections and the ADR, a list of required mutations, `just unit <path>`, `tsc` and `just lint <path>`. Then a mathematical review and a handler recheck before the commit.

## Next, in order

1. Circle F1 review and acceptance (above). Then analytic-lines F1: dispatch `docs/tasks/analytic-lines/01-line-kernel.md`.
2. F0 for #5 isometries (spec decisions in `isometries-lessons.md`; record the frieze model's bounded "exactly seven" check), then its F1.
3. F2a for #1, #2, #5 and #6, which is allowed now: trigonometry tasks 03–05, circle task 02, lines task 02. These need an engineering plus UI and accessibility review, and a performance measurement during dragging. There is no route, so no smoke.
4. F0 and F1 for #3, #4, #7–#10, #13–#15, and the F1 gaps for #11/#12, which are `src/linear/iterate2.ts`, `stability2.ts`, `complexPower.ts` and `eulerCircle.ts` per the amendments. F2a for these waits on Controls step 5.
5. When only gated work remains, set `Run state: stopped: preparation done; F2a (playback, 3D) waits on Controls step 5 and F2b–F5 on Controls step 7`, push, and end.

Rules to keep: two workers at once; the boundary list in `families-prep.md` is binding even when a spec says otherwise (#3's F2a waits on step 5); never edit shared host files.
