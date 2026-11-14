# State: site walkthrough, graphs (package D)

Handler 4, 2026-11-15 (running). Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **Approved by you 2026-11-15, publishing:** B8a second part (`b8a2.html`: eleven function cards, text only) and B8e (`b8e.html`: five repaired captures: sequence keeps the N tag, Euler method no text, accumulation keeps the plus sign, derivative keeps `f(x) = x²`, area between curves keeps f and g).
- **Your grant is in force** (you confirmed it to handler 4, 2026-11-15): from here on, batches inside the approved direction are published after the handler's checks and review, shown on their `bN` page and listed here so you can object afterwards.
- **On `master`, CI green:** B3 to B7 and B8a first part (`b89dc04d`); the extrapolation lesson test counts the curve and its extension arc (`e676f01b`).

**One thing not changed, with its reason:** the affine clip stays in steps because its controls are step buttons.

## Where things stand

- `master` = `b89dc04d` plus the B8a second part and B8e publish from `graphs-pub` (check `cd ../graphs-pub && just publish --status`).
- This branch still carries pre-publish copies of everything up to B8e. Rebase onto `origin/master` once that publish lands; an earlier attempt stopped on a Windows file lock mid-pick (untracked `b8a2/` files left behind; removed and aborted), so stop the preview server first. On a conflict in this note or the queue take this branch's version; in the spec take `master`'s headings.
- B8e: recaptured with VERIFIED after reading the diff; manifest changed for exactly the five ids; `just tooling-test` passed. Left in the open items: `epicycles` and `voronoi-degenerate` (triage).
- Docs-only publish: `graphs-pub` reset to `origin/master`, check out only the doc files from this branch, commit, `just publish --recipe docs --base <master sha> --commits <sha>`.
- When `graphs-pub` is no longer needed: remove its `node_modules` junction first (`cmd //c "rmdir node_modules"` inside it), then `git worktree remove ../graphs-pub` and delete the branch.
- Preview on 4333 serves this worktree's build at `45556c02`; restore the comparison pages only **after** `just preview` is listening (the preview refuses a build whose output changed). `just smoke-lesson` may leave a `serve-smoke-build.cjs` on 4333; kill it before starting the preview.

## Open items found in this run

- Capture tool stale against current controls: repaired in B8e for `sequence`, `euler-method`, `accumulation`, `area-between-curves`, `derivative`. Still open: `epicycles` and `voronoi-degenerate` (triage).
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

1. Done by handler 4: extrapolation smoke fixed (`e676f01b`), CI green; B6/B7 published.
2. Done: B8a both parts and B8e approved by the owner and published by handler 4.
3. Done in B8e for five ids; `epicycles` and `voronoi-degenerate` stay with B9 and the triage.
4. **B8b** maps and plane geometry (`complex-*`, `linear-map` Keep in part, triangle ids, `inversion`, `orientation`), **B8c** compgeo (`delaunay`, `monotone-*`), **B8d** B-splines and `projective-cross-ratio`: text only, patterns in the triage table; `complex-multiplication` hide only; `projective-pascal` is No text.
5. **B9 epicycles card** (show a subject), **B10 patches** (overlap fix), guided example recapture per chapter.
6. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- **Successor model (owner, 2026-11-14):** start successors with `--model claude-opus-5-5 --effort medium`, not Fable. Opus budget thresholds apply (soft 175k, handoff 215k).

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- **Owner grant, in force** (relayed by handler 3 2026-11-14, confirmed by the owner to handler 4 2026-11-15 with "i agree"): batches inside the approved direction (B8b to B8d, B9, B10, the recaptures) are published once the handler's own checks and review pass, still shown on their `bN` page and listed under "For the owner" as published so he can object afterwards. A new design direction (new drawing code such as the affine clip, a colour he has not seen) is still his to choose. Pass this on to successors.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
