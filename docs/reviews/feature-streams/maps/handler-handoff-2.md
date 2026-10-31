# Maps stream: handler handoff 2

Written 2026-10-31 by handler 2 (Opus 5.5, permission mode `auto`, effort `medium`) after its 150k soft threshold. All delivered work was integrated, verified and pushed before writing this note.

## State

- Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, rebased on `origin/master` and pushed to `master` at `e077cd5`. `origin/worktree-stream-maps` is stale (pre-rebase); master holds everything. Do not force-push it. `node_modules` is a **junction** to the main checkout: delete the junction before removing the worktree.
- `Run state: active`.

## Accepted and on master

| Commit | Work | Verification |
| --- | --- | --- |
| `14680fe` | Linear 01 matrix kernel (from handler 1) | Full unit suite passed (956 s, revision `3a36be6`, included 01–03 and the Möbius files) |
| `3300570` | Triangle geometry F0: `docs/tasks/triangle-geometry/` (01–08), ADR 0030 (shared `BigInt` `Rational` in `src/compgeo/rational.ts`, glider as the only inexact input, new family *Geometrija ravnine*), terms, spec marked scheduled | Docs only |
| `03b143e` | Linear 02 eigen/singular kernel | Worker mutation evidence (7 mutations applied together); handler math review; handler fix: `singular` rejects off-grid entries |
| `0ee41bc` | Linear 03 state model | Worker mutation evidence; handler fix: an imported named example whose matrix does not match becomes `custom` |
| `054fbae` | Complex 01 Möbius/inversion kernel | Worker mutation evidence for all 6 groups; Sonnet math review (no high/medium); handler fix: `c = 0` decided in grid units in `mobiusPole`/`mobiusImageOfInfinity`; composition caveat documented |

After the rebase: `npx tsc --noEmit` passed and `just unit src/linear src/analysis/complex` passed on clean `e077cd5`.

## Open notes from reviews (low, not fixed)

- `circleInversion` throws on a bad radius while `inversionImage` returns `invalid`; graph callers (complex 03, triangle 08) must guard the radius.
- `mobiusImage`/`inversionImage` accept a point-circle or empty source (|B|² ≤ AC); only `describeGeneralizedCircle` rejects it. Graph code should validate sources.
- The complex spec's integer-bound estimate (~2e7) is low; the real bound is ~2e12 for inversion, still far below 2^53 and covered by a BigInt range test. Spec text not corrected.
- `gridUnits` is duplicated in `complexMobius.ts` because `complex.ts` does not export it.
- `parallelSine` takes radians and returns a signed sine; `testAngle` in `linearMapModel` is degrees in [0, 360). Task 05 converts.

## Next steps, in order

1. Two workers in parallel, both ungated: linear **04** (grid drawing measurement + ADR; needs a measurement per `docs/performance-plan.md`, so it is part handler work: the ADR is the handler's) and complex **02** (reciprocal/roots kernel, Sonnet `medium`). Then complex **05** (sampler).
2. Then linear 05 and complex 03 (F2a graphs). Everything from F2b on waits for `G-REG`. Platform recorded step 1 (A1, A9a) on master (`4329197`); check `docs/tasks/feature-streams/platform.md` for whether `G-REG` (A9a **and** A10) has opened.
3. Triangle kernel tasks 01–03 wait for `G-CG` (`docs/tasks/feature-streams/geometry.md` on `origin/master`; closed at this handoff).
4. When only gated work remains, set `Run state: waiting on G-REG, G-CG`, push, and end without polling.

## Risks and lessons

- **Watcher "no transcript for this agent id" root cause:** the worker's transcript appeared at the expected path (`~/.claude/projects/<worktree project>/<session>/subagents/agent-<id>.jsonl`) but only after the watcher's 2-minute window, because worker startup was slow under load. Wrap the watcher in a retry loop (`for i in 1 2 3 4 5 6; do python tools/agent-usage/claude_worker_watch.py <id> --until 135000 && break; done`), or raise the tool's startup window.
- **Never include a force or force-with-lease push** (the auto-mode classifier refuses it, correctly). Push `HEAD:master` only.
- Heredocs in Bash fail on some quoting and collapse backslashes; write Markdown and TS with the Write/Edit tools.
- Machine load: the full suite waited about 8 minutes for the single test slot, then ran for 16 minutes. Run it once per batch of slices, not per slice.
- ADR number races: check `git ls-tree origin/master docs/adr/` after the final fetch, immediately before pushing. Note that master already has two ADRs numbered 0026 (another stream's).

## Settings to keep

Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium` (`high` for exact geometry kernels); reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` on port 4316.
