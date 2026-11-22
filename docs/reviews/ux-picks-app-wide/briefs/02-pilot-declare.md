# Shared brief: a pilot declares itself (task 02, slice 8, pilots 2 to 8)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; keep it as cwd, no `cd`, create files with Write (no heredocs). Do not commit; the handler commits. The dispatch names your graph (`<Graph>`), its family and its lesson file. Send independent reads and searches in one message.

## Worked example: Taylor

Read before writing anything:

- `git show d34e9f9b` — the graph side. It adds the hooks on `BaseGraph`, which already exist so you only implement them. It also adds the `TaylorIds` union, `declaration()`, `drawnObject()`, `performAction()`, the real-graph declaration test and the placement note `docs/reviews/ux-picks-app-wide/02-taylor-placement.md`.
- `git show 56414ad2` — text. New keys go into a per-family fragment `src/localization/fragments/<family>.ts`, registered in `fragments/index.ts` (ADR 0066). Numbers the graph formats itself are a `FormattedValue`, never a pass-through key such as `"{value0}"`. Never add declaration keys to `sl.ts`/`en.ts` directly.
- `git show c92616bb` — the lesson side. A lesson frame gets `declare` built with `frameDeclarer<<Graph>Ids>()`. The frame declares the rows its text asks the learner to read (at most 3 highlights) and the controls/actions its text asks them to use (`uses`). If a used control is placed in Orodja, the frame also opens `tools`. If a lesson file already uses `guidedStep` (`src/learning/content/guidedStep.ts`), pass `declare` through it. Otherwise add an optional `declare` to the file's local `frame()` helper; do not rename frame ids.
- Contract: `src/graphs/base/declare/graphDeclaration.ts` (read whole; handler-owned, do not change it — report a needed change with `file:line`).

## Settled (handler)

1. The declaration reproduces the present panel: parity, not new text. Parity recordings live in `src/graphs/**/__parity__/<graph>.json` and the tool is `src/graphs/base/declare/parity.ts`. If your graph has no recording (projective cross-ratio, Coons patch, triangle centres), record one first with the tool, before writing the declaration, following `docs/reviews/ux-picks-app-wide/briefs/02-parity.md`.
2. Parameters use their arbiter keys from task 01's bindings (`graph.parameters`). For a pilot without bindings, use `FUNCTION_PARAMETER_NAMES` keys where they exist (`src/learning/model.ts`). Report any parameter you could not bind; do not add bindings.
3. Placement follows Taylor's rule. Parameters the learner changes while watching go on the board, and so does a choice with a few named options. Everything else stays in Orodja. Write two sentences of reasoning per parameter to `docs/reviews/ux-picks-app-wide/02-<graph>-placement.md`.
4. Legend: one entry per drawn curve or marker, with `object` ids that `drawnObject` resolves.
5. Record every file you touched in your report; this is task 08's sizing input. A plain pilot should touch only its graph file, its lesson file(s), its own tests and its fragment.

## Owned paths

- The graph file. If a shared base is unavoidable, name it and why before editing.
- A new `<Graph>.declaration.test.tsx` beside it.
- Its parity recording, if one is missing.
- `src/localization/fragments/<family>.ts`, plus one line in `fragments/index.ts`.
- Its frames in the named lesson file.
- `docs/reviews/ux-picks-app-wide/02-<graph>-placement.md`.

Never edit all-graph suites, `graphDeclaration.ts`, `BaseGraph.tsx`, `declarationContract.test.tsx` or another graph's files. If two pilots run at once, `fragments/index.ts` is the only shared line: add yours and keep the other.

## Checks

- Declaration test with the real graph harness, like `TaylorGraph.declaration.test.tsx`. Over at least five states, `checkDeclaration` finds nothing, parameters are bound, the legend resolves and is visible, and readout values equal the panel. Observe one assertion fail by breaking the declaration, then restore it.
- The parity test passes for your recording.
- `just unit src/learning/content/declarationContract` passes. Your graph is discovered automatically; confirm that its frames were evaluated.
- `just unit <your graph folder>`, `just unit src/localization`, `just unit src/learning/content` (foreground, timeout 600000); `npx tsc --noEmit --pretty false`; `just build`.
- Unit tests only. Do not use ports 4482 or 4471.

## Return (at most 350 words)

Report the following. Bulky evidence goes to `docs/reviews/ux-picks-app-wide/02-<graph>-notes.md`. If you stop early, leave a handoff note at `docs/reviews/ux-picks-app-wide/briefs/notes/02-<graph>.md`.

- the ids union
- a placement summary
- fragment keys added
- frames declared
- tests run and the observed failure
- the files touched
- contract gaps (`file:line`, what you needed)
