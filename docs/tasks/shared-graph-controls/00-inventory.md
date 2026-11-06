# 0. Inventory

Source: [shared graph controls](../../specs/shared-graph-controls.md), Order step 1. Read-only: no application code changes.

## Work

Write `inventory.md` in this folder: one row per panel under `src/graphs` and `src/learning/playground`, naming for each capability C1–C30 whether it uses a shared control, a local version or a proposed exception. The two audits are a sample; the [second audit's reports](../../reviews/shared-graph-controls/) carry false and imprecise rows, so check each claim against source and prefer the spec where they differ.

Settle these open items:

1. Areas neither audit covered: about 15 function graph bodies, Coons and Triangular patch behaviour, focus order, zoom and pan keys, selection hit-testing, patch surface drag, and `src/learning/playground`.
2. Whether every draggable point on curve and function boards has a typed path (decision 11). List any that does not.
3. Whether Show all equals host Fit on Notable and EulerLine (C20). `showAll` frames vertices and shown centres; host Fit frames every visible board point.
4. Which local Reset buttons give the same result as the host Reset (decision 5).
5. How the lesson runner handles a `DomainError` from `applyLessonAction`, such as a Correlation add at the cap (C23).
6. Which lesson views depend on the unconditional refit after an add on Interpolation and Hermite (decision 6).
7. Any typed clamp beside `LinearMapGraph`, and any drag refusal beside PointSet and Correlation (decisions 3, 7 and 8).
8. Runtime checks: the Monotone step base, and whether Sequence and De Boor announce during Play.

## Acceptance

- Every panel has a row, and every capability a shared-control target or a proposed exception with its technical or mathematical reason.
- Items 1–8 each have an answer with evidence, or a named reason they could not be answered.
- The spec's *Likely exceptions* section lists each proposal, and its *User impact* lists each proposed Reset removal.

## Stop

The owner confirms exceptions and Reset removals. End this task by setting `Run state: stopped: task 0 exceptions need the owner` and listing the proposals with a recommendation. Start nothing further until the owner answers.

## Checks

Documentation only. Any browser check for item 8 uses a production build on port 4317.
