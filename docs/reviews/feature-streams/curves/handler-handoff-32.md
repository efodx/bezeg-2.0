# Curves stream: handler handoff 32

Handler 32 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 31](handler-handoff-31.md).

## State

- Branch `worktree-stream-curves`, pushed to `origin/master`; the head is the commit that adds this note. Working tree clean.
- Nothing in flight: no workers, no preview.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new UI.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `c86f2b9b` | Fix: the `prob-clt` Preset collection checks graph state (`heights` by `checkCltModel`, the rest by `checkSceneState`, like least squares); before it, every saved CLT Preset failed import. The host test no longer passes vacuously | PS-B-2b row in `docs/tasks/probability-statistics/README.md` |
| `7fd8f1a5`, `f159ad47` | PS-B-2b: `prob-clt` registered at `/bezeg-2.0/probability/clt` (handler-made); browser smoke (Sonnet) passed; shape-edit hint reworded (a shape edit keeps n) | PS-B-2b row |
| `3a441122` | PS-B-3a lesson hooks: `clt-sum`, `clt-n`, `clt-example`, `clt-cdf` (Sonnet worker) | PS-B-3a/3b row |
| `8c52b550` | PS-B-3b seven-step P3 lesson and chapter section `clt` (Sonnet worker); `smoke-lesson prob-clt` and unified-learning smoke passed | PS-B-3a/3b row |
| `3fca4ff0` | Evidence rows, stream row in `curves.md`, evaluation record (curves handler 32) | `docs/agent-workflow/evaluation-log.md` |

Checks on the final rebased tree: tsc; `just unit` over learning, demonstrations, DemonstrationsPage, Routes, presets, CltGraph (`--no-fsModuleCache`); build; `smoke-lesson prob-clt`; `tests/unified-learning.smoke.spec.cjs`. The results are in the commit that adds this note. Earlier on this session's tree: 4685 tests over the affected suites. Not run: `just check`, the full unit suite. The Node recipe test `scripts/demonstration-preview-capture.test.cjs` failed only on the missing `monotone-*` recipes (Geometry) and a local VP9 metadata case. It was run before master's sweep chapter landed; recheck whether the monotone recipes now exist.

## Next steps, in order

1. Joint poster capture: `prob-binomial-normal` and `prob-clt` are in `POSTER_PENDING`. Check whether Geometry has added the `monotone-*` recipes (or published their posters); if all recipes exist, capture per `docs/commands.md` (selective recapture flags) and empty those ids from `POSTER_PENDING` and the `DemonstrationsPage.test.tsx` exemptions. The `curves.md` "To Geometry" note covers this.
2. P4 (PS-B-4*): read the PS-B-4 rows in `docs/tasks/probability-statistics/README.md` and spec section P4. Split the model, graph, registration, hooks and lesson as for P2/P3. A lesson plus chapter section used a full Sonnet budget (135k), so split those two.
3. Batch A/B gates (F6).
4. Low priority: CLT legend keeps density wording in the CDF view; a refused typed height stays in its field until corrected (shared field behaviour, as P2's p); playback buttons give no reason when aria-disabled; CltGraph lifecycle tests; P2 visual notes from handoff 30 item 4.

## Lessons for briefs

- An optional-call assertion (`hook?.(x)` expected undefined) passes when the hook is missing; ask for a direct call.
- Registering a route runs the first full Preset file round trip (`PresetCatalog.test.tsx`). Function models with list fields need a `checkGraphState`.
- Chain `git push` only with `&&` after `git rebase`; a `;` chain pushed a partially rebased HEAD this session.
- Other streams keep adding to the same lists (catalog counts, `POSTER_PENDING`, `CHAPTER_LINK_PENDING`, lesson opt-outs, `model.ts` name lists); every push this session needed mechanical conflict resolution and a recheck.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-32.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
