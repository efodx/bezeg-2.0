# State: site walkthrough, graphs (package D)

Handler 6, 2026-11-15: the package objective is met apart from one choice that waits on the owner (the affine clip). No successor was started, because the remaining work waits on the owner. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/ (pages `b8b.html` to `b8g.html`, `b9.html`, `b10.html`, and the new `b11.html`)

- **Published under your grant, open to your objection:**
  - **B11, lesson example images:** every lesson chapter's stored example image (56 retained images and about 130 images in 30 chapter folders) is recaptured in the current colours and Literata. The images now follow the capture-text rule, as the catalog cards already did: for example, the density card keeps only `X ∼ N(0; 1²)`, and the summary and correlation cards lose their titles. The alt text of those cards was rewritten to match. `b11.html` shows two before/after pairs per chapter.
  - Earlier batches B8b to B8g, B9 and B10 are as listed on their pages.
- **Approved by you, on `master`:** B3 to B7, B8a both parts, B8e. CI green (last checked run: `42d5e56c`).
- **Your choice, still open:** the affine clip stays in steps because its controls are step buttons. Smooth motion needs new drawing code, so it is a design choice for you.
- **Seen, not changed (tell me if any should become a batch):** some cards are small in the frame (projective cross-ratio and three views, Coons patch, tensor de Casteljau). Some labels overlap: mechanical-curves drag-the-track and tautochrone, the segment-intersections `s1`/`s2`, and the tensor derivatives `S_u`/`S_v`. On the tensor-joins lesson card only `S_{A,u}` shows. The tensor-subdivision caption still speaks of degree elevation. The full list is under "Open items".

## Where things stand

- `master` has B11 part 1 (`42d5e56c`, CI green). B11 part 2 (`2da033f9` checks, `c880b108` images, alt text, page) and this note publish in job `publish-<hash>-*` (check `just publish --status`). On an unrelated test timeout, rerun `just publish --background --recipe runtime --base f145fd04 --commits 2da033f9,c880b108,<this note's hash>`.
- Done criteria: every row of the spec's example table is done or has a recorded reason (`affine` waits on the owner). Every Remove or Keep-in-part capture in the triage has a batch record (checked at B8g). B11 is done (spec batch record "B11 Guided example images").
- Preview on 4333 serves the build of `52b7ecbd` with all pages restored (`b11` included).
- Failed publish worktrees from earlier runs are still on disk: `publish-ef3165c3-161384`, `publish-3e43eec4-5fe050`, `publish-2670e1fb-983cf6`, `publish-c7378c8a-643e5e`. Unlink their `node_modules` junction with PowerShell before you remove them. Branch `backup/walkthrough-graphs-pre-h5` can be deleted.

## Open items found in this run

- The affine clip (owner's choice, above).
- Guided capture: the runner checks a card's `expected` on the live lesson board and on the presented card. The capture-text rule changes only the card, so text counts are not asserted for Demonstrations under the rule (`withoutPolicyText` in `scripts/generate-guided-example-inventory.cjs`).
- Seen, not changed: projective cross-ratio and three-views cards small or clumped; `patch-coons` and `tensor-decasteljau` small; combinatorics lattice-path cards have a small grid under large text; mechanical-curves drag-the-track and tautochrone labels overlap the curve; segment-intersections `s1`/`s2` overlap; `tensor-derivatives` labels overlap; the `tensor-joins` lesson card shows only `S_{A,u}`; the `tensor-subdivision` caption speaks of degree elevation. Also from earlier: `patch-joins` symbols touch markers of the second net; `/curve-geometry/offset` PH offset width; at 390 px the curvature readout overlaps the graph; `taylor` and `uniform-convergence` keep an unlabelled rust marker; `interp-hermite` data points are dark; 68 fixed `fontSize` literals.

## Capture and preview facts (use these)

- Catalog recapture: `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=a,b,c node scripts/capture-demonstration-previews.cjs`.
- Guided recapture: `sh .command-logs/b11-chapters.sh <chapter...>` (generate plus capture per chapter; stops at the first failure). `patches` uses `--patches` for the generator. After a recapture, copy each inventory to `docs/reviews/<chapter>/guided-example-inventory.json` (`bezier-patches` for patches; retained: `docs/reviews/illustrated-chapter-examples/capture-inventory.json`), because `guidedExamplePreviews.test.ts` checks the manifests against them. Keep the review pages out of `build/` while it runs.
- `just preview` does not build: `just build`, stop the old server by PID, run `just preview 4333` in the background, then `sh .command-logs/restore-pages.sh`.
- Palette roles: moss primary curve, blue second role, ochre points with a light outline, `GraphPalette.emphasis` (rust red) for one accent. When a colour is rejected, show several candidates side by side.

## Rules that carry over

- **Successor model (owner, 2026-11-14):** `--model claude-opus-5-5 --effort medium`, not Fable; Opus thresholds (soft 175k, handoff 215k).
- Propose, show a preview, wait for the owner on design and policy. Routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- **Owner grant, in force** (confirmed to handler 4, 2026-11-15): batches inside the approved direction are published once the handler's own checks and review pass, shown on their `bN` page and listed under "For the owner". A new design direction is still his to choose.
- Port 4333 only, through `tailscale serve`. Do not edit inspector panel composition or other sessions' queue or state files. Workers keep scratch in `.command-logs/`.
- This worktree's `node_modules` is a junction to the main checkout's; delete the junction before removing the worktree.
