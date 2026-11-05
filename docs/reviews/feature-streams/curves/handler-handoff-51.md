# Curves stream: handler handoff 51

Handler 51 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired at 180k. It replaces [handoff 50](handler-handoff-50.md).

## State

- `origin/master` has this note. Local `worktree-stream-curves` matches it. The remote `worktree-stream-curves` and `curves-l4-draft` are stale; leave them.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory was short at the end of this session:** Claude Code stopped three idle background commands (a CI wait and two watchers), and 2.8 GB of 64 GB was free. Check free memory before `just check` or parallel workers, and do not restart a command stopped this way without need.

## Done this session

| Commit | Work | Checks |
| --- | --- | --- |
| `81853f11` | CG-B2-6 test gaps: spline default presets pinned, real lesson exits for comb and evolute | In the check below; mutations in the [gate record](../../curve-geometry/cg-b2-6-gate.md) |
| `1530b1d5` | CG-B2-6 live region for curvature, evolute and comb | `just check` exit 0, 11501 passed; `smoke-lesson` 8 of 8; keyboard pass in Chromium; hosted CI passed |
| `e0b14d8f` | CG-B3-2a kernel: tangential cusps in `cuspParameters`, `src/graphs/curves/offset/curveOffset.ts` | Vitest on `src/graphs/curves` and `src/bezeg/impl/curve`, 1208 passed; tsc; ESLint. **No mathematical review yet, no `just check`** |
| this note's commit | Gate record, statuses, delegation record | Docs |

**CG-B2-6 is done and Batch 2 is released.** The first `just check` failed 10 tests, which focused checks had missed; the record explains both causes.

Hosted CI for `e0b14d8f` and this note was not read before the handoff: check it with `just ci`.

## Decision: Batch 3 before family 5

Handoff 49 listed family 5 next without Batch 3. Batch 3 goes first: the stream's features run in order, CG-B3 depends only on Batch 2 shipping, and it closes family 1 before family 5 opens. Recorded in `curves.md`.

## Next steps, in order

1. **Mathematical review of `e0b14d8f`,** one `bezeg-reviewer` Sonnet. Owed by the routing for mathematics. Ask it to check `TANGENT_CUSP_TOLERANCE` (1e-9 scaled by \(1+|d\kappa|\)), the golden-section branch in `cuspParameters`, the case where a refined minimum crosses zero and two close roots are bisected, and `CUSP_MERGE_FRACTION`. The sign is pinned by the `phOffsetRational` cross-check, not by the distance test, which is sign-blind.
2. **CG-B3-2a graph, `curve-offset`.** Handler's design, not yet settled in code, so test it against the spec's [L5 contract](../../../specs/curve-geometry-lessons.md#l5-offset-curves-vzporedne-krivulje):
   - Follow `curve-comb` for a kind switch between a Bézier curve and a PH curve, and `EvoluteOverlay` for an owned overlay. New `src/graphs/curves/offset/OffsetOverlay.ts` and `CurveOffsetGraph.tsx`.
   - Controls: \(d\), sample count, offset and cusp switches. Lesson actions, and a Preset collection with a `graphState` rule like the comb and evolute.
   - The sampled offset is labelled approximate and the PH offset exact (acceptance 3). The existing PH curve multiplies its distance: `ph-bezier-curve.ts:131` passes `(len + 1) * this.d` to `phOffsetRational`. Check this before comparing the two at one \(d\).
   - The \(1+d\kappa\) graph of step 5: an inspector SVG like `src/graphs/curves/interpolation/BasisPlot.tsx`, or the PH auxiliary board (`AuxiliaryBoardLifetime.ts`). Choose by measurement of the drag. `speedFactorSamples` feeds it.
   - Readouts need the live region: `LiveReadout.tsx`, with `liveReadout.replace` in `syncReplacedScene`.
   - Name `GraphTransientState` and `lessonRestoration` in the worker's checks: the shared contract suites are what focused checks missed this session. The graph must also join `graphTransientStateContract` where the other graphs do.
3. Then CG-B3-2b to 6 as in `docs/tasks/curve-geometry/README.md`. Decide optional L6 `curve-envelope` when L5 ships; the spec lets it drop.
4. Family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
5. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

**Polish carried from handoff 50, not gate items.** Step 5, frame 1 at 1280 by 720 is hidden until the panel moves. The evolute colour `#6175ad` is 4.51:1. The comb card is plain, and the evolute poster's labels E, N, T crowd near the point; turning the frame off in its recipe would fix that with a selective recapture.

Delegation records through this session are in `docs/agent-workflow/evaluation-log.md`.

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. The ÷4 figures are in the [measurement](../../curve-geometry/cg-b2-6-measurement.md).

## Risks and notes

- **`just` under this session's tools.** PATH is too long for cmd. Bash: `export PATH="$(printf %s "$PATH" | tr ':' '\n' | awk '!s[$0]++' | paste -sd:)"`. Give workers that line. `npx tsc` can fail the same way: `node node_modules/typescript/bin/tsc --noEmit --pretty false` works, as does `node node_modules/vitest/vitest.mjs --run <files>`.
- **Run `just check` from Bash into a log and read its `EXIT=`.** A background task's code is its last command's: this session a failed check reported 0. The compact log has no test totals: they are in the `.command-logs` file it names.
- **After new images, clear Vitest's cache** (`npx vitest --clearCache`) before `just check`. Worktrees sharing `node_modules` share it.
- A build here takes under 10 s when the tree barely changed. A `smoke-lesson` of 5 s is real: read the log's test lines.
- **A joint capture is needed whenever two streams have pending posters.** The capture is not `POSTER_PENDING`-aware and needs a recipe for every shipped id. `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` asserts no shared change: confirm the recipe diff by hand.
- A large heredoc in the Bash tool can fail; use Write for long content. `sed -i` strips CRLF; `core.autocrlf` is true, so edit through Python bytes or the Edit tool, and confirm the edit landed.
- Keep opening reads small. Do not read the manifest, `docs/agent-workflow.md`, `docs/commands.md` or the lesson file whole. `curves.md`'s Notes lines are long: cut them.
- The lesson panel overlaps the board in every lesson. It can be moved or hidden, and a scene `view` is the only lever from `src/learning`.
- **`python` does nothing under the PowerShell tool here.** Run it from the Bash tool.
- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits). The live region's are in the [gate record](../../curve-geometry/cg-b2-6-gate.md).
- Carried over from handoffs 43 to 45: `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- A worker's focused checks prove only the files they name. Anything new and always rendered in the inspector meets the shared contract suites: name them in the brief.
- Read which side of a diff is stale before patching. The contract failures looked like a stale restore, but the region was right and the capture was early.
- A test whose input does not change the output proves nothing: the comb's gain burst left the join text unchanged, so the β slider drives it now.
- Tests as their own slice worked again: 22 tool calls, first pass accepted.
- Screenshots earn their cost, and a reviewer's finding still needs checking. Delete or update a stale worker note before dispatching review.
- `applyLessonView` passes the view through `fitBoundingBox`, which adds margins. Tick labels are a pool sized by the widest view, so count board objects without them.
- A slice that removes `lesson: false` also needs the registration list in handoff 49. Rebasing over another stream's list change conflicts in `familyChapters.test.ts` and `lessonCatalog.test.ts`: keep the other stream's id.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-51.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
