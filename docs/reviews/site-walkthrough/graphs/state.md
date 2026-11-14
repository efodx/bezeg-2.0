# State: site walkthrough, graphs (package D)

Handler 3, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **Batch B6, conics and three views, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b6.html . Conic card: the distance to the focus is a strong blue segment, the distance to the directrix a strong rust-red one, the frame is tight on the ellipse and directrix; the legend now has one line per distance. Three views: the image conic is blue, the moving line rust red, the frames light; the card starts with the line closer to the circle (c = 1.4) because at the default the image is a few pixels wide.
- **B7 rational curves, in work:** weights and ratio numbers leave the three cards (`rational-extrapolation`, `rational-subdivision`, `farin`). It will appear as `b7.html`.
- **Approved by you this evening and being published:** B3 Bézier, B4 PH and parameterizations, B5 curve geometry (with the thin ring on the evolute card).

**On the public site** (CI passed): pilot captures, Literata graph text, epicycles outlines with the kitten, correlation label fix, convexity sweep, rust envelope line, B1 probability, B2 interpolation, the triage.

**One thing not changed, with its reason:** the affine clip stays in steps because its controls are step buttons.

## Where things stand

- `master` has this package up to B2 and the triage, plus the state notes. A background publish of B3, B4, B5 and the approval note is running from the helper worktree `.claude/worktrees/graphs-pub` (branch `graphs-pub`, run `publish-a2716d27-f84a3d`, recipe `runtime`, nine cherry-picked commits). **Check `cd ../graphs-pub && just publish --status`**; when it says ok, check CI with `gh run list --workflow browser-smoke.yml --branch master --limit 1`, then `git fetch` and `git rebase origin/master` in this worktree when no worker is running (published copies drop out; the old note commit `912f1616` also carries handler 2's evaluation entry, which is not on `master`: keep that file's hunk and take `master`'s state note and queue). If it failed, read `.command-logs/publish-a2716d27-f84a3d.log` there, fix, and republish.
- This branch carries, unpublished: B6 graph changes (`5d40f57f`) and B6 captures (`df07185b`), shown to the owner on `b6.html`.
- B7 (capability: the capture-text policy reaches smartlabels; `rational-subdivision`'s check reads the model; then three captures) was dispatched to one worker; its note is `b7/worker.md`.
- Docs-only publish (this note, the queue): `graphs-pub` reset to `origin/master`, check out only the doc files from this branch, commit, `just publish --recipe docs --base <master sha> --commits <sha>`. Not while a background publish from `graphs-pub` is pending. When `graphs-pub` is no longer needed: remove its `node_modules` junction first (`cmd //c "rmdir node_modules"` inside it), then `git worktree remove ../graphs-pub` and delete the branch.
- Verified for B6: unit tests with observed pre-change failures for both graphs, `src/learning/content` tests, typecheck, full lint, build, `just tooling-test` and lint after the worker's capture, both captures within 300 KiB and only those two changed in the manifest, both after posters viewed by the handler, legend at 310 px in both languages viewed by the worker, SVG export has both colours. Not verified: `just tooling-test` after the handler's last recipe edit (c = 1.4; the capture itself passed), English three-views screenshot.

## Open items found in this run

- `bezier` capture: repaired (`49e6013a`). The point list field shows the dragged value for a frame after a typed commit, so the restore step types directly and the clip's last-frame check asserts the exact return.
- **Guided example images** (lesson chapters' own stored images, `scripts/capture-guided-example-previews.cjs`): style changes leave them in the old colours. Recapture once per affected chapter after the style batches: probability, interpolation, curve geometry (envelope, curvature), Bézier (B3 graphs), PH and parameterizations (B4), and chapters whose images show plain board text (Literata). Alt text was updated in B1 and B2 only.
- Stale recipe labels: `epicycles` ("Povečaj N za 1") and `voronoi-degenerate` ("Trapez") fail on the current build (triage); fix `epicycles` in B9.
- `affine`: smooth motion needs a continuous control or new drawing code; a design question for the owner if it is to change.
- `/curve-geometry/offset` shares the PH offset style: its single offset is now 0.6 of the base width (was 0.85). Look at it in B5.
- `interp-hermite` data points are still dark; exported envelope PNG has a stray space in "Število premic: 16 ."; 68 fixed `fontSize` literals (`typography/worker.md`); the epicycles arm after "Predvajaj" was not isolated in a browser check.

## Capture and preview facts (use these)

- Recapture a batch's ids together: `PREVIEW_BASE_URL=http://127.0.0.1:<port>/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=a,b,c node scripts/capture-demonstration-previews.cjs`. The fingerprint includes the recipes and motion files, so every batch that edits one needs the VERIFIED flag once; set it only after reading the script diffs and confirming that only the batch's ids changed. `just clip <id>` works for one id when nothing else is stale.
- A capture run rewrites the manifest and asset map in registration order; compare by capture id. It records dirty source files, so no other worker may edit `src/` during a capture run.
- `just preview` does not build: `just build` on a clean `src/`, stop the old server by PID (`netstat -ano | grep ":4333 "`), start `just preview 4333`, and only then run `sh .command-logs/restore-pages.sh` (the preview refuses to start when `build/` differs from the runner's build, and every build removes the owner's comparison pages). The script copies `pilot/`, `accent/` and every `bN/` page into `build/walkthrough-graphs/`; `.command-logs` is untracked, so recreate the script from this description if it is gone.
- Full `just lint` only (a subset fails on unused suppressions). `just publish --background` needs `--base` and `--commits` (oldest first, comma-separated).
- Split a batch into two workers: "graph changes, copy and unit tests" (then the handler commits, builds and restarts the preview), then "recipes, capture, live screenshots, posters review, page" against the running 4333 server, read-only (B4: about 6 and 18 minutes).
- Palette roles settled with the owner: moss primary curve, blue second role (dashed when it lies near the first), ochre points with a light outline, `GraphPalette.emphasis` (rust red) for one accent; no amber or near-black accent against blue. When a colour is rejected, show several candidates side by side (`accent/` is the model).

## Next slice inputs, in order

1. Confirm the B3 to B5 publish and CI (above), rebase, and say so under "For the owner".
2. B6: wait for the owner's yes on `b6.html`, then publish.
3. **B7 rational**: accept the worker's capability change and three captures; page `b7.html`; wait for the owner.
4. **B8** split a to d as the triage proposes: B8a functions and analysis (`extrema` last, after its `presentBoard` override at `capture-demonstration-previews.cjs:508-516, :568, :749` is dropped), B8b maps and plane geometry, B8c compgeo, B8d B-splines and `projective-cross-ratio`. Text only; patterns are in the triage table. `complex-multiplication` and `root-finding` are hide-only (no `strip`). `linear-map` needs Keep in part, `projective-pascal` is No text. One worker per sub-batch, recipes and captures only, against the running 4333 server.
5. **B9 epicycles card** (recipe label stale; show a subject), **B10 patches** (overlap fix), the `voronoi-degenerate` stale label.
6. The guided example recapture per chapter.
7. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
