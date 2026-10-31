# Curves stream: handler handoff 8

Handler 8 wrote this on 2026-10-31, after it accepted AB-C-2a, when only gated work remained. No agents are running. **Update:** right after this note, geometry handler 3 opened `G-CG` (`69be60e`, `just check` green at `aabaf9f`). The stream is `active` again, and handler 9 starts with AB-1d. Keep these settings:
- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker` Sonnet `medium` (`high` for difficult kernels).
- Reviews: `bezeg-reviewer` Sonnet.

## State
- Worktree `.claude/worktrees/stream-curves`, branch `worktree-stream-curves`. `node_modules` is a junction to the main checkout; delete the junction before removing the worktree.
- `master` holds everything through the commit that adds this note. The remote branch `origin/worktree-stream-curves` still points at the pre-rebase WIP commit. That is harmless: never force-push it, and push to master as usual.
- Load and the push procedure are unchanged from [handoff 6](handler-handoff-6.md).

## Accepted this session

| Slice | Commits | Evidence |
| --- | --- | --- |
| AB-C-2a D4 Coons patch graph | `0516c71`..`c04f30f` on master | [ab-c-2a-graph](../../advanced-bezier/ab-c-2a-graph.md) |

The handler settled two decisions, recorded in the advanced-bezier tasks README under "D4 graph terms and imports":
- the term *premonosna ploskev*;
- the rejection of a linked import whose corners differ.

## Gate status (checked 2026-10-31)
`G-CG` is open. `G-REG`, `G-CURVE` and `G-FN` are `closed`. Every family's remaining slices wait on one of them. CG-B3-2a also waits for B2 to ship.

## Next step now: AB-1d (F1, `bezier-clipping.ts`)
- Source: [advanced-bezier spec](../../../specs/advanced-bezier-lessons.md) D2 and the [advanced-bezier tasks](../../../tasks/advanced-bezier/README.md) row AB-1d. Hull tests come from `G-CG`: the kernel is `src/compgeo/` (exact integer-grid predicates, ADR 0021), and the point-set graph is `src/graphs/compgeo/PointSetGraph.tsx`, whose overlay hook is described in its module comment. Send interface change requests to Geometry through `docs/tasks/feature-streams/geometry.md`.
- Plan the slice in the tasks README first: how the hull predicate is reused and the oracle tests. Then send one kernel worker (Sonnet `high`) and a mathematics review. AB-B graphs (F2a) follow after AB-1d.
- When AB-1d is accepted and no ungated F2a remains, set `Run state: waiting on G-REG` again.

## Next steps, when `G-REG` opens
1. Registration (F2b) for the accepted unregistered graphs:
   - curve geometry L1 and L2;
   - interpolation I1, I3 and I5;
   - advanced Bézier D4 `patch-coons`.

   Open items:
   - [handoff 6](handler-handoff-6.md) "Open items for registration";
   - [handoff 7](handler-handoff-7.md) "Open items for registration": `SUBDIVISION_ANIMATION_ID`, the `interp-subdivision` and `patch-coons` Preset collections, `PresetCatalog.test`, and the I5 text claims;
   - AB-C-2a's browser checks: drag, relink, shown surface, keyboard order, 200% text, SL/EN live switch.
2. Then lessons (F3), with one-shot lesson text.
3. If `G-CURVE`, `G-FN` or `G-CG` opens first, take that gate's F2a slices (BS-A-2a, CG-B2-1, AB-A, I2/I4, PS-A, AB-1d) and set the run state to wait on the remaining gates.

## Brief lessons (this session)
- A failing lifecycle probe after an M worker's handoff was a test-baseline artifact. React registers its document and body listeners once per container, and the tensor test's warm-up mount had hidden that. Copy the tensor test's warm-up when a new real-view lifecycle test is written.
- The split proposed in handoff 7 worked:
  - mutations by a separate worker;
  - reviews pinned to a commit and read through `git show`, so they can run in parallel with the mutations;
  - one repair worker for all findings.

  Each later worker stayed under 45k.
- Never bundle a branch-ref force update with the master push. The auto-mode classifier blocks it, and the rules forbid force-pushes anyway.
