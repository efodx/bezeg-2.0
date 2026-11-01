# Platform stream: handler handoff 9

Written 2026-11-01 by platform handler 9 at the 150k soft context threshold. Handler 8 accepted step 4 (`3887af39` on `master`) and ended without a note; the supervisor relaunched the stream as handler 9. Source: [platform stream tasks](../../../tasks/feature-streams/platform.md), step 5. Tasks: [A2](../../../tasks/architecture-deepening-backlog/02-figure-export-operation.md) and [A5](../../../tasks/architecture-deepening-backlog/05-ph-auxiliary-board.md). Previous: [handoff 7](handler-handoff-7.md).

## State

- **Location:** worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **Pushed** to `origin/worktree-stream-platform-11` (`-9` and `-10` were taken by older pushes); not on `master`. Commits on top of `master` (`3887af39`):

| Commit | Content | Review |
|---|---|---|
| `c2b57efd` | A2: `src/graphs/base/export/FigureExportOperation.ts` (app scope: language lock, failure by kind `'single'`/`'batch'`; graph scope `FigureExportScope`: admission, deferred reload, teardown). Localization keeps only `registerLanguageLock`; failure alert moved from LanguageSelector to SaveImage (single) and the Preset figure button (batch). Evidence file written | Sonnet: no blocking finding |
| `48d8ce12` | A5: `src/graphs/curves/ph/AuxiliaryBoardLifetime.ts`; HodographInputBox supplies only the host; `JXGPHBezierCurve.bindHodographPoints` (ADR 0006); StrictMode remount TypeError in `removeArcLengthText` reproduced and guarded. Evidence file written | Sonnet: no blocking finding |
| `3729bb26` | test fixtures built with `Object.create(...prototype)` get a `FigureExportScope` (the A2 `unmount` call crashed them) | handler |
| (this commit) | stream status, load note, this note | — |

- **Handler repair in A2:** the worker's failure flag was app-wide, so the alert showed under both SVG/PNG and the batch button. I made it record the kind; the new test "a failed figure batch does not raise the alert beside the SVG/PNG buttons" fails when SaveImage is reverted to `failed &&` (observed).
- **Deferred nits (no change, recorded):** a stale `'single'` alert persists across navigation until the next export (same as HEAD); A5 `attach` returns nothing if no active session (likely unreachable; HEAD created a board regardless); no unit test drags a `w` point — cover it in smoke.

## Checks run

- `just check` on `48d8ce12`: typecheck, lint passed; unit 5 failed / 7478 passed. Three failures were A2's (`CurvatureBezierCurveGraph.test.ts`, `ParametricCurveGraph.test.ts` unmount), fixed in `3729bb26` and passing (`just unit` on both files). The other two (`src/Routes.test.tsx` route count 60 vs 66; `CoonsPatchGraph.test.tsx` preset key) are pre-existing on `master` since the maps push `caa51161`; CI is red on `caa51161` and `3887af39` for exactly these. A separate session ("bezeg-2.0 ci run 41313196648") was fixing them. Not platform's.
- `just build` passed on `3729bb26` (fresh provenance; `just preview 4311` served it).
- Worker checks: A2 `just unit src/graphs/base src/localization src/graphs/functions` (1906 passed); A5 `just unit src/graphs/curves/ph src/graphs/curves/object` + GraphTransientState + sceneContentAgainstGraphs + bezier-3d; both typecheck/lint/build.
- **Not run:** browser smoke.

## Next steps, in order

1. `just build` (provenance must match HEAD), `just preview 4311`, then a `bezeg-smoke` Haiku worker with exact locators:
   - **A2:** on `/bezeg-2.0/bezier/curve` and `/bezeg-2.0/analysis/bisection`, click `SVG` and `PNG` (button names) and confirm downloads; open "Generiraj slike za prednastavitve" / "Generate preset figures" and run a batch; while an export runs, `#bezeg-language` is disabled with "Med izvozom slike jezika ni mogoče zamenjati." and re-enables after. Both languages. Failure text: "Izvoz slike ni uspel. Poskusi znova." (hard to force; record as gap if not reachable).
   - **A5:** on `/bezeg-2.0/ph/cubic` and `/bezeg-2.0/ph/quintic`: select the curve, `#hodograph-input-box` shows a board; drag a hodograph `w` point and confirm the main curve changes; deselect/reselect (hodograph hides/shows, one board); load a Preset; switch language; no console errors. Board locators: `window.JXG.boards`.
2. Accept A2 and A5: status lines in both task files and the backlog README; step 5 row in `platform.md` (`accepted`, commit hashes); do-log record (`.agents/skills/subagent-flow-evaluation/SKILL.md#do-log`) with the telemetry below.
3. Fetch, rebase onto `origin/master`, recheck (`just unit` on the touched paths), `git push origin HEAD:master`. If master CI is still red only for Routes/Coons, that is the maps stream's failure; note it.
4. Step 6: A3 one scene replacement path (after A2, A5, A8). Full browser checklist. Run **one** worker at a time (load note in `platform.md`).

## Delegation telemetry (this handler)

| Assignment | Dispatched | Tokens / tools / time | Outcome |
|---|---|---|---|
| A2 (Sonnet medium) | 14:19Z | ~66k / 40 / 43 min (20 min build memory wait) | done; handler repaired failure-kind routing; missed 2 constructor-less fixtures |
| A5 (Sonnet medium) | 14:19Z | ~114k / 101 / 90 min | done, no repair |
| A2 review (Sonnet) | ~15:45Z | ~28k / 7 / 0.7 min | no blocking finding |
| A5 review (Sonnet) | ~15:45Z | ~26k / 6 / 0.7 min | no blocking finding |

- **Memory:** `just unit`, `just build` waited 20 min at the memory gate several times; `just check` took 31 min. Claude Code killed the handler's context watcher and one `just build` for low memory; both were restarted once per the README.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`.
- Workers: `bezeg-worker` Sonnet `medium`, one at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Haiku with exact locators. Port 4311.
- Never force-push. Next backup branch name: `-12`.
