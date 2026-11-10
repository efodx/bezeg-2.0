# Families-prep state note

Handler 1 (started 2026-11-10). Rewritten at each handoff.

## Setup done

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` in this worktree.
- PIK M-MAT-2026 text: `C:\Users\1337Hacker\AppData\Local\Temp\pik-2026\M-MAT-2026.txt` (`pdftotext -layout`, diacritics stripped; TOC at lines 70–90). If missing, re-download from the URL in the expansion research's Sources and re-extract.

## Spec pipeline

Shared worker brief: [spec-brief.md](spec-brief.md). One Sonnet `bezeg-worker` writes two specs; the handler reviews against families-prep.md "Specs", dispatches a Sonnet `bezeg-reviewer` mathematical review of the concept contracts, repairs, adds the row to `new-lesson-families.md`, commits and pushes.

| Pair | Specs | State |
| --- | --- | --- |
| A | #1 trigonometry-lessons.md, #6 circle-geometry-lessons.md | dispatched 23:24Z |
| B | #2 analytic-lines-lessons.md, #5 isometries-lessons.md | dispatched 23:24Z |
| C | #3 combinatorics, #9 recursion-growth | queued |
| D | #7 kinematics, #14 waves-sampling | queued |
| E | #4 randomness-simulation, #8 solids-volumes | queued |
| F | #10 level-sets (E9), #13 phase-portraits (E5) | queued |
| G | #15 mechanical-curves (E10), #11/#12 amendments | queued |

After specs: F0 per family (handler-only), then F1 kernels, then F2a for #1, #2, #5, #6.
