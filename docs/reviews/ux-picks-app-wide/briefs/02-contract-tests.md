# Brief: unit tests for the declaration contract (task 02, slice 1)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. A fuzz run uses the browser on this machine: run only unit tests, in the foreground.

## Goal

Tests that pin `src/graphs/base/declare/graphDeclaration.ts` (handler-owned design; read its doc comments and test what they say; do not change it, report a rule that seems wrong with `file:line`). Source: `docs/tasks/ux-picks-app-wide/02-declaration-contract.md` slices 1 and 3, spec A1/A8/A9 (`docs/specs/ux-picks-app-wide.md`, those items only).

## Owned paths

`src/graphs/base/declare/graphDeclaration.test.ts` (new).

## Cases

1. Type level (a `// @ts-expect-error` line per case, checked by `npx tsc --noEmit`): with a local `type Ids = {param: 'a' | 'n'; row: 'value' | 'error'; note: 'hidden'; legend: 'f' | 'T'; section: 'order'; action: 'show-error'}`, a frame built with `frameDeclarer<Ids>()` rejects an unknown row id in `highlight`, an unknown section in `open` (`'section:nope'`), and an unknown id in `uses`; a declaration typed `GraphDeclaration<Ids>` rejects a row whose `legend` is not a legend id; a plain string where a `Message` is required is rejected (text must be `message(...)`).
2. `checkDeclaration`: a valid fixture (use real catalog keys from `src/localization/sl.ts` with `message()`) has no problems; one failing fixture per rule (duplicate id per kind, unknown legend link, range min ≥ max, non-positive step, count with fractional bounds, choice with one option, board parameter with a section) gives exactly that problem.
3. `checkFrame`: highlight of a missing row; four highlights; open `legend` with no legend; open an unknown section; uses an unknown id; uses a locked parameter and a disabled action; uses a `tools` control without opening `tools` (and passes with it); uses a board control without opening anything (passes).

## Checks

`just unit src/graphs/base/declare` (foreground, timeout 600000) passes; `npx tsc --noEmit --pretty false` clean (each `@ts-expect-error` is needed: remove one temporarily and see tsc fail, record it); for case 2 and 3 break one rule in a copy of the logic? No: instead, for two rules, temporarily comment out the rule's line in the module, see its test fail, restore byte for byte (`git diff --stat` on the module shows nothing at the end).

## Return (at most 250 words)

Test names and status; the observed failures; any rule you think is wrong (`file:line`). Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/02-contract-tests.md`.
