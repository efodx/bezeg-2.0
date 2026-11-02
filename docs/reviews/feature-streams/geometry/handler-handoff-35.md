# Geometry stream: handler handoff 35

Written 2026-11-03 by handler 35 (Opus 5.5, auto, effort medium). Continues [handoff 34](handler-handoff-34.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run

- **Sweep 17**, the monotone triangulation graph, accepted and on `origin/master` as `33b5f7c1`. [Record](../sweep-algorithms/17-acceptance.md).
  - Engineering, math and UI reviews all accepted.
  - The math review confirmed that deriving triangles from event kinds is exact.
  - I rejected the UI `.visually-hidden` finding: Bootstrap defines the class globally.
- **T3 task 18**, the Voronoi drawing module, accepted and on master as `c49d9c19`, `92f92cc7` and `88a4f305`. [Record](../triangulation-voronoi/18-acceptance.md).
  - A worker strengthened the tests after review.
  - **Fortune decision** (T3 README): Fortune draws its own partial sweep state, and `VoronoiDiagram` stays final-only.
- **Sweep 18**, S2 registration of `monotone-partition` and `monotone-triangulation`, is commit `37ecb779`, rebased on `origin/master` `95ee1bfe` and pushed to master (smoke still pending).
  - Mechanical count conflicts were resolved by keeping both sides: catalog 90, compgeo family 10, POSTER_PENDING, CHAPTER_LINK_PENDING, the lessonless list.
  - The worker passed the full `just unit` (9375 tests) and the build before the rebase. After the rebase I ran tsc (clean).
  - At handoff, a focused unit run plus build was still running in the background: `just unit src/graphs/compgeo src/graphs/base src/demonstrations.test.ts src/demonstrationPreviewAssets.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/localization`, then `just build`. Result on `37ecb779`: 180 files, 3699 tests passed (3 skipped); build passed. Handler 35 pushed it to master.
  - The worker added the projective ids to `PRESET_DATA_STATE_KEYS`; master already had them (`5b1a01f8`), so I dropped the duplicate.
  - The Slovenian prompts were polished by the handler.
- **T3 task 19**, the Voronoi graph, is on branch `worktree-agent-abea834710293a808`, pushed to `origin` but not merged. Worktree: `.claude/worktrees/agent-abea834710293a808`; it has a `node_modules` junction, so run `cmd /c rmdir node_modules` before `git worktree remove`.
  - Commits: `95952dfa` (graph, after a 19b continuation worker) and `72c70bd7` (review fixes).
  - Reviews:
    - Math approved. Nit: sites display 1-based, so the spec's \(p_5,p_6\) are P6 and P7; lessons 22 and 23 must say so.
    - Engineering found one should-fix, the stale import carry-over; fixed in `72c70bd7`.
    - UI found four should-fixes: stale error, query not announced, chosen-site marker, focus order. All were fixed in `72c70bd7` with mutation evidence.
  - Handler decisions:
    - The drawing box follows pan and zoom (B4 acceptance 4).
    - The query point moves by panel buttons and numeric fields, without board arrow keys, because `PointSetGraph`'s selection is private.
    - Optional, validated Preset fields `cellSite`, `construction` and `query` are allowed.
  - The worker's checks in that worktree: compgeo (617 tests before the fix round), localization, tsc, build and lint on touched sources. Not linted: `sl.ts`/`en.ts`.
  - Known gap, accepted: editing a field alone does not clear a refusal from an arrow move; the next move clears it.
  - Briefs: `docs/reviews/triangulation-voronoi/19-brief.md` and `19b-brief.md` (untracked in the stream worktree); worker notes in that worktree's `19-handoff.md`.

## Next steps, exactly

1. Sweep 18 is on master; only its smoke remains (step 2).
2. **Sweep 18 smoke** (task 18 checks; `bezeg-smoke` Sonnet worker on a production preview, port 4313: `just preview 4313`):
   - both routes, directly and after refresh;
   - catalog cards;
   - SL and EN with a live switch;
   - Next, Play and Reset; an edit; a refusal; Preset save and restore;
   - side lists and vertex-type labels at 1366 and 390 px;
   - check chain-label crowding on dense pieces (17 UI nit).
   Then mark 18 accepted in `docs/tasks/sweep-algorithms/README.md` and the stream line.
3. **Merge T3 19**:
   - cherry-pick `95952dfa` and `72c70bd7` onto `stream-geometry`. `sl.ts`/`en.ts` conflicts are possible: keep both blocks.
   - run `just unit src/graphs/compgeo src/localization`, tsc, `just lint` including the catalogs, and `just build`;
   - write `docs/reviews/triangulation-voronoi/19-acceptance.md`, which summarises the three reviews above and the fix round;
   - update the T3 README row 19 and the stream line;
   - push;
   - remove the worktree.
4. Then sweep 19 (lesson C3) and T3 20 (`DegenerateSitesGraph`), at most two workers. Run a worker in an isolated worktree when two would share a build.

## Risks

- Count-test conflicts with other streams on every rebase (catalog length, family counts, lessonless list, POSTER_PENDING, CHAPTER_LINK_PENDING). Keep both sides.
- CRLF files: edit with Edit or Python binary I/O, never `sed -i` or heredocs.
- `just unit` across many paths waits for memory and test slots, which can take over 10 minutes; run it in the background.
- Deleting remote branches (`git push --delete`) is refused by the auto-mode classifier. Stale worker branches remain on `origin`: `worktree-agent-a2c0ff0c70ae0ebe9` (merged) and `worktree-agent-abea834710293a808` (until merged).

## Settings to keep

- Handler: Opus, permission mode auto, effort medium.
- Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), medium effort; at most two at once; budget watcher at 135k, then `HANDOFF`.
- Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` (Sonnet).
- Successor launch: `claude --bg -n "geometry handler 36" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"` from the stream worktree. The successor starts its own successor the same way.
