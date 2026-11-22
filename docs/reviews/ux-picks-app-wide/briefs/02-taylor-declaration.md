# Brief: Taylor declares itself, the worked example (task 02, slice 8, first pilot)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. Another worker is editing `src/learning/` (lesson model, guided lessons, Taylor's lesson file): do not touch `src/learning/`. A fuzz run may use the browser: unit tests only, foreground.

## Goal

Taylor's declaration reproduces what its present inspector and board text show, as pure data, and is the example every other conversion copies. Nothing renders it. Sources: `src/graphs/base/declare/graphDeclaration.ts` (the contract; read whole; handler-owned, do not change it — report a needed change with `file:line`), `docs/tasks/ux-picks-app-wide/02-declaration-contract.md` slices 1, 3, 8, spec A1/A8/A9 (`docs/specs/ux-picks-app-wide.md`, those items), the inventory row for Taylor (`docs/reviews/ux-picks-app-wide/inventory/inventory.md`), and the prototype's Taylor declaration for what was shown (read-only: `git show aff6df6c:src/graphs/functions/TaylorGraph.tsx`, search `workspaceUx`; its inline Slovenian is wording reference only).

## Settled (handler)

1. `BaseGraph` (`src/graphs/base/BaseGraph.tsx`) gets three hooks, documented in place:
   - `protected declaration(): GraphDeclaration | undefined` — default `undefined` (undeclared). Public `getDeclaration()` returns it; it must be a pure function of `this.state` and the bound parameters (no board reads).
   - `drawnObject(id: string): {color: string; visible: boolean} | undefined` — default `undefined`; a declaring graph maps each legend `object` id to the element it drew (colour from its stroke or fill, visibility from the element). The contract test uses it to fail an undrawn legend entry.
   - `performAction(id: string): void` — default throws `Error("Unknown action")`; a declaring graph runs the action inside `runAs("learner", ...)` through the same method its button calls today.
2. `TaylorGraph` exports `type TaylorIds` (the `DeclarationIds` union: its five parameters by their arbiter keys from task 01's bindings, every readout row, note, legend entry, section and action) and implements the three hooks. Text: `message('existing.key', ...)` only; where the inspector shows a string without a key, add the key to both `src/localization/sl.ts` and `en.ts` (lockstep; Slovenian wording from the current UI, English from the current `en` UI or a faithful translation) and list each added key.
3. Placement (first example of the guide's rule): parameters the learner changes while watching (centre, degree, the evaluation point) on the board; the example function choice on the board as a `choice` if it has a few named options, else Orodja; Pokaži oceno napake is an action on the board (`pressed` reflects the toggle). Write two sentences of reasoning per parameter to `docs/reviews/ux-picks-app-wide/02-taylor-placement.md` (input to the conversion guide).
4. Legend: one entry per curve and marker the board draws (`f`, `T_n`, the point, the error bar, ...), `object` ids that `drawnObject` resolves.

## Owned paths

`src/graphs/base/BaseGraph.tsx` (the three hooks only), `src/graphs/functions/TaylorGraph.tsx`, `src/localization/sl.ts`/`en.ts` (added keys only), new `src/graphs/functions/TaylorGraph.declaration.test.tsx`, `docs/reviews/ux-picks-app-wide/02-taylor-placement.md`.

## Checks

- New test (real graph harness, `src/graphs/base/realGraphTestHarness.tsx`): over at least five states (default, each example, a high degree, error estimate shown and hidden), `checkDeclaration` finds nothing; every parameter key is bound in `graph.parameters`; every legend `object` resolves through `drawnObject` with `visible` matching the board; each readout value equals the value the current inspector/board text shows for that state (read it the way existing Taylor tests do); `performAction('show-error'...)` toggles and is tagged learner. Observe each assertion fail once by breaking the declaration (wrong row value, unknown legend object), then restore.
- `just unit src/graphs/functions src/graphs/base` (foreground, timeout 600000); `npx tsc --noEmit --pretty false`; `just lint`; `just build` (localization changed).

## Return (at most 350 words)

Ids (`TaylorIds`); placement summary; keys added; tests and observed failures; anything in the contract that did not fit Taylor (`file:line`, what you needed). Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/02-taylor-declaration.md`.
