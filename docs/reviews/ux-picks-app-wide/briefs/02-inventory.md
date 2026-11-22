# Brief: demonstration inventory script (task 02, slice 5)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. Static analysis only: no browser (a fuzz run uses it on this machine).

## Goal

The authoritative work list for converting every graph in task 08. Source: `docs/tasks/ux-picks-app-wide/02-declaration-contract.md` slice 5 (read it), 5b (count new catalog strings), and `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md` (what the work list feeds: blocker triage, rounds, connected components).

## Owned paths

`scripts/inventory/` (new: `inventory.cjs`, `README.md`, a Node test `inventory.test.cjs` on a small fixture), output `docs/reviews/ux-picks-app-wide/inventory/` (`inventory.json`, `inventory.md` summary).

## What it reports, per registered demonstration (`src/graphs/**/runtime.ts` registrations)

Its graph class and base-class chain; shared panels and controls used (`Slider`, `CountSetter`, `PointListInput`, `NumberInput`, checkboxes, selects, and the Playground-style controls living outside `BaseGraph`), with ranges where literal; readout rows and the catalog keys they use; inline user-visible strings not from the catalog (candidates for new keys, counted); legend entries and board captions (board text the graph draws); lesson files and their frames, and frames whose text contains one of the graph's control labels (A9 candidates; nothing more is inferred); its own test files; whether it has a board, a surface/WebGL view, point-set input (learner clicks the board to add points), playback (`AnimationDriver`/`PlaybackButtons`), legacy lesson `step()` builder use, parameter bindings already (task 01 pilots); and a blocker class (plain, shared-base, surface, point-set, playback, legacy-step, outside-BaseGraph controls). Then: the totals; connected components (graphs sharing a base class or panel file that is not `BaseGraph` itself, so a conversion of one touches the others); and named candidates for the legacy-`step()`, surface and point-set pilots.

Prefer the TypeScript compiler API (`typescript` is installed) over regexes where it is cheap; regex is fine for string heuristics. Deterministic output (sorted).

## Checks

`node scripts/inventory/inventory.cjs` writes both outputs; `node --test scripts/inventory/inventory.test.cjs` passes; `just lint` passes. Spot-check five demonstrations by hand against the source (Taylor, De Casteljau, phase portrait, one surface, one point-set) and report any mismatch you found and fixed.

## Return (at most 300 words)

Totals (demonstrations, graphs, components, per blocker class, new-string candidates); the three named pilot candidates with one line each; known blind spots. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/02-inventory.md`.
