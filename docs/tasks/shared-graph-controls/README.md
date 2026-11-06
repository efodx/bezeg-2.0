# Shared graph controls task queue

Status: scheduled, 2026-11-07. Source and acceptance: [shared graph controls](../../specs/shared-graph-controls.md). Run by the [`controls` stream](../feature-streams/controls.md), which holds the status of each step; this index holds no second status.

| Task | Covers | Depends on |
| --- | --- | --- |
| [0. Inventory](00-inventory.md) | Complete inventory, exceptions and Reset removals. Read-only | — |
| [1. Foundation](01-foundation.md) | Workstream 1 inputs, C6–C8, C17, C21–C23, C28, fixture, lint rule | Task 0 |
| [2. Shared point controls](02-shared-point-controls.md) | C1–C5, C14, C16, C18, C19 | Task 1 |
| [3. Family sweeps](03-family-sweeps.md) | Migration of compgeo, projective, functions, curves, patches | Task 2 and contracts tasks 2 and 3, run by the same stream |
| [4. Remaining controls](04-remaining-controls.md) | C9–C13, C15, C20, C24–C27, C29, C30, closeout | Task 3 |

[Phone playback](../mobile-graph-playback/graph-adjacent-controls.md) follows once C12 and C24 settle the playback control.

The spec holds the decisions and acceptance; these files only slice them. Record evidence next to each task as `<task>.evidence.md`. A change to a decision or an exception goes in the spec, with its reason.

Line numbers in the audit reports date from `2f548f65`; locate code by search.
