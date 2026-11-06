# Curves stream: handler handoff 73

Handler 73 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired during the playback migration. It replaces [handoff 72](handler-handoff-72.md).

## State

- **On `origin/master`:** everything through this note. All five families stay complete. Only the low-priority list and the owner items remain.
- The worktree is clean. `origin/curves-ab-b-3-wip` is obsolete; `origin/curves-lessons-d1-d3` is a safety copy. The remote `worktree-stream-curves` is stale; never force-push it. Delete nothing.
- No preview or worker of this handler should be running. Port 4387 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 12.9 GB free at this note; check it first.
- `gh` is not installed. Read hosted CI through `curl` as [handoff 63](handler-handoff-63.md#state) says, with a `User-Agent` header. The API returned 504 for several minutes at this session's start, then recovered; retry before suspecting anything local. FFmpeg as in [handoff 58](handler-handoff-58.md#state). Python `urllib` fails on certificates here.
- A bash heredoc holding a long multi-language file failed to parse here. Write such files with the Write tool.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `07c59973` | **Capture:** the label checks in `presentBoard` see `smartlabel`s, so the weight overlap rule can fire. It never had: the manifest records no `weight-label-overlap` | `just tooling-test`; all five weight recipes have windows, so no frame moves; the four unchecked posters viewed, no overlap or clipping |
| `312f3a0a` | **P5 caption:** a point in the top-left corner raises the top of the view. Only `parabola` changes (top 10 to 11.5), not every example as handoff 72 expected | 2 tests failed first; measured at 1440, 1280, 1024 and 390 on the route and in step 4; the point sits 10 to 32 px below the caption |
| `68f3eca6`, `7cb7f994` | **Playback reasons:** [spec](../../../specs/playback-button-reasons.md), shared `PlaybackButtons`, all 18 control files | See below |
| `1da0fc5e` | **Patch point editor:** four decimals after a drag; Apply keeps the exact value of an axis left as shown | Test failed first; 10 existing assertions pinned the raw display and now expect the rounded one, while exact net and Preset equality stay asserted |
| `fa5ff3c2` | **D2 steps 5 and 6** prompts name *Opazuj na grafu* first | Smoke row `bezier-clipping` |

**Playback.** A Sonnet worker migrated 16 files; the handler did `CltGraph` and `FortuneControls`, whose extra `reset-view` button uses a `children` slot. In a browser on `/compgeo/fortune`, pressing a blocked Reset kept focus and showed the reason, and it cleared after Next. The other routes were checked by unit tests and smoke rows only. `src/graphs/functions/playbackElementTree.ts` is a test helper that mirrors the component's gating, so four graph tests can read element trees. That "not traced" means step 0 and not playing is argued from code, not tested, in `EarClippingControls.tsx:56`, `MonotonePartitionControls.tsx:90` and `MonotoneTriangulationControls.tsx:72`.

**Closed with no change:** closing a lesson keeps `learnChapter` and `learnSection` on purpose. `tests/demonstrations.smoke.spec.cjs:265` asserts it and `guidedLessonOwnership.ts:200` reads them. The degree-4 refusal's wording is accurate.

**Behaviour change.** Unavailable playback buttons gain a title, a description and a status line once pressed. The `parabola` view is taller. Patch fields show rounded values. No route or stored format changed. The next preview capture needs `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, because `presentBoard` changed.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| Hosted CI and deploy | `154743b2` (handoff 72's push) | Success, all jobs. Handoff 72's work is deployed |
| `tsc`, lint on the changed playback files | `7cb7f994` content | Exit 0 |
| `vitest` on controls, compgeo, patches, bspline, subdivision, functions, localization, lesson notation | `7cb7f994` content | Exit 0: 3 792 passed, 4 skipped |
| `BEZEG_TRANSIENT_STATE=all` on `src/graphs/base/GraphTransientState` | `7cb7f994` content | Exit 0: 952 passed, none skipped |
| `just build`; `just smoke-lesson prob-clt bisection fortune prob-correlation bezier-clipping` | `7cb7f994` content | Exit 0 |
| Full `just check`, full smoke | None | **Not run** |
| Hosted CI | This push | **Not yet read** |

## Next steps, in order

1. **Read hosted CI** for this push. A failure comes first. A green run deploys this session's work.
2. The remaining low-priority list:
   - Pointer drag stops at the board edge. May be acceptable; decide before building anything.
   - D1's and D2's curves are small at 390 px, as a lesson view has one box for all viewports; step 5, frame 1 at 1280×720 is hidden until the panel moves.
   - [AB-C-6](../../advanced-bezier/ab-c-6-gate.md#carried-polish): unlinked, a press at a shared corner takes the topmost end point; step 6 does not mention that the interior net changes with the corner. AB-B-6: Play at step 6 takes about 54 s.
   - Tiny: at 200% text a closed native select truncates long values (34 options), and the `probability/summary` legend passes the panel by 1 px at 1440.
   - Tiny: on the `prob-correlation` poster the label's last letter sits about 5 px from the x = 3 residual.
3. When only owner decisions remain, do not launch a successor. End with the open items below.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

## Risks and notes

Handoffs 61 to 72's "Risks and notes" still apply, and those they inherit.

- **Tests run while a worker edits the same tree fail at load.** This session's `Transform failed` errors came from the worker's half-edited file. Read the error before suspecting your own change.
- **A smoke script that waits a fixed time can miss the inspector.** At 1.2 s two routes showed no buttons; waiting on the locator found them.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-73.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
