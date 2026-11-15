# State: site walkthrough, graphs (package D)

Handler 5 handing off to handler 6, 2026-11-15 (context budget). Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/ (pages `b8b.html` to `b8g.html`, `b9.html`, `b10.html`)

- **Published under your grant, open to your objection** (comparison page for each):
  - **B8g, plane geometry (missed by the first sweep):** the Euler and Simson line cards lose their sentences; the inscribed-angle card keeps only its three angle values.
  - **B10, patch symbols:** on the subdivision card both pieces now carry their symbol S_L and S_R, clear of S(u,v) (S_R was hidden before). On the joins card S_{A,u} and S_{B,u} no longer sit on one spot.
  - **B9, epicycles card:** the card now shows the Slovenia outline at N = 10, the trace close but visibly not exact. The cat and the blossom were tried and are on the page side by side: the blossom is already nearly exact at N = 10, the cat jumps too much for the clip at N = 10 and loses its legs at N = 8. Also: `voronoi-degenerate` captures again (same picture), and the cross-ratio card was rechecked (unchanged).
  - **B8b, maps and plane geometry:** complex multiplication keeps Re and Im. Complex reciprocal and complex roots draw no axes, so they lose Re and Im too. Triangle centres and inversion have no text. Orientation keeps its signed value "+8".
  - **B8c, computational geometry:** Delaunay and the monotone partition have no text.
  - **B8d, B-splines and projective:** the basis card keeps its knot labels. The other B-spline cards, the blossom and the cross ratio have no text.
  - **B8f, capture-tool repairs:** Pascal has no text. The linear map keeps its basis line. The monotone triangulation has no text.
- **Approved by you, on `master`:** B3 to B7, B8a both parts, B8e. CI green.
- **Your choice, still open:** the affine clip stays in steps because its controls are step buttons; smooth motion needs new drawing code.

## Where things stand

- `master` has everything through B9 (`81ff6179`). B10 (`6e7a04d5`, `2670e1fb`, lint fix `3e43eec4`), B8g (`a6992dbf`) and the extrapolation-check fixes (`15cf0682`, `cd899161`) publish in the background (`just publish --status`, job `publish-cd899161-*`). Two earlier attempts failed in check-changed: a lint error in the new test (fixed) and a 15 s timeout in the unrelated `CurveOperationPanel.test.tsx` under load. On another such timeout, rerun the same command: `just publish --background --recipe runtime --base 81ff6179 --commits <oldest..newest>` (the base must be an ancestor of HEAD).
- B11 part 1 (`c12fe1df`, the 56 retained guided example images) is committed, not yet published: publish it with the chapters or on its own after the job above lands.
- This branch was reset to `origin/master` at handler 5's start (every batch was already on master in its published form; the old tip is kept as `backup/walkthrough-graphs-pre-h5`, delete it once B9 and B10 are on master). Handler 2's B1–B3 evaluation entry, which had never reached master, is restored in B9.
- B11 (guided example images), [b11/brief.md](b11/brief.md): retained set done. Chapters stopped at the first: `probability.density.prob-density` expects 2 visible curves, the board shows 4 (B1 gave the density area its own role); the expectation comes from the chapter registry's authored `expected` checks (`scripts/generate-guided-example-inventory.cjs --chapter probability`). Update it with the same care as `extrapolation` (`cd899161`: count the real curves; keep only samples the board's own parameterisation gives), rebuild, then rerun the chapters in brief order. Expect more such stale expectations in chapters touched by B1 to B10.
- **Guided capture needs a clean `build/`:** it checks the local build bytes against the stamp, so the review pages must be out of `build/walkthrough-graphs/` while it runs (rebuild, start the preview, do not restore pages; restore them afterwards). Run chapters in the foreground one at a time; a detached loop of the first attempt kept writing images after its worker stopped.
- Preview on 4333 serves the build of `cd899161`; pages restored.
- `graphs-pub` removed (junction unlinked first; the shared `node_modules` is intact).

## Open items found in this run

- Capture tool stale against current controls: all repaired (B8e, B8f, B9, B8g clip steps). Every Remove or Keep-in-part id in the triage now has a batch record (checked by script at B8g).
- Branch `backup/walkthrough-graphs-pre-h5` can be deleted once this run's commits are on master.
- **Guided example images** (lesson chapters' stored images, `scripts/capture-guided-example-previews.cjs`) still show the old colours: probability, interpolation, curve geometry (envelope, curvature, evolute), Bézier (B3), PH and parameterizations (B4), conics, three views, Farin points, and chapters with plain board text (Literata). Recapture once per chapter.
- `affine`: smooth motion needs a continuous control or new drawing code; a design question for the owner.
- Seen, not changed: `patch-joins` symbols touch control-point markers of the second net; the `projective-cross-ratio` card's default scene sits small in the middle of the frame; `/curve-geometry/offset`'s single PH offset is 0.6 of the base width (was 0.85); at 390 px the curvature readout overlaps the graph and the three-views label of `L` overlaps the line; `taylor` and `uniform-convergence` cards keep an unlabelled rust marker on the axis; `interp-hermite` data points are dark; 68 fixed `fontSize` literals.

## Capture and preview facts (use these)

- Recapture a batch's ids together: `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=a,b,c node scripts/capture-demonstration-previews.cjs`. Set VERIFIED only after reading the script diffs. Ids whose recipe changed since the last run must be in the same run (B9: epicycles alone failed on stale voronoi-degenerate provenance). Compare the manifest by id; nothing else may edit `src/` during a run.
- `just preview` does not build: `just build` on a clean `src/`, stop the old server by PID (`netstat -ano | grep "127.0.0.1:4333 .*LISTEN"`), start `just preview 4333` in the background, and only then `sh .command-logs/restore-pages.sh` (copies `pilot/`, `accent/` and every `b*/` page into `build/walkthrough-graphs/`; `.command-logs` is untracked, recreate it from this description if gone).
- Batch pattern: worker A "graph changes, copy and unit tests" → handler commits, builds, restarts the preview → worker B "recipes, capture, posters, page", read-only against 4333. Briefs live in `bN/brief.md`.
- `just publish --background` needs `--recipe`, `--base`, `--commits` (oldest first); this worktree can publish directly now that it equals master plus new commits.
- Palette roles settled with the owner: moss primary curve, blue second role, ochre points with a light outline, `GraphPalette.emphasis` (rust red) for one accent. When a colour is rejected, show several candidates side by side (`accent/` is the model).

## Next slice inputs, in order

1. Check the publish job; republish on an unrelated timeout.
2. B11 chapters: fix `prob-density`'s expectation, rebuild without pages, rerun chapters, review, page `b11`, publish with `c12fe1df`.
3. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- **Successor model (owner, 2026-11-14):** start successors with `--model claude-opus-5-5 --effort medium`, not Fable. Opus budget thresholds apply (soft 175k, handoff 215k).
- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- **Owner grant, in force** (confirmed to handler 4 2026-11-15): batches inside the approved direction are published once the handler's own checks and review pass, still shown on their `bN` page and listed under "For the owner" as published. A new design direction (new drawing code such as the affine clip, a colour he has not seen) is still his to choose. Pass this on.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
