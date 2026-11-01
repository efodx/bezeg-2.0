# Learn UI stream: handler handoff 6

Date: 2026-11-01. Handler 4 hands off at its soft context threshold. Read [handoff 5](handler-handoff-5.md) for the earlier plan. Source: [spec](../../../specs/guided-example-highlights.md), [tasks](../../../tasks/guided-example-highlights/README.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

## State

- Branch `worktree-stream-learn-ui`, pushed to `origin/worktree-stream-learn-ui` (not `master`). On top of `b7e32e34` (= `origin/master` at hand-off 5):
  - `5fd4a0d6` 01 part A: recipe registry `src/learning/chapter/guidedExampleHighlights.ts`, runner, validation.
  - `a3dc9d4c` 02 card layout (accepted; image 240→364 px, stacked 328 px at 390). [Layout note](../../guided-example-highlights/layout/layout-note.md).
  - `411c6593` stale `ChapterPage.test.tsx` 720×440 → 840×520 (02 had missed it; only `ChapterGuidedLessons.test.tsx` was run at acceptance).
  - `6b3aab24` 01 part B: `explore`, `select-tab`, `set-control` steps (`scripts/guided-example-control-steps.cjs`), independent expectations (`guidedExampleHighlightExpectations.ts`), S1–S3 captured, `docs/commands.md` updated. [Capture note](../../guided-example-highlights/capture-note.md).
  - `a32caac7` D10 distances (`scripts/ph-offset-singularity.cjs`, [note](../../guided-example-highlights/ph-singularity-distance.md)).
  - plus this note and the stream record update.
- Untracked and local only: `pg4b-smoke/` and `guided-example-highlights/layout/*.png` screenshots.
- Why not on `master`: the S1–S3 card images now show highlight states while their captions still describe the start scene, which batches 03/04 rewrite. Push to `master` once 01 is accepted, and either batch the captions with it or accept the short mismatch explicitly.

## Checks at `a32caac7`

`just unit src/learning` passed (dirty tree = only the stream record); `just lint` passed; part B worker reported `just typecheck`, `just build` and 48 guided-example script tests passing (`node --test scripts/*guided-example*.test.cjs scripts/guided-example-control-steps.test.cjs`); D10 tests 7/7. Full guided-example capture: 56 entries; 14 start PNGs changed by anti-aliasing only (≤57 pixels each, worker opened 3 pairs). Not browser-verified: `number` controls, checkbox-false, `save` tab.

## Next

1. **Review 01** (parts A+B, `5fd4a0d6..6b3aab24` minus `a3dc9d4c`, plus `a32caac7`): engineering review (`bezeg-reviewer` Sonnet): consumers, stale/partial-run logic, whether new assertions fail without the change, `explore` step against `DemonstrationWorkspace.tsx:133` and `GuidedLesson.tsx:144`. Mathematical review (`bezeg-reviewer` Sonnet): `guidedExampleHighlightExpectations.ts` checks (|O−r|=0.5, perpendicularity, R(1/2)=(−9/11,21/11), weighted warp) and the D10 curvature/self-intersection script. Repair, then accept 01 and push to `master` under AGENTS.md.
2. Then batches 03 ∥ 04 ∥ 06, at most two at a time (03/04 share `familyChapters.ts` and the manifest; README shared-file rules). Then 05. `G-HL` opens when 01 and 05 are accepted.
3. Section 1 F6: `just check` at a stable checkpoint.

## Open decision (owner)

D10 quintic card: the handler chose d = −2.5 (real self-intersection from the secondary bend at t = 0, outside the 1.5ρmin rule); the cubic card takes the D10 fallback (start plus offset). Owner confirmation asked on 2026-11-01; batch 04 needs the answer before authoring `ph-quintic-singularity`.

## Workflow notes

- The worker watcher exited with "no transcript for this agent id" twice when started right after dispatch; a later start worked. Start it again if it fails immediately.
- Part B's first worker hit 136k at 64 turns: the slice was too big. Keep batch briefs to about 20 turns.
- `do-log` records still unwritten for handlers 3–4.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` with `SMOKE_PORT=4312`; capture preview on 4387.
