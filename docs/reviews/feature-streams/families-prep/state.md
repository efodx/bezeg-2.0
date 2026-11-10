# Families-prep state note

Handler 1 (2026-11-10). Rewritten at each handoff.

## Setup done

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` in this worktree.
- PIK M-MAT-2026 text: `C:\Users\1337Hacker\AppData\Local\Temp\pik-2026\M-MAT-2026.txt` (`pdftotext -layout`, diacritics stripped; TOC at lines 70–90). If missing, re-download from the URL in the expansion research's Sources and re-extract.

## Specs

Shared worker brief: [spec-brief.md](spec-brief.md). Pipeline: a Sonnet worker writes two specs; a Sonnet `bezeg-reviewer` reviews the mathematics (recomputes every number); the handler repairs or sends the repair back to the writer; the handler adds the index row in `new-lesson-families.md` and the stream status, then commits and pushes. Every spec review so far found real errors, so do not skip the review.

Accepted and pushed: #1 trigonometry, #2 analytic-lines, #3 combinatorics, #4 randomness-simulation, #5 isometries, #6 circle-geometry, #7 kinematics, #8 solids-volumes, #9 recursion-growth, #10 level-sets-optimization, #13 phase-portraits, #14 waves-sampling.

Pending: #15 `mechanical-curves-lessons.md` (new) and the Batch D amendments of `linear-maps-lessons.md` (#11) and `complex-maps-lessons.md` (#12). These are written, not committed, and under mathematical review.

## F0 and F1

- #1 trigonometry: F0 done (`docs/tasks/trigonometry/`, ADR 0044). F1 tasks 01 and 02 are dispatched to two workers (notes `notes/f1-trig-01.md`, `notes/f1-trig-02.md`).
- F0 pattern: one ADR for the spec's decisions, a task README with the gate column and terms, F1/F2a task files, and one gated `06-release-batches.md` that is split when Controls step 7 opens. Check the next ADR number on `origin/master`, because other streams add ADRs too.

## Next

1. Accept the trig F1 kernels (mathematical review), then F2a tasks 03–05 (#1 may build graphs now).
2. F0 for #2, #5 and #6 (F2a allowed), then their F1 kernels and F2a.
3. F0 and F1 for #3, #4, #7–#10 and #13–#15, plus the kernel gaps for #11/#12. F2a for these waits on Controls step 5.
4. When only gated work remains, set the Run state as the stream file says and end.
