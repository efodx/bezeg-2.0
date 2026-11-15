# State: site walkthrough, graphs (package D)

Handler 4 handing off to handler 5, 2026-11-15 (context budget). Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/ (pages `b8b.html`, `b8c.html`, `b8d.html`, `b8f.html`)

- **Published under your grant, open to your objection** (comparison page for each):
  - **B8b, maps and plane geometry:** complex multiplication keeps Re and Im. Complex reciprocal and complex roots draw no axes, so they lose Re and Im too. Triangle centres and inversion have no text. Orientation keeps its signed value "+8".
  - **B8c, computational geometry:** Delaunay and the monotone partition have no text. The partition's vertex names sat under the marked points.
  - **B8d, B-splines and projective:** the basis card keeps its knot labels. The other B-spline cards, the blossom and the cross ratio have no text.
  - **B8f, capture-tool repairs:** Pascal now has no text. The linear map keeps its basis line `a₁ = (2, 1), a₂ = (−1, 1)`. The monotone triangulation has no text.
- **Approved by you, on `master`:** B3 to B7, B8a both parts, B8e. CI green after the extrapolation test fix.
- **Your choice, still open:** the affine clip stays in steps because its controls are step buttons; smooth motion needs new drawing code.

## Where things stand

- `master` has everything through B8d (`a93c58f0`); B8f (`397a8946`) and this note publish from `graphs-pub` at handoff (check `cd ../graphs-pub && just publish --status`; on failure rerun the gate, a node_modules outage hit the shared junction twice on 2026-11-15).
- This branch still carries pre-publish copies of all batches. Rebase onto `origin/master` after the B8f publish lands, with the preview server stopped (an earlier rebase stopped on a Windows file lock). On a conflict in this note or the queue take this branch's version; in the spec take `master`'s headings.
- Publishing pattern used for every batch: in `graphs-pub`, `git checkout --detach origin/master`, cherry-pick the batch commit and its docs commit (on note/queue conflicts take `--theirs`), check the spec diff against master adds only the new records, `just publish --background --recipe runtime --base <master> --commits <oldest,...>`.
- Preview on 4333 serves this worktree's build at `45556c02`; restore the comparison pages only **after** `just preview` is listening (the preview refuses a build whose output changed). `just smoke-lesson` may leave a `serve-smoke-build.cjs` on 4333; kill it before starting the preview.
- When `graphs-pub` is no longer needed: unlink its `node_modules` junction with PowerShell first (see the memory note on junctions), then `git worktree remove ../graphs-pub`.

## Open items found in this run

- Capture tool stale against current controls: repaired in B8e (five ids) and B8f (`linear-map`, `monotone-triangulation`, line labels). Still open: `epicycles` and `voronoi-degenerate` (triage).
- **Guided example images** (lesson chapters' stored images, `scripts/capture-guided-example-previews.cjs`) still show the old colours: probability, interpolation, curve geometry (envelope, curvature, evolute), Bézier (B3), PH and parameterizations (B4), conics, three views, Farin points, and chapters with plain board text (Literata). Recapture once per chapter.
- `affine`: smooth motion needs a continuous control or new drawing code; a design question for the owner.
- Seen, not changed: `/curve-geometry/offset`'s single PH offset is 0.6 of the base width (was 0.85); at 390 px the curvature readout overlaps the graph and the three-views label of `L` overlaps the line (both before this run); `taylor` and `uniform-convergence` cards keep an unlabelled rust marker on the axis (the owner saw it and asked for nothing); `interp-hermite` data points are dark; 68 fixed `fontSize` literals.

## Capture and preview facts (use these)

- Recapture a batch's ids together: `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=a,b,c node scripts/capture-demonstration-previews.cjs`. Set VERIFIED only after reading the script diffs and confirming only the batch's ids changed. A run rewrites the manifest in registration order (compare by id) and records dirty source files, so nothing else may edit `src/` during a run.
- `just preview` does not build: `just build` on a clean `src/`, stop the old server by PID (`netstat -ano | grep "127.0.0.1:4333 .*LISTEN"`), start `just preview 4333` in the background, and only then `sh .command-logs/restore-pages.sh` (it copies `pilot/`, `accent/` and every `b*/` page into `build/walkthrough-graphs/`; `.command-logs` is untracked, recreate it from this description if gone).
- Batch pattern that worked (10 to 20 minutes per worker): worker A "graph changes, copy and unit tests" → handler commits, builds, restarts the preview → worker B "recipes, capture, live screenshots, posters, page", read-only against 4333. Text-only sweeps need only worker B; brief it with the overlap rule: a kept formula that lands on tick numbers or the subject becomes Remove.
- Full `just lint` only. `just publish --background` needs `--recipe`, `--base`, `--commits` (oldest first).
- Palette roles settled with the owner: moss primary curve, blue second role, ochre points with a light outline, `GraphPalette.emphasis` (rust red) for one accent; no amber or near-black accent against blue. When a colour is rejected, show several candidates side by side (`accent/` is the model).

## Next slice inputs, in order

1. Recapture `projective-cross-ratio` (Remove): since B8f the policy also hides line labels, and its lines `p`, `p′` are labelled. Text-only, read the poster, publish as B8g.
2. **B9 epicycles card** (show a subject; the owner approved the subjects with the second kitten drawing; its recipe label is stale), `voronoi-degenerate` (triage).
3. **B10 patches** (overlap fix).
4. Guided example recapture per chapter (open items list).
5. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- **Successor model (owner, 2026-11-14):** start successors with `--model claude-opus-5-5 --effort medium`, not Fable. Opus budget thresholds apply (soft 175k, handoff 215k).

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- **Owner grant, in force** (relayed by handler 3 2026-11-14, confirmed by the owner to handler 4 2026-11-15 with "i agree"): batches inside the approved direction (B8b to B8d, B9, B10, the recaptures) are published once the handler's own checks and review pass, still shown on their `bN` page and listed under "For the owner" as published so he can object afterwards. A new design direction (new drawing code such as the affine clip, a colour he has not seen) is still his to choose. Pass this on to successors.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
