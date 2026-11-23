# Brief: task 04 slice 2b, Orodja in the first commit

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice2b.md`.

## Problem

Commit `fda81ebb` (WIP) moved the tools column into an Orodja card (`src/workspace/presenter/BoardCards.tsx`, `src/workspace/cards/ToolsBody.tsx`, `StaticToolsCard.tsx`, `cardHost.ts`; plan `docs/reviews/ux-picks-app-wide/04-design.md`, decisions in its section 9). The card appears only after the async measure pass (fonts, MathJax), so 286 graph and lesson test files fail: they query controls right after mounting (`docs/reviews/ux-picks-app-wide/04-slice2-failures.md`). Learners would also wait seconds for their controls on a cold load.

## Decision (handler)

The tools card never waits for a measure:

1. It is a `live` item (`useMeasuredCards`, `MeasureItem.live`, `measureLive`; see `src/workspace/layout/useMeasuredCards.test.tsx`). Its body renders in the **first** commit of `BoardCards`, with the panels mounted (keep `keepMounted`).
2. Its size is read from the shown card in a layout effect (before paint), then `layoutBoard` places it; the positioned re-render happens synchronously before paint. Remove the 310×420 proxy.
3. When the board size is not known yet (0×0, as in jsdom where `getBoundingClientRect` is 0), the tools card still renders (unpositioned, in normal flow or at a default inset), visible and accessible. Other cards keep waiting for their measure as now.
4. The other cards keep "no layout after paint"; the tools card may glide once when the hidden-layer cards arrive and the layout changes (one glide, as on a cold load).
5. `GraphHost.test` "initialized panels committed synchronously" must hold again without weakening it.

## Then

- Rerun `just unit src/graphs src/learning` (foreground, timeout 600000; split by folder if needed) and rewrite `04-slice2-failures.md` with what still fails, one line per file with the cause. Fix failures caused by your code or by slice 2 in owned paths. Failures in the all-graph suites or in a graph's own tests that need a per-suite change: do not edit them; list them with the exact assertion and the change you would make (the handler migrates).
- Write tests first that show the problem: render a graph through `GraphHost` and query an Orodja control synchronously after render (fails at `fda81ebb`), and a jsdom 0×0 board still shows the card. Observe them failing.

## Owned paths

`src/workspace/presenter/**`, `src/workspace/cards/**`, `src/workspace/layout/useMeasuredCards.ts` (small changes; report), `src/graphs/base/GraphHost.tsx`, `src/graphs/base/DemonstrationWorkspace.tsx`. Not graph files, all-graph suites, `tests/**`, `boardLayout.ts`, `src/workspace/pucks/**`, lesson files.

## Checks

`just unit src/workspace src/graphs/base` then the wide run above; `npx tsc --noEmit --pretty false`; eslint on changed files; `just build`. No servers.

## Return (≤300 words)

What changed (`file:line`), tests and observed failures, remaining failure count by cause, the per-suite changes you propose.
