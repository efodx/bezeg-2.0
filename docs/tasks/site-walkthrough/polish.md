# Site walkthrough: `polish` session queue

Source spec: [shell and label polish](../../specs/site-walkthrough-shell-polish.md) (package B of the [intake](../../specs/site-walkthrough-intake-2026-11-14.md#11-disposition-2026-11-14)). State note: [state](../../reviews/site-walkthrough/polish/state.md).

Rule from the owner, 2026-11-14: items with one correct result are pushed when verified (H01, D01, M01, M02). Items that depend on his taste (H05, D02, L02, L03) stay on a local branch and are shown in the preview until he approves. For M03 the inventory and a recommendation are written; graphs beyond the two reported ones are migrated only after his answer.

| # | Item | Intake IDs | Push rule | State |
| --- | --- | --- | --- | --- |
| 1 | Remove the homepage footer | H01 | push | see state note |
| 2 | Header brand proportions | H05 | owner approval | see state note |
| 3 | Capture corners follow the card | D01 | push | see state note |
| 4 | Catalog topic, title and action typography | D02 | owner approval | see state note |
| 5 | Chapter previous / next and return control | L02, L03 | owner approval | see state note |
| 6 | Point inventory | M03 | push (documentation) | see state note |
| 7 | Interval Sweep cursor, blossoming and Interval Sweep labels | M01, M02 | push | see state note |
| 8 | Shared movable-point path: recommendation | M03 | owner answer before migration | see state note |
| 9 | Spec status, completion evidence, preview for the owner | all | push | see state note |

The state note carries the current state of each row; this file only fixes the order and the push rule.
