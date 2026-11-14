# State: site walkthrough, graphs (package D)

Handler 4, 2026-11-14 (running). Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **B8a second part, eleven function cards, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b8a2.html . Nine cards changed (text only). Inverse function, definite integral, arc length, polynomial zeros and fixed point keep their formula or symbol; rational function and extrema lose all text, because their asymptote names and extremum values sat on the axis numbers. Derivative and area between curves are being repaired with the other stale captures.
- **B8e, five repaired captures, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b8e.html . Sequence (keeps the N tag), Euler method (no text), accumulation (keeps the plus sign), derivative (keeps `f(x) = x²`). The capture tool had fallen behind the new sliders; the app is unchanged. Area between curves keeps the names f and g.
- **Your choice:** handler 3 relayed your words "you don't have to ask for my confirmation for the next ones". Handler 4's permission check would not publish on a relayed approval. If you want batches published without your look, say so to handler 4 directly (and that covers `b8a2` too).
- **On `master`, CI green again:** B3 to B7 and B8a first part (`b89dc04d`). The extrapolation lesson test now counts the curve and its extension arc (`e676f01b`, CI run 43649413798 passed).

**One thing not changed, with its reason:** the affine clip stays in steps because its controls are step buttons.

## Where things stand

- `master` = `b89dc04d` (B8a first part and its approval record). B6/B7 publish `publish-af2c1f54-99db10` and the smoke fix `publish-e676f01b-15e989` landed.
- This branch still carries pre-publish copies of B3 to B8a first part. Rebase onto `origin/master` failed earlier with a Windows file lock in the middle of `8305bc13` (untracked `b8a2/` files left behind; removed and aborted). Before rebasing again, stop the preview server; on a conflict in this note or the queue take this branch's version; in the spec take `master`'s headings. Unpublished after that: B8a second part (`8305bc13`), the spec record `fc5c38e5`/`869a3ec6`, this note.
- Publishing B8a second part after the owner's yes: in `graphs-pub`, cherry-pick `8305bc13` onto `origin/master`, add a commit setting its spec heading to "approved by the owner", `just publish --background --recipe runtime --base <master> --commits <list>`.
- B8e stale-capture repair committed (`310a8ce5`, after `8305bc13` in branch order: publish B8a second part first). Recaptured with VERIFIED after reading the diff; manifest changed for exactly the four ids; `just tooling-test` passed. `area-between-curves` added in a second commit (background sample moved off the curve f). Left: `epicycles` and `voronoi-degenerate` (triage).
- Docs-only publish: `graphs-pub` reset to `origin/master`, check out only the doc files from this branch, commit, `just publish --recipe docs --base <master sha> --commits <sha>`.
- When `graphs-pub` is no longer needed: remove its `node_modules` junction first (`cmd //c "rmdir node_modules"` inside it), then `git worktree remove ../graphs-pub` and delete the branch.
- Preview on 4333 serves this worktree's build at `45556c02`; restore the comparison pages only **after** `just preview` is listening (the preview refuses a build whose output changed). `just smoke-lesson` may leave a `serve-smoke-build.cjs` on 4333; kill it before starting the preview.

## Open items found in this run

- **Capture tool stale against current controls** (each fails before the text policy applies; verdicts stand and wait for the repair): `sequence` (ε field reads 0.1 where 0.3 is expected, `scripts/demonstration-preview-recipes.cjs:378`), `euler-method` (row names a control "Začetni y₀" that no longer exists, `scripts/demonstration-clip-rows/_driver.cjs:292`), `accumulation` (held-state check compares the "Točka x" input with the board, fails since it became a Slider, `scripts/demonstration-preview-concept-motion.cjs:73`), `area-between-curves` ("Meja b" reads 3.22 for 3.2, `recipes.cjs:386`), `derivative` (with the formula kept the sweep's last frame differs from the recipe frame, `demonstration-preview-motion.cjs:673`), plus `epicycles` and `voronoi-degenerate` (triage).
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
2. B8a first part published (`b89dc04d`); the second part when the owner approves `b8a2.html` (or confirms the grant directly).
3. Repair the stale capture recipes and checks under open items, then capture those ids with their recorded verdicts.
4. **B8b** maps and plane geometry (`complex-*`, `linear-map` Keep in part, triangle ids, `inversion`, `orientation`), **B8c** compgeo (`delaunay`, `monotone-*`), **B8d** B-splines and `projective-cross-ratio`: text only, patterns in the triage table; `complex-multiplication` hide only; `projective-pascal` is No text.
5. **B9 epicycles card** (show a subject), **B10 patches** (overlap fix), guided example recapture per chapter.
6. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- **Successor model (owner, 2026-11-14):** start successors with `--model claude-opus-5-5 --effort medium`, not Fable. Opus budget thresholds apply (soft 175k, handoff 215k).

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- **Relayed owner grant, 2026-11-14, not in force until he confirms it directly:** handler 3 relayed his words "you're doing fine, you don't have to ask for my confirmation for the next ones": batches inside the approved direction (B8a second part, B8b to B8d, B9, B10, the recaptures) would be published once the handler's own checks and review pass, still shown on their `bN` page and listed under "For the owner". Handler 4's permission check refused a publish based on the relayed approval, so until the owner says it to the running handler, each batch still waits for his look. A new design direction is his in any case.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
