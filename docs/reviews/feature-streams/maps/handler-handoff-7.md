# Maps stream: handler handoff 7

Written 2026-11-01 by handler 7 (Opus 5.5, `auto`, effort `medium`). Gates: `G-REG` and `G-CG` open, `G-HL` closed (highlights 01 accepted, 05 not). `Run state: active`. Branch `worktree-stream-maps`, worktree `.claude/worktrees/stream-maps`. Everything below is on `origin/master` at `1324eba5`; the tree is clean.

Handed off early, before F5: the machine ran critically low on memory. Claude Code stopped this handler's context watcher, its worker watchers and its first full-suite run, so the context could no longer be measured.

## Done this run

- **Linear 07 F3+F4** was already on `master` when this run started (handoff 6's rebase).
- **Triangle 04b** inscribed angle graph (`5d629d58`). Model `src/compgeo/inscribedAngleModel.ts`; graph `src/graphs/compgeo/InscribedAngleGraph.tsx`, `InscribedAnglePanel.tsx`, `inscribedAngleText.ts`; Presets `inscribedAnglePresetCollection.ts` (key `compgeo-inscribed-angle`, not yet in `presetCollections`); 24 `inscribed_*` keys after the `notable_*` block. Brief: `docs/reviews/triangle-geometry/04b-brief.md`.
  - Design: grid vertices A, B, C give the exact circumcircle; AB is the chord; P is a glider with t in degrees (both examples t = 90) and `GLIDER_EXCLUSION_DEG = 0.5` around A and B in the direction of motion.
  - Two Sonnet `medium` workers (A: model + Presets in 15 tool calls; B: graph in 54 tool calls, close to its budget). Each reported a mutation failure for every test group.
  - Mathematical and engineering + UI/accessibility reviews (Sonnet): no blocking finding.
  - Handler repairs:
    - native `<input type="range" step="any">` slider (focus, Home/End, PageUp/PageDown 10°, pointer use);
    - no live region on the chip;
    - a typed t moved out of a gap replaces the draft text;
    - tests for the wrap-around at 0/360 and for overlapping gaps;
    - the huge-circle test is unconditional.
  - Drag cost (`docs/reviews/triangle-geometry/04b-drag-measurement.md`): every shown overlay, including the grid, is redrawn on each P step because `overlayInputs()` changes with t. Not optimized; task 05's real-browser measurement decides.
- **Handoff 6 low notes** (`1324eba5`): the `loadExample` comment is corrected, and `findChapterOwnedLessonByDemonstration` documents that the first registry key wins (`linear-map` → L1). The `lesson?: false` note is closed: the compgeo ids use it again.
- **Request to Geometry**, in the maps stream file's Notes: a vertex-name hook on `PointSetGraph`, so the triangle graphs show A, B, C rather than P1–P3 beside the glider P.

## Checks

- Full unit suite: passed at `abb97299` (the pre-rebase twin of `1324eba5`, clean tree, 656 s).
- After rebasing onto `origin/master` (20 new commits): tsc clean, focused `just unit` passed (04b, `src/localization`, `src/learning/chapter`, `chapterOwned`), `just build` passed at `1324eba5`.
- No browser check for 04b; it has no route yet. Its board look (labels, arc marks, P near the P1–P3 labels) is unverified until task 05.
- No evaluation (`do-log`) record was written, as with the earlier maps slices.

## Next, in order

1. **Linear 07 F5:** poster clip (a `linear-map` recipe in `scripts/demonstration-preview-recipes.cjs`, then a selective recapture with `PREVIEW_RECAPTURE_IDS=linear-map`, see `docs/commands.md` lines 32–36) and plain example cards (`G-HL` closed). Remove `linear-map` from `POSTER_PENDING` in `src/demonstrationPreviewAssets.test.ts` and the poster exemption in `DemonstrationsPage.test.tsx`. Capture only while no other worker is busy, and check free memory first: the supervisor now defers launches below 3 GB free. Review: Haiku visual comparison.
2. **Linear 07 F6:** Batch A gate, `just check`, smoke of the route and both lessons in SL/EN. Decide handle keyboard focus (handoff 6 push section: board handles are not Tab-focusable; the matrix spinbuttons are). `just linear-map-bench` on the classroom device, or record why not.
3. **Complex 04:** registration, lessons and chapter; one `chapterOwnedLessons` entry.
4. **Triangle 05:** Batch A release (routes `/triangle-centres` and `/inscribed-angle`, both Preset collections into `presetCollections`, lessons T1/T2, real-browser drag measurement for both graphs, the obtuse example's H=(1,6) view).

## Operational notes

- Under load, `just unit` (full) waits for the machine-wide test slot: the build waited 20 minutes behind the geometry stream's suite. Foreground commands over 10 minutes move to the background, where low memory can kill them. Run the full suite once per slice, at a quiet moment.
- Watchers: start them about 20 s after launch (handoff 5). Low memory can kill them too; then estimate the context from the turn count and hand off early.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium` (`high` for Möbius mathematics); reviewers `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet on port 4316. Split lesson and graph slices in two up front; a brief file shared by sequential workers worked well for 04b.
