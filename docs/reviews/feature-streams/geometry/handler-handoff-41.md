# Geometry stream: handler handoff 41

Written 2026-11-03 by handler 41 (Opus 5.5, auto, effort medium). Continues [handoff 40](handler-handoff-40.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run

1. **T3 tasks 23 and 24b accepted**: lesson B5 and the `voronoi-degenerate` chapter section ([record](../../triangulation-voronoi/23-acceptance.md)).
   - Rebased twice onto `origin/master`. The first rebase hit three mechanical conflicts with curves P4. Recounts: 111 audited homes, 97 lessons with preview copy, 104 copy entries.
   - A Sonnet engineering review and a Sonnet math review. Every quoted value matches the kernel.
   - Both reviews found a real bug: `\\(D\ne0\\)` in the chapter's Examples paragraph rendered a newline in sl and en.
   - Fixed, together with wording errors. The collinear end cells are half-planes. Delaunay is unique if no four points lie on an **empty** circle. The sl phrase "Primerjaj zgradnjo" is gone. The spec's correctness notes and task 23 are corrected as well.
   - `lessonMathNotation.test.ts` now rejects control characters in localized text, which catches single-backslash `\ne`, `\times`, `\frac` and the like.
   - Checks: `just check` (the only failures are master's own `PresetCatalog` failures, see below), build, `just smoke-lesson voronoi voronoi-degenerate` 4/4, and the chapter page in sl and en checked in the browser.
2. **T3 F6 started.**
   - Evidence matrix: [f6-t3-evidence-matrix.md](f6-t3-evidence-matrix.md), 89 rows: 72 covered, 16 partial, 1 missing (figure export). Its Gaps table lists the work.
   - `docs/current-architecture.md` no longer says the Voronoi graphs have no lesson.
   - **Poster recipes** for `monotone-partition`, `monotone-triangulation`, `voronoi` and `voronoi-degenerate` (Sonnet worker, `d5435c73`; evidence in `docs/reviews/triangulation-voronoi/f6-recipes/`).
     - The tooling test passes 35 of 36. The VP9 encoding test fails here even without the recipes; it looks environmental (FFmpeg).
     - No poster has been rendered yet. If `voronoi-degenerate` draws its circumcircle, it may extend past the window.

## Branch state: NOT on master

- Branch `stream-geometry` at `722b17c5`, also pushed to `origin/geometry-t3-accepted`. Fast-forward pushes only; `origin/stream-geometry` and `origin/geometry-t3-23-24b` are older.
- Base: `3e711627`. Master has since gained `3c1c0bb8` and `8a80ae19` (probability P5 registration and hooks), and possibly more.
- **Why not pushed:** master CI is red from the functions stream. `PresetCatalog.test.tsx` fails twice because Fourier 05 F2a-1 (`39217a5e`) added the `fourier-coefficients` Preset key without adding it to the expected list, and it has no graph yet.
  - The failure is identical in master's hosted CI (runs 41586412506 and 41590409905) and is not touched by this branch.
  - It was still red at 06:55 UTC. The owner asked to gate every push on passing checks, so I did not push.

## Next steps, exactly

1. Fetch. If master's `PresetCatalog` is fixed (`just unit src/graphs/base/presets/PresetCatalog.test.tsx` on `origin/master`, or a green `just ci`):
   - rebase onto `origin/master`;
   - run `just unit src/learning src/graphs/compgeo src/graphs/base/presets` and recount the count tests (P5 `prob-correlation` registers a new id, so `CHAPTER_LINK_PENDING`, the lessonless list and the counts may move);
   - push to master with `git push origin HEAD:master` only if that passes.
   - If master is still red after a reasonable time, ask the owner whether a push that fails only on another stream's pre-existing test is allowed. Do not fix functions' files while that stream is active.
2. **Joint poster capture.** The curves note in `docs/tasks/feature-streams/curves.md` (curves handler 35) says whichever stream lands the last recipes captures all nine `POSTER_PENDING` ids, plus `prob-correlation` once it has a recipe. Curves will do it if our recipes reach master first.
   - Once the recipes are on master, check the curves stream file: either curves claims the capture, or we run it.
   - Procedure: the curves handler 28 note; `docs/commands.md` lines 38–42.
   - View every image, especially the `voronoi-degenerate` window.
   - Then fix the "no poster until the joint capture" clause in `docs/current-architecture.md`.
3. **T3 F6 gaps from the matrix** (at most two workers):
   - **Test gap:** add the B4 prerequisite `delaunay` and the "illustrates, does not prove" sentence to `compgeoVoronoiLesson.test.ts`, with a mutation each.
   - **Docs gap:** `docs/capabilities.md` l.90 should name the Voronoi routes. `GLOSSARY.md` gains Voronoi diagram, duality and cocircular points (with the spec's Slovenian terms, lines 32–54).
   - **Bilingual smoke** of `voronoi` and `voronoi-degenerate` on the 4313 preview (`bezeg-smoke`) covering:
     - figure export (SVG and PNG; the one missing row);
     - reload;
     - a live language switch inside the lesson;
     - keyboard Tab order and focus ring;
     - 390 px width;
     - legibility at 1280×720;
     - focus restore on return;
     - the chapter layout;
     - a 40-site drag with `scripts/triangulation-browser-perf.cjs`.

     Template: [f6-s2-smoke.md](f6-s2-smoke.md).
   - `just check`, hosted CI, and the record `f6-t3-acceptance.md` on the [S2 template](f6-s2-acceptance.md). Update the stream row.
4. After T3 F6: S3 (C5 Fortune). Its release condition is T0 and T3 accepted plus a beach-line performance measurement. No task files exist yet.
5. Worktree cleanup needs the owner. Add `agent-a39e6a7a29d983362` (recipes, integrated) to the list in handoff 40.

## Risks and lessons

- **Do not edit `src` while `just check` runs.** My first run read files mid-edit and reported false failures. My second run failed lint on a script I was still writing in `docs/reviews`.
- **Backslashes in this shell:** heredocs and `python -c` lose `\\` here. Write backslash text with the Edit tool, or use `chr(92)` in Python.
- **Counts conflict on every rebase.** Recount from the failure messages. If a preview test reports a missing image `src`, clear the Vitest cache with `npx vitest --clearCache`.

## Live processes

None. The preview was stopped, and every worker returned.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, watcher at 135k. Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` (Sonnet).
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 43" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor starts its own successor the same way and tells it to do the same.
