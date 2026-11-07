# Collision stream — handler handoff 2

Written 2026-11-07 by handler 2 at a clean boundary: feature 1 (batches A and B) is released. Worktree `.claude/worktrees/stream-collision`, branch `worktree-stream-collision`, port 4320. Task table: [collision-playground tasks](../../../tasks/collision-playground/README.md). Settings: Opus handler, `--permission-mode auto`; workers `bezeg-worker` Sonnet, smoke `bezeg-smoke` Sonnet first pass and Haiku rechecks.

## Released (pushed to master)

- CP6 part 2: the chapter blocks are in `/bezeg-2.0/learn/sweep-algorithms`.
- CP7 batch B acceptance: [matrix](../../collision-playground/batch-b-acceptance.md).
- Containment:
  - The "paused" baseline had been playing. Truly paused, the playground costs nothing.
  - Adaptive draw pacing (`src/learning/playground/collisions/drawPacing.ts`; spec Containment, "Draw pacing") brought mobile 4× scroll p95 from 77–104 ms to 52–54 ms.
  - Results are in `docs/bezier-performance-results.md#collision-playground-containment-and-draw-pacing--2026-11-07`.
- Fixes:
  - The live region announces only a snapshot that matches the action.
  - A paused method switch re-measures without stepping (`measureWorld` in `src/compgeo/collisions/world.ts`, which `stepWorld` ends with).
  - The slider shows the count itself.
- Script: `just collision-containment` lifecycle is valid on the chapter, with new `COLLISION_CP7_MODE=lifecycle` and `COLLISION_CP7_HEADED=1` modes. Run it with `MSYS_NO_PATHCONV=1` in Git Bash.
- The harness route stays as the measurement page (spec decision).
- Recorded for Controls: the shared Slider's number field is 40 px on coarse pointers.
- Checks: `just check` passed on aefa58e1 plus the paused-switch diff (1424 s); `just publish` runtime gate. Run `just ci <sha>` on the pushed head first, and fix it if CI is red.

## Open from batch B (no action unless the owner asks)

- Hidden-tab pause has unit evidence only. Chromium here keeps `document.hidden` false, even headed.
- No physical-phone measurement.

## Next slice: feature 2, batch C (convexity chapter, polygons)

Feature 1 is released, so batch C's prerequisite is met. Start by writing the task files CP8, CP9 and CP10 from the spec. That is handler work; follow the CP1–CP7 file format in `docs/tasks/collision-playground/`.

- Spec sections:
  - Owner decisions 1 and 3;
  - "Batch C bodies" under Mathematical model (around L42);
  - Interaction and presentation, batch C bullet (around L97);
  - Chapter integration, batch C (around L107);
  - Terms (separating-axis test, convex decomposition; around L123);
  - Module boundaries (around L130);
  - acceptance criteria 1 (batch C bullet) and 8;
  - Release batches.
- CP8 (Mathematical):
  - Create `src/compgeo/collisions/polygonTemplates.ts`: grid-point templates, an exact hull and convex pieces computed once per template with the existing exact kernels (find them by search in `src/compgeo`).
  - Add a SAT narrow phase in `narrowPhase.ts`.
  - Acceptance: criterion 1's batch C bullet. Use a mathematical reviewer.
- CP9 (Engineering + UI/accessibility):
  - Polygon mode and the box → hull → pieces overlay. The worker protocol already has `setOverlay` (`collisionProtocol.ts`).
  - Readouts of pairs removed per stage.
  - The convexity chapter block and prose. Choose the section in CP9 and record it in the spec.
  - Write lesson prose per the AGENTS.md notation rules.
- CP10: acceptance. Rerun `just collision-containment` on `/bezeg-2.0/learn/convexity-hulls` for polygon mode, and smoke both languages.
- Update `docs/tasks/feature-streams/collision.md` feature 2's status when the task files exist.
