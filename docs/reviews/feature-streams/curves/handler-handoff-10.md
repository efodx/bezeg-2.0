# Curves stream: handler handoff 10

Handler 10 wrote this on 2026-11-01. `G-REG` opened. Handler 10 started F2b registration and then stopped: the machine ran critically low on memory, and Claude Code killed the full unit suite and the handler's context watcher. No agents are running. Run state is `stopped: low memory killed the R1 unit suite; resume from handler-handoff-10`. The supervisor does not relaunch a stopped stream; the owner restarts it once memory allows. Settings are unchanged from [handoff 8](handler-handoff-8.md): handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`.

## Work in progress: F2b R1 (not on master)

The WIP commit `148b1f1` sits on the remote branch `origin/stream-curves-r1-wip`, on top of master `8ac4631`. It is also the local `worktree-stream-curves` HEAD in `.claude/worktrees/stream-curves`. It registers six Demonstrations with `lesson: false`, because lessons come in F3:

| Id | Route | Family |
| --- | --- | --- |
| `curve-parametric` | `/bezeg-2.0/curve-geometry/parametric` | new `/bezeg-2.0/curve-geometry` (*Geometrija krivulj*) |
| `curve-curvature` | `/bezeg-2.0/curve-geometry/curvature` | same |
| `interp-lagrange` | `/bezeg-2.0/interpolation/lagrange` | new `/bezeg-2.0/interpolation` (*Interpolacija in aproksimacija*) |
| `interp-hermite` | `/bezeg-2.0/interpolation/hermite` | same |
| `interp-subdivision` | `/bezeg-2.0/interpolation/subdivision` | same |
| `patch-coons` | `/bezeg-2.0/patches/coons` | existing patches family |

Contents of the commit:
- **Lesson id type.** The new `LessonDemonstrationId` type and the `isLessonDemonstrationId` guard in `src/demonstrations.ts` key `guidedLessonOwners` and `guidedLessonPreviewCopyByDemonstration`, so a lesson-less Demonstration needs no fake lesson entries. Consumers are narrowed by the guard, without casts. Commit this separately from the registration when the WIP is split.
- **Registration.** The commit also covers:
  - graph factories;
  - locale keys (titles from the specs verbatim; prompts checked for mathematical claims);
  - preset collections in `PresetImport.ts`, with keys in `PresetCatalog.test.tsx`;
  - preview recipes for all six;
  - an updated `src/demonstrations.test.ts`.
- **Test support.** The transient-state contract harness learned `patch-coons`: `realGraphTestHarness.tsx`, `realGraphScenes.ts` and `graphTransientStateContract.tsx`.

Checks at `148b1f1`:
- `tsc` clean.
- Lint passed on all changed files.
- Recipe node tests passed 36/36.
- A partial unit run passed 621 tests with 6 failures: the poster test for the six ids (expected until R2), four hard-coded lists in `demonstrations.test.ts` (since edited, rerun not seen), and `DemonstrationsPage.test.tsx` asserting a poster `src` (expected to clear in R2).
- The full unit suite was killed by memory pressure and has not passed.

## Next steps
1. In the stream worktree, rebase `148b1f1` onto `origin/master`. Run `just unit` and confirm that the only failures are the poster test and the `DemonstrationsPage` poster `src`. Show the `PresetCatalog` key assertion failing with the five `PresetImport` registrations removed. Run `just build`.
2. **R2 posters.** Run `just build`, then `just preview 4314`. Then run `PREVIEW_RECAPTURE_IDS=curve-parametric,curve-curvature,interp-lagrange,interp-hermite,interp-subdivision,patch-coons PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_BASE_URL=http://127.0.0.1:4314/bezeg-2.0 node scripts/capture-demonstration-previews.cjs`. FFmpeg is on PATH from `Desktop\ffmpeg-master-latest-win64-gpl\bin`. Add `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` only after checking the presentation diff ([commands](../../../commands.md)). The `patch-coons` camera in the recipe is computed, not yet seen in a capture: inspect the poster.
3. Smoke the six routes in SL and EN with a live switch, plus the catalog. Include the browser items left from handoffs 6–8 "Open items for registration".
4. Split into two commits: the lesson-id type, then the registration with posters. Push to master promptly, since `demonstrations.ts`, the locale files and the preview manifest are shared with Geometry. After a rebase, regenerate the manifest with the script; never merge it by hand. Delete the remote branch `stream-curves-r1-wip` after the push.
5. Then do F3 lessons (CG-B1-3, I1/I3/I5, D4) as handoff 8 lists. Each removes its `lesson: false`.

## Lessons
- At session start, the watcher found no transcript for the handler or for the worker. They had not been written yet; restarting the watchers a minute later worked.
- The R1 worker reached 135k after 84 turns. Six registrations plus recipes is too much for one Sonnet worker: split recipes and the test-harness work into their own slice next time.
