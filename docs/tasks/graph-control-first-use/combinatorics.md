# Combinatorics control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Keep the problem, one particular outcome and the total number of outcomes distinct. Restrict long listings to a named section while retaining the current page and selection.

**Implementation order.** Start with audited Lattice paths and use Counting choices to check the grouping at a different scale.

<a id="lattice-paths"></a>

## Lattice paths and Pascal's triangle

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/combinatorics/lattice-paths) · [LatticePathGraph](../../../src/graphs/combinatorics/LatticePathGraph.tsx)

- **First task.** Lead with the selected path and target. Trace two different routes to the same target.
- **Other controls.** Group grid setup, numerical target entry and list pagination below the route comparison.
- **Acceptance.** Varying the selected path changes the highlighted right/up moves and keeps the total number of routes to that target fixed.

<a id="counting-tree"></a>

## Counting choices

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/combinatorics/counting) · [CountingTreeGraph](../../../src/graphs/combinatorics/CountingTreeGraph.tsx)

- **First task.** Choose a small n and k, then toggle whether order matters while holding repetition fixed.
- **Other controls.** Group the two counting assumptions together. Keep expansion and detailed listings secondary.
- **Acceptance.** For three distinct items, choosing two without repetition gives six ordered outcomes or three unordered outcomes.
