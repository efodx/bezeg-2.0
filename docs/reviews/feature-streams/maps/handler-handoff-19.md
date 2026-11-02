# Maps stream: handler handoff 19 (PC switch)

Written 2026-11-02 by handler 19 (Opus 5.5, `auto`, effort `medium`), which continued from [handoff 18](handler-handoff-18.md). The stream is **stopped for the owner's PC switch**. `Run state: stopped: PC switch 2026-11-02, …` is set in `docs/tasks/feature-streams/maps.md`; the new-PC setup sets it back to active. No successor was launched.
- Gates: `G-REG` and `G-CG` open, `G-HL` closed.
- `master` has 08 F2a slice 1 (the inversion model) at `8e3732a1` and this note.
- **WIP branch `maps-wip-pc-switch` at `bb66362b`** on `origin`. Its base is `8e3732a1`, plus one `wip:` commit holding 08 F2a slice 2 (the inversion graph). `origin/worktree-stream-maps` still holds old diverged history; the push was not forced. The old progress branch `origin/maps-handoff-18` is merged into master. Deleting it was blocked by the auto-mode classifier, so the owner should delete it (`git push origin --delete maps-handoff-18`).
- Resume: `git fetch origin && git switch -c worktree-stream-maps origin/maps-wip-pc-switch`, then `git rebase origin/master`. Only the `wip:` commit moves.
- Test slots will be recalibrated on the new machine; `BEZEG_TEST_SLOTS` and `BEZEG_TEST_WORKERS` may differ from this PC.
- Nothing is left uncommitted. Nothing was skipped: no `node_modules`, `dist`, test results, Playwright reports, large files or secrets were involved.

## Done this session

- **08 F2a slice 1 mathematical review** (Sonnet). It found no mathematical defect. The model already uses the real-coordinate form, the secant-product sign, tangent points (not an inversion) and only `circleInversion`/`inversionImage`.
  - Low finding: the ±90° wrap was undocumented. It is repaired in `8e3732a1`: the header says the sign flip holds modulo 180 and that a right angle is shown unsigned, the tolerance is described as relative to r², and a test pins the 90° case.
  - Rebased and pushed to master as a fast-forward. Before the push, `just unit src/compgeo` and tsc passed at `8e3732a1`.
- **08 F2a slice 2: inversion graph** (WIP `bb66362b`, brief `docs/reviews/triangle-geometry/08-f2a-graph-brief.md`).
  - Design: a `PointSetGraph` subclass with `pointLimit: 1`. The single vertex is C, or P in the power focus. A `focus` of point, source, power or angle selects the scene.
  - Presets key `compgeo-inversion`, 71 `inversion_*` locale keys, and view `[-5, 6, 10, -6]`; the cap of 30 is kept.
  - Files: `src/graphs/compgeo/{InversionGraph.tsx, InversionPanel.tsx, inversionPresetCollection.ts, inversionText.ts, inversionView.ts}` and their tests, plus `docs/reviews/triangle-geometry/08-drag-measurement.md`.
  - Workers: w1 wrote the code and stopped at its context threshold (`08-f2a-graph-w1-handoff.md`). w2 added the tests and the drag measurement with mutation evidence; no production change was needed.
  - Reviews:
    - Engineering (Sonnet): `refreshView` on pan/zoom was untested; nested preset keys were not rejected; the `P1` rename had no checks after drag, Reset or language switch; the host assertions were weak.
    - Mathematics and drawing (Sonnet): the edge marker was wrong when C is outside the view; the angle tangents had a fixed length; a tangent could be drawn without its image curve.
    - Localization and UI (Haiku): "Tangente v presečišču…" (plural) and the spec term "potenca točke na krožnico"; Shift+arrow was missing on the θ and radius fields. The "Tangenti iz P" finding was **rejected**: that dual is correct.
  - A repair worker implemented all 8 accepted findings and stopped on the PC-switch `HANDOFF`. Its notes are in `docs/reviews/triangle-geometry/08-f2a-graph-repair-handoff.md`. It found a real bug: the view key was not recorded after a model rebuild, so stale markers stayed.
  - Checks at `bb66362b` (run by the handler): `just unit src/compgeo/inversion src/graphs/compgeo/Inversion src/graphs/compgeo/inversion src/localization` passed, `npx tsc --noEmit --pretty false` was clean, and `just lint` on the slice's files passed. `just build` passed before the repair round (worker 2).
  - Drag (jsdom): object counts are 41 (point), 41/44 (source), 53 (power) and 65 (angle); the step p95 is at most 43 ms.

## Next, in order

1. Resume from the WIP branch as above. **Confirm each repair** against its finding: read `08-f2a-graph-repair-handoff.md`, and spot-check the diffs of `inversionView.ts` `edgeMarker`, `InversionGraph.tsx` `refreshView`/`viewKey`, and `drawAngleTangents`. Item 7 (Shift+arrow) has no observed pre-fix failure; observe one under a mutation. Then run `just build`. The repairs to the marker and `refreshView` change behaviour beyond a single location, so send them to one Sonnet engineering re-review.
2. Rewrite the `wip:` commit as a proper `feat:` commit (squash or re-commit on the rebased branch, without rewriting master), push it to master, and mark 08 F2a done in the stream file.
3. 08 F2b: route `/inversion` and registration (`POSTER_PENDING`), modelled on `07-f2b-brief.md`.
4. 08 F3+F4: lesson T5 (state the orientation reversal; link complex maps lesson 1 as a prerequisite) and the chapter's fifth section. Then F5 (poster recipe) and F6 (checks and smoke), as for Batch C.

## Open items carried over

- Geometry has still not added the `PointSetGraph` vertex-name hook. The inversion graph renames `P1` itself (`nameVertex`), and the panels elsewhere still say "A (P1)".
- The posters for `linear-map`, the complex maps, `triangle-centres`, `inscribed-angle`, `euler-line` and `simson-line` wait for the shared capture (Curves BS-A-5b).
- Content nits from handoff 17 are still not applied.
- Not verified for the inversion graph: a real browser, the angle-focus handle drags, and a full read-through of the English text.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet 5.5 `medium`. A full graph slice exceeds one worker's 135k budget; split code from tests up front.
- Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI and localization. Check Haiku's Slovenian grammar findings; one was wrong about the dual.
- Smoke: `bezeg-smoke` Sonnet on port 4316. No preview is running.
