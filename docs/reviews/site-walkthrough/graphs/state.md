# State: site walkthrough, graphs (package D)

Handler 3, 2026-11-14. Queue: [graphs.md](../../../tasks/site-walkthrough/graphs.md). Spec (approved): [graphs and captures](../../../specs/site-walkthrough-graphs-and-captures.md). Triage: [blocker-triage.md](blocker-triage.md).

## For the owner

**To look at** (Tailscale): http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/

- **Batch B3, Bézier, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b3.html . Extrapolation (the arc past the end is blue), repeated subdivision (pieces alternate green and blue), degree reduction (the reduced curve has its own blue polygon). On degree reduction the two curves nearly coincide, so the polygons carry the difference: say if you want a scene where the curves differ visibly.
- **Batch B4, PH and parameterizations, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b4.html . PH offsets are one blue family fading outward from the green base curve; the sample points on the three parameterization graphs are larger blue dots with a light outline; readouts are gone from the cards. The initial Bézier card can be recaptured again and is framed a little tighter.
- **Batch B5, curve geometry, waits for your yes:** http://desktop-a0j72sv.tail2032db.ts.net:4333/bezeg-2.0/walkthrough-graphs/b5.html . On the curvature card the osculating circle is the rust-red accent, solid over a faint disc, and the frame is tighter (the circle still fills only about a third of the width, because the control points set the height). On the evolute card the same circle is a thin ring so the blue evolute leads. Readouts are gone from all five cards; `T`, `N`, `E` stay.
- **B6 conics and three views, in work:** distance to the focus blue and distance to the directrix rust red on the conic card; on the three views the image conic blue, the moving line rust red, lighter frames. It will appear as `b6.html`.
- Your "I agree" of this evening was taken as agreement with the B5 direction only, not as approval to publish B3.

**On the public site** (CI passed): pilot captures, Literata graph text, epicycles outlines with the kitten, correlation label fix, convexity sweep, rust envelope line, B1 probability, B2 interpolation, the triage.

**One thing not changed, with its reason:** the affine clip stays in steps because its controls are step buttons.

## Where things stand

- `master` has this package up to `7b634d9d` (B1, B2, triage; CI green). This branch is rebased onto it and carries, unpublished: B3 (`16f9296d`, `a0908328`), the previous state note, B4 graph changes (`edf853d1`), the `bezier` restore fix (`49e6013a`), B4 captures (`d6f922ba`), B5 (`7b1fe5e0`, `04208bc8`, `9ba253cf`), and state notes in between (the published copies drop out at the next rebase).
- Publishing an approved batch: the commits sit in order on this branch, so publish from the oldest unpublished commit through the approved batch with `just publish --background --base origin/master --commits <oldest-first list>`. B4's captures were recorded on top of B3's manifest, so B3 goes first or together with B4. If the owner approves B4 but not B3, regenerate the manifest by a capture run on a branch without B3; never merge it by hand.
- Docs-only publish (this note, the queue): use the helper worktree `.claude/worktrees/graphs-pub` reset to `origin/master`, check out only the doc files from this branch, commit, `just publish --recipe docs`. When `graphs-pub` is no longer needed: remove its `node_modules` junction first (`cmd //c "rmdir node_modules"` inside it), then `git worktree remove ../graphs-pub` and delete the branch.
- B6 part A (conic and three-views drawing and copy) was dispatched to a worker; its note is `b6/worker.md`. Part B (recipes, captures, page) follows after part A is accepted, committed and built.
- Verified for B5: unit tests with an observed pre-change failure for the circle style (the context-ring test was added by the handler and not seen failing), typecheck, full lint, `just tooling-test`, build, five captures within 300 KiB and only those five changed in the manifest, the curvature, evolute and offset posters viewed by the handler, a control point dragged through the disc in the browser, SVG export contains the rust colour. Not verified: most 390 px and English screenshots, inspector at 310 px.

Verified for B4: unit tests of the touched graphs with observed pre-change failures (offset colour, marker fill), typecheck, full lint, `just tooling-test`, build, the seven captures within 300 KiB and only those seven changed in the manifest, after posters viewed by the handler (`ph-cubic`, `uniform-parameterization`, `spline-parameterization`, `arc-length-param`), sl 1440 live screenshots viewed by the worker. Not verified: most 390 px and English screenshots, inspector at 310 px, `just check-changed` for B3 and B4 (it runs in the publish).

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

1. B3 and B4: wait for the owner's yes on `b3.html` and `b4.html`, then publish; check CI with `gh run list --workflow browser-smoke.yml --branch master --limit 1`.
2. B5: wait for the owner's yes on `b5.html`, then publish with B3 and B4 or after them.
3. **B6 conics and three views**: accept part A, then part B: `conic-focal` window tighter (its row sweeps the eccentricity, so the conic changes shape: keep the motion in frame), `projective-three-views` window so the panels fill the frame; both text Remove. Page `b6.html`. Then **B7 rational** (first the capability fix: C1 must reach smartlabel weight labels, and `rational-subdivision`'s clip check must read the model, triage summary items 1 and 3), **B8** split a to d as the triage proposes (`extrema` last, after its `presentBoard` override is dropped), **B9 epicycles card**, **B10 patches** (overlap fix). One batch at a time through the capture step; show each on a `bN.html` page (copy `b4/index.html`), record it in the spec's "Batch records", wait for the owner before publishing it.
4. The guided example recapture per chapter.
5. The package is done when every example-table row and every Remove or Keep-in-part capture is done or has a recorded reason, and this note says so.

## Rules that carry over

- Propose, show a preview, wait for the owner on design and policy; routine engineering inside an approved direction is the handler's. Do not launch a successor while the work only waits on the owner.
- Port 4333 only; previews go through `tailscale serve` (configured). Do not edit inspector panel composition (control choice owns it) or other sessions' queue or state files.
- Workers keep scratch files in `.command-logs/`, never `/tmp`, and do not run git commands that move HEAD.
- This worktree's `node_modules` is a junction to the main checkout's. Delete the junction before removing the worktree.
