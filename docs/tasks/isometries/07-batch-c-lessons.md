# 07 Batch C: L4–L5 lessons (F3–F6)

Source: [isometries spec](../../specs/isometries-lessons.md), concept contracts L4–L5, and the [batch-wide acceptance gate](../../specs/isometries-lessons.md#batch-wide-acceptance-gate). Graph: `IsometryGraph` (task 03), route `/isometries`. Depends on 06 (Batch B released).

Slices F3–F6 as in [05](05-batch-a-lessons.md); the lessons join the chapter of task 05. Batch C also owes the rendered check that the frieze SVG path breaks at NaN (task 04).

Acceptance: the spec's acceptance for L4–L5; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: done 2026-11-15. F3 L4 `isometries-rosettes`, L5 `isometries-friezes` written and joined (handler 31; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-iso-c.md)); F4 cards captured (handler 31); F5 no new clip (the `isometries` poster and clip cover the Demonstration); F6 gate passed (handler 32: `just check` green at `fe6fbde1`; live smokes `.command-logs/iso-c/smoke/report.md` and `.command-logs/iso-c/f6/report.md`: direct open and refresh sl/en, card images, labelled inputs and refusals, point drag, frieze checkboxes and period slider by keyboard, restore on exit sl/en from a non-default free state, Presets with file export and import, Presentation mode, figure export, n = 12 with 24 distinct images, the 16 frieze combinations at period 4, L1/L3 and `linear-map` unchanged). Gaps: 390 px covered by the first smoke only; English for open/refresh and restore only.
