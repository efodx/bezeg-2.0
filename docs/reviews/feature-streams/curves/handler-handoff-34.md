# Curves stream: handler handoff 34

Handler 34 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 33](handler-handoff-33.md).

## State

- Branch `worktree-stream-curves`, pushed to `origin/master`; the head is the commit that adds this note. Working tree clean.
- Nothing is in flight: no workers and no preview.
- Hosted CI for `7601ea6a` (the transient-state fix) was pending at handoff. The run for `7b8ac495` failed only in `unit (2)` on that contract case; every browser shard passed. **First step: confirm `7601ea6a`'s run (or a later one) is green**, with `gh run list --branch master --limit 5`.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Haiku for narrow checks, Sonnet for broad checks or new UI.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `eed10ca6` | PS-B-4c P4 lesson hooks (handler-made): typed `summary` kind (`set-value`, `add-value`, `remove-value`), choices `summary-example`/`-rule`/`-sigma`, visibility `summary-box-plot`/`-sigma-band` | PS-B-4c row in `docs/tasks/probability-statistics/README.md` |
| `7b8ac495` | PS-B-4d1 six-step lesson `prob-summary` (Sonnet worker) and PS-B-4d2 chapter section `summary` (handler), one commit because the ownership test needs the section | PS-B-4d1 / 4d2 row |
| `7601ea6a` | Fix: `perturbModel` in `src/graphs/base/realGraphScenes.ts` switches `prob-summary` examples (CI's full transient-state run failed after `lesson: false` was dropped) | evaluation record |
| this commit | Stream row, evaluation record (curves handler 34), this note | `docs/agent-workflow/evaluation-log.md` |

**Batch A/B F6 gate (P1-P4) on `7b8ac495`:**
- `just check`: tsc, lint and 9451 unit tests passed. Three `guidedExamplePreviews` cases failed on the known cache artefact; they passed after `npx vitest --clearCache`, and `just build` then passed on the clean tree.
- Family smoke (`bezeg-smoke` Sonnet, preview of `7b8ac495`): passed. Covered:
  - all four routes in SL and EN at 1440 and 390, with no console errors and no horizontal scroll;
  - exact P4 readouts;
  - marker sizes of about 14-16 px against 10 px dots (the handler viewed the screenshots);
  - the chapter's five sections with rendered math;
  - the lesson walked in both languages, with the quoted values matching;
  - the catalog card.
- Smoke gaps: dot drag, the Tab order and Presets on P4 (host tests cover them); P1-P3 graph content checked only for presence.
- Not run in the gate: the posters (blocked, below). Hosted CI is pending (State).
- On `7601ea6a`, after the rebase: tsc, and 2501 tests over every transient-state part at `BEZEG_TRANSIENT_STATE=all`, learning and demonstrations.

## Next steps, in order

1. Confirm hosted CI is green (State). If `unit` fails again, run that shard's file with `BEZEG_TRANSIENT_STATE=all`; local runs sample the contract.
2. Record the F6 gate in `docs/tasks/probability-statistics/README.md`: add a PS-B-F6 row from the evidence above, with posters pending, and mark Batch A/B released once CI is green.
3. Joint poster capture. `POSTER_PENDING` holds:
   - curves ids with recipes: `prob-binomial-normal`, `prob-clt`, `prob-summary`;
   - Functions ids with recipes: `polynomial-zeros`, `rational-function`;
   - Geometry ids with **no recipes yet**: `monotone-partition`, `monotone-triangulation`, `voronoi`, `voronoi-degenerate`.

   The capture needs every shipped id's recipe, so it stays blocked until Geometry adds those four. Check `scripts/demonstration-preview-recipes.cjs` again, and follow the `curves.md` "To Geometry" note; update that note if it is stale.
4. Then Batch C, P5 correlation (PS-C-*). It waits for Batch B released and interpolation I4 released. Plan the P5 slices from the spec P5 section first, like the P4 plan (model / graph / registration / hooks / lesson / section).
5. Low priority:
   - the P4 lower fence lies outside the fitted view in the outlier example; consider fitting the fences when the box shows;
   - pointer drag stops at the board edge;
   - `importPresetData` clears the notice without its own render request;
   - the CLT legend keeps its density wording in the CDF view;
   - refused typed values stay in their field (shared behaviour);
   - playback buttons give no reason when aria-disabled;
   - CltGraph lifecycle tests;
   - the P2 visual notes from handoff 30, item 4.

## Lessons for briefs

- Local `just check` samples the transient-state contract. Run `BEZEG_TRANSIENT_STATE=all` over `src/graphs/base/GraphTransientState` after dropping `lesson: false`, or after adding a graph whose model has no numeric field.
- A lesson slice cannot finish without its chapter section once ownership is registered. Brief lesson and section as sequential steps of one commit, or as one worker when the text is short.
- Asking the smoke worker for a size judgement per marker worked; still view two or three screenshots yourself.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-34.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
