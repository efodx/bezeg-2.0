# Learn UI stream: handler handoff 5

Date: 2026-10-31. Handler 3 hands off near its soft context threshold, after the owner accepted every audit recommendation. Read [handoff 4](handler-handoff-4.md) for the session's earlier work: section 1 accepted, CI fix `9ecde47a` green, audit 00 done.

## State

- Branch `worktree-stream-learn-ui` equals `origin/master` at `a0d30161`. Clean apart from untracked smoke screenshots under `pg4b-smoke/`.
- The owner accepted D1–D12 on 2026-10-31. They are recorded in [the spec](../../../specs/guided-example-highlights.md#owner-decisions-2026-10-31-audit-00). Scope is 67 examples, 29 figures and nine chapters. The new task [06](../../../tasks/guided-example-highlights/06-batch-patches.md) covers the Bézier patches chapter, and 05 now depends on 06.
- `Run state: active` is pushed.

## Next

1. Dispatch tasks **01** (capture pipeline: recipe format, runner steps, manifest; samples S1–S3 from D8; D10 distance) and **02** (larger card layout) in parallel. They are file-disjoint: 01 owns `scripts/capture-guided-example-previews.cjs`, the inventory and the manifest; 02 owns the card components and CSS. They must agree on the image pixel size: decide it in the briefs, for example by having 02 fix the rendered card image width and 01 capture at 2× that. Use `bezeg-worker` Sonnet medium. Each task is bigger than about 20 turns, so split 01 into a format-and-runner part and a samples-and-failure-modes part. Memory has been tight: check free RAM before two parallel workers.
2. Review: 01 gets engineering review, plus mathematical review for the highlight checks. 02 gets engineering plus UI/accessibility review, and browser validation that includes the **390 px / 200% text overflow check** (the miss behind the `8f23b566` CI failure).
3. After 01, do batches 03 ∥ 04 ∥ 06, at most two at a time. 03 and 04 share `familyChapters.ts` and the manifest (README shared-file rules); 06 touches only the patch files. Then 05. `G-HL` opens when 01 and 05 are accepted.
4. Section 1 F6: `just check` at a stable checkpoint.

## Open items

Same as handoff 4: `do-log` records still unwritten, and screenshots stay local.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` with `SMOKE_PORT=4312`.
