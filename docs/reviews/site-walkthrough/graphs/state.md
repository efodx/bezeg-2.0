# State: site walkthrough, graphs (package D)

Handler 3 handing off to handler 4, 2026-11-14 (context budget). Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **B8a second part, eleven function cards, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b8a2.html . Nine cards changed (text only). Inverse function, definite integral, arc length, polynomial zeros and fixed point keep their formula or symbol; rational function and extrema lose all text, because their asymptote names and extremum values sat on the axis numbers. Derivative and area between curves could not be recaptured (capture tool out of date against their controls).
- **Approved by you and pushed to `master`:** B3 Bézier, B4 PH and parameterizations, B5 curve geometry. **CI failed on that push:** the extrapolation lesson's browser test counts one curve at its first step, and B3 draws the extended arc as its own curve. Handler 4 fixes this first; the public site keeps the build from before B3 until CI passes.
- **Approved by you, publish running:** B6 conics and three views, B7 rational (with the blue Farin rings).
- **Approved by you, waiting to publish:** B8a first part (nine analysis cards, `b8a1.html`).

**One thing not changed, with its reason:** the affine clip stays in steps because its controls are step buttons.

## Where things stand

- `master` has B3, B4, B5 and their approval note (`b5fd6947`). **CI run 43646056356 failed**: `tests/guided-lessons.smoke.spec.cjs:2736` "Lesson extrapolation › sl: ?learn=1 walks every frame", `Error: one curve at Korak 1 od 4 · Okvir 1 od 2`, expected 1. Likely cause (not confirmed by a run): B3's `ExtrapolationGraph.tsx` `buildExtension` adds a second JSXGraph curve for the arc on `[1, t]`. Fix in the smoke test's count (count the main curve only, for example by a role marker on the extension) or in the graph; the lesson meaning must not change. Read the test near that line first; run the lesson smoke for extrapolation; publish the fix; confirm with `gh run list --workflow browser-smoke.yml --branch master --limit 1`.
- Background publish of B6 and B7 (+ approval note) from `.claude/worktrees/graphs-pub`, run `publish-af2c1f54-99db10`, recipe `runtime`: **check `cd ../graphs-pub && just publish --status`**. Its gate does not run the lesson browser smoke, so it may land on the failing master; CI stays red until the extrapolation fix lands.
- This branch (`worktree-walkthrough-graphs`) still carries pre-publish copies of B3 to B7 and state notes. After the publishes land: `git fetch`, `git rebase origin/master` (published copies drop out; on a conflict in this note or the queue take this branch's version; in the spec take `master`'s "approved" batch headings and keep this branch's B8a records). Unpublished after that: B8a first part (`50f59912`), B8a second part (`8305bc13`), this note.
- Publishing B8a first part: cherry-pick `50f59912` onto `origin/master` in `graphs-pub` with a commit changing its spec heading to "approved by the owner", then `just publish --background --recipe runtime --base <master> --commits <list>`. Add the second part if the owner approves it first. Captures are regenerated per batch on top of the previous one: publish batches in branch order.
- Docs-only publish: `graphs-pub` reset to `origin/master`, check out only the doc files from this branch, commit, `just publish --recipe docs --base <master sha> --commits <sha>`.
- When `graphs-pub` is no longer needed: remove its `node_modules` junction first (`cmd //c "rmdir node_modules"` inside it), then `git worktree remove ../graphs-pub` and delete the branch.
- Preview on 4333 serves this worktree's build from the B7 commit; comparison pages up to `b8a2` are restored.

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

1. Fix the failing extrapolation lesson smoke on `master` (above) and get CI green. Confirm the B6/B7 publish.
2. Publish B8a first part (approved); the second part when the owner approves `b8a2.html`.
3. Repair the stale capture recipes and checks under open items, then capture those ids with their recorded verdicts.
4. **B8b** maps and plane geometry (`complex-*`, `linear-map` Keep in part, triangle ids, `inversion`, `orientation`), **B8c** compgeo (`delaunay`, `monotone-*`), **B8d** B-splines and `projective-cross-ratio`: text only, patterns in the triage table; `complex-multiplication` hide only; `projective-pascal` is No text.
5. **B9 epicycles card** (show a subject), **B10 patches** (overlap fix), guided example recapture per chapter.
6. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
