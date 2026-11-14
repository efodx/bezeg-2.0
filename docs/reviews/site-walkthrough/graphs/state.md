# State: site walkthrough, graphs (package D)

Handler 1, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec: [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md).

## For the owner

- **Ready to read:** the proposed spec. It holds the capture-text policy with a verdict for each of the 118 catalog captures, the example table with real ids and routes, the typography findings and recommendation (G01), the cause of the convexity skip (G06), and the yardstick drawn from the examples you like.
- **Preview:** not up yet. The three-example pilot (correlation, envelope, subdivision curves) is being built; this note is rewritten with the Tailscale address when it is served on port 4333.
- **Yours to approve:** the capture-text rule and any row of its table; Literata as the face for plain graph text; the G06 change from held states to a smooth sweep; the direction for each example. Nothing in graphs, styles or captures reaches `master` before that.
- **Still open elsewhere:** the epicycles subject (G07), proposed by the `design` session.

## Where things stand

- Slice 1 (spec) done. Slice 2 (pilot) starting.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
- Rule change received from the planning session on 2026-11-14: propose and wait instead of "decide without asking". It replaces that bullet of the session rules and passes to any successor. No successor is launched while the work only waits on the owner.

## Next slice inputs

Pilot, on the branch only:

1. `curve-envelope`: capture text removed through a recipe `text` field read by `presentBoard` (spec, C1); framing so the line family fills the frame.
2. `interp-subdivision`: refined points and polyline in different hue families (R2); text removed.
3. `prob-correlation`: style, scene and text per the example table; `r` kept.
4. Before and after posters and clips on one preview page, served with `just preview 4333` and `tailscale serve --bg --http=4333 http://127.0.0.1:4333`.

Files found: `scripts/capture-demonstration-previews.cjs` (`presentBoard`, line 206), `scripts/demonstration-preview-recipes.cjs`, `src/graphs/functions/CorrelationGraph.tsx`, `src/graphs/curves/envelope/`, `src/graphs/curves/subdivisionCurves/`. Contact sheets of today's posters: `.command-logs/graphs-sheets/` (not committed).
