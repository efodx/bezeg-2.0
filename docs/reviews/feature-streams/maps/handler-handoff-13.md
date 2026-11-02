# Maps stream: handler handoff 13

Written 2026-11-02 by handler 13 (Opus 5.5, `auto`, effort `medium`) at the 150k context threshold. The supervisor started this handler after handler 12 ended without a successor. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`.

## Done this session (all on `origin/master`)

- `15601082`: handoff 12, plus the 05 F3+F4 brief and W1 notes.
- `8ab6a707` **triangle geometry 05 F3+F4**: Learn chapter `triangle-geometry` with lessons T1 `triangle-notable-points` and T2 `inscribed-angle-thales`. Handler additions to handoff 12's WIP: preview copy for both lessons in `guidedExamplePreviewCopy.ts` (the counts there are now 67/74), and rebase resolutions that kept both sides against the projective and triangulations work.
- `40a83c70`: Learn chapter count 14, since the triangulations and triangle geometry chapters both landed.
- `e1e2df18` **05 F5 poster recipes** for `triangle-centres` (O, I, H overlays on) and `inscribed-angle` (radii on), framed `[-3.55, 5.81, 10.55, -2.81]`, with exact-point evidence. `validateRecipes` now passes for the whole catalog.

Checks: tsc after each rebase; eslint on the changed files. Focused `just unit` on learning, localization, compgeo, catalog and routes: 2078 tests before the rebases. After the triangulations rebase, the full `src/learning`, demonstrations and routes run passed at `e1e2df18`. Also: `just build`; `just smoke-lesson triangle-centres inscribed-angle`; the unified-learning smoke (before the last rebase); and `node --test scripts/demonstration-preview-capture.test.cjs` (36/36).

Review: engineering + mathematical review by `bezeg-reviewer` (Sonnet). It found nothing blocking and recomputed every quoted number: G, O, R, I, r, H, ∠ACB 66.8°, the obtuse, right and Thales examples and views, and the glider arcs. Its one minor finding is fixed: the preview copy now names the central angle.

Browser: `bezeg-smoke` (Sonnet) checked the Learn chapter link, all 7 steps of both lessons, the SL→EN→SL live switch (no leftover Slovenian, decimal comma correct) and the EN direct routes. No console errors. Not covered: narrow viewport, keyboard, dragging, the collinear triangle. Shots are in `.command-logs/t05-f3/shots/`.

## Known red on master (not Maps)

`tests/unified-learning.smoke.spec.cjs:88` expects 2 Bézier patches section figures. Learn UI's `f0c35c4f` removed them. Noted in `maps.md` for Learn UI; leave it to that stream.

## Next, in order

1. **05 F6 (Batch A acceptance):** the gate in `docs/tasks/triangle-geometry/05-batch-a-release.md`. Run `just check`, then smoke both routes and lessons in both languages, covering what this session did not: the collinear example, keyboard use, narrow viewport and dragging. Check hosted CI after the push. Posters for `triangle-centres` and `inscribed-angle` (and the older `linear-map`, `complex-reciprocal` and `complex-roots`) come from the shared capture. When they exist, remove the ids from `src/demonstrationPosterPending.ts` and update the Learn thumbnail count in `LearningPage.test.tsx`. Example cards stay blocked behind `G-HL`.
2. Then **06 Batch B** (Euler line and nine-point circle, F2a–F6) under `docs/tasks/triangle-geometry/06-batch-b.md`.

## Open items

- Geometry has not added the `PointSetGraph` vertex-name hook; panels still show "A (P1)".
- In the lessons, scenes set the vertices with `set-points`, so the example selector shows "custom" on the right, obtuse and Thales steps.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`. Reviewers: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Sonnet on port 4316. Do not leave a `just preview 4316` running while a `smoke-built` run needs the port.
