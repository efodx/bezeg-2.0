# B11 brief (handoff-v13): guided example images in the current colours (G02)

**Role.** `bezeg-worker`. Edit only the owned paths. No git commands that move HEAD, no commits, never push. Scratch in `.command-logs/`, never `/tmp`. Do not build and do not stop or restart the preview on port 4333 (it serves this worktree's current build). Do not edit any `src/` source file; the capture outputs are the only `src/` files you write.

**Goal.** The lesson chapters' stored example images (`src/images/learning/examples/`, the retained top-level set plus one folder per chapter) were captured before batches B1–B10 changed graph colours and typography. Recapture them on the current build so the cards match the live graphs. Procedure and the script's rules: `docs/commands.md` lines 78 and 80 (read both paragraphs in full before starting).

**Order (stop and report on the first refusal you cannot resolve by following `docs/commands.md`):**

1. Retained set (top-level `manifest.json`, 56 PNGs: Bézier, PH, parameterizations, Farin points, analysis, functions, foundations, …): generate the inventory with `node scripts/generate-guided-example-inventory.cjs .command-logs/b11-retained-inventory.json`, then a full capture `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 node scripts/capture-guided-example-previews.cjs .command-logs/b11-retained-inventory.json > .command-logs/b11-retained.log 2>&1`.
2. Chapters named stale by the previous handler: `probability`, `interpolation`, `curve-geometry`, `projective-conics`. Per chapter: `node scripts/generate-guided-example-inventory.cjs --chapter <id> .command-logs/b11-<id>-inventory.json`, then `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 node scripts/capture-guided-example-previews.cjs .command-logs/b11-<id>-inventory.json --family <id> > .command-logs/b11-<id>.log 2>&1`.
3. Every other chapter folder under `src/images/learning/examples/`: same two commands. A chapter whose capture produces byte-identical PNGs needs nothing; restore its manifest from git only if the PNGs are identical and the manifest change is provenance only (`git checkout -- <path>` on that one file is allowed), and list it as unchanged.

Run captures one at a time (the machine is shared and CPU-bound).

**Acceptance.**
- A. Each run exits 0; report per chapter: images changed / unchanged / failed (with the failing line from its log).
- B. Read at least two changed images per changed chapter with the Read tool (and every image of `curve-geometry` envelope, curvature, evolute): colours match the live palette (moss primary curve, blue second role, ochre points with a light outline, rust red for one accent), board text in Literata, nothing cut off or overlapping. Name any image that looks wrong.
- C. Copy, for each changed chapter, two before/after pairs into `docs/reviews/site-walkthrough/graphs/b11/before/` and `after/` (before from `git show HEAD:<path>`), named `<chapter>--<file>.png`, and write `docs/reviews/site-walkthrough/graphs/b11/index.html` in the format of `../b9/index.html` (one section per chapter; image pairs).
- D. `git status --short src/` lists only files under `src/images/learning/examples/`.

**Owned paths.** `src/images/learning/examples/**`, `docs/reviews/site-walkthrough/graphs/b11/`, `.command-logs/b11-*`.

**Return.** ≤250 words: table chapter → changed/unchanged/failed, images that look wrong, anything not done. Fuller note in `docs/reviews/site-walkthrough/graphs/b11/worker.md`. On `BUDGET HANDOFF`, stop and write that note with the chapters still to do.
