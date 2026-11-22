# Brief: parity by golden values (task 02, slice 4)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. Another worker is editing `BaseGraph.tsx`, `TaylorGraph.tsx` and the localization catalogs: do not touch them. A fuzz run may use the browser: unit tests only (jsdom), foreground.

## Goal

Before a graph's present inspector panel is removed (tasks 04 to 08), its shown values are recorded over sampled states; the graph's declaration must reproduce that recording. Source: `docs/tasks/ux-picks-app-wide/02-declaration-contract.md` slice 4; the contract `src/graphs/base/declare/graphDeclaration.ts` (read whole; `ReadoutRow.value` is a `MessageNumber` or `Message`, `renderMessage` and `t` in `src/localization/index.ts` turn them into text).

## Settled (handler)

- A recorder (Vitest helper, `src/graphs/base/declare/parity.ts`): mounts a graph with the real-graph harness (`src/graphs/base/realGraphTestHarness.tsx`), applies a list of sampled states (each a list of lesson actions or parameter writes through `graph.parameters.write(key, v, 'learner')`), and per state records the text of the present panel's read-off values and the board's caption texts, keyed by a stable locator (the row's label text plus its order), in Slovenian. Writes `src/graphs/<family>/__parity__/<demonstration>.json` (recordings are deleted in task 10).
- A checker: renders the graph's `getDeclaration()` per recorded state to text (Slovenian; rows as `name symbol value unit`, notes, formula label) and compares with the recording; reports missing, extra and different values with the state index. `getDeclaration()` does not exist until the Taylor worker lands it (`protected declaration()` plus public `getDeclaration()` on `BaseGraph`): code against that signature and test the checker with a fake graph object for now.
- Record Taylor, transformations, De Casteljau, linear map (two modes) and phase portrait now: five to eight states each, chosen to change every shown value at least once (write the state lists in the test file).
- Number formatting: compare after normalising whitespace and the minus sign; values must otherwise match exactly (decimal comma included).

## Owned paths

`src/graphs/base/declare/parity.ts`, `src/graphs/base/declare/parity.test.ts(x)`, `src/graphs/**/__parity__/*.json`, `docs/reviews/ux-picks-app-wide/02-parity.md` (how to record and check one graph, one paragraph, for the recipe).

## Checks

- The checker finds a seeded mismatch (a changed value, a missing row, an extra row) on a fake declaration: observed failures recorded.
- Recording twice gives identical files (deterministic).
- `just unit src/graphs/base/declare` and the recording run pass; `npx tsc --noEmit --pretty false`; `just lint`.

## Return (at most 300 words)

Files; states recorded per graph; the observed failures; what the recorder cannot see (values drawn only on the board canvas, MathJax output). Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/02-parity.md`.
