# Curves stream: handler handoff 50

Handler 50 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired during the CG-B2-6 reviews. It replaces [handoff 49](handler-handoff-49.md).

## State

- `origin/master` has this note. Local `worktree-stream-curves` matches it. The remote `worktree-stream-curves` and `curves-l4-draft` are stale; leave them.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

| Commit | Work | Checks |
| --- | --- | --- |
| `3a5ea510` | CG-B2-4 L4 lesson, tests, step 5 view `EVOLUTE_S_CUBIC_VIEW` | `just check` 1036 s before the view fix; 1945 tests after the rebase; `smoke-lesson`; hosted CI passed. [Evidence](../../curve-geometry/cg-b2-4-lesson.md) |
| `3335bd59`, `90b048d3` | CG-B2-5 cards and joint posters with `epicycles`; `POSTER_PENDING` empty | See below; `smoke-lesson` for all four lessons, 8 of 8. [Evidence](../../curve-geometry/cg-b2-5-media.md) |
| this note's commit | CG-B2-6 [measurement](../../curve-geometry/cg-b2-6-measurement.md), [criterion audit](../../curve-geometry/cg-b2-6-criterion-audit.md), `scripts/comb-gate-perf.cjs` | Script lint passed; docs otherwise |

`just check` on `90b048d3` exited 1 on two card tests only, with 10687 passing. The cause was the stale `import.meta.glob` cache of [the command guide](../../../commands.md): the same tests failed with the cache and passed once it was cleared. The check was not repeated, so a full green `just check` is still owed on this code. Hosted CI for `90b048d3` was queued when this note was written: check it with `just ci`.

## CG-B2-6 gate: open

Measured: every case meets the desktop budget, frame p95 at most 16.8 ms, no frame over 25 ms. Nothing is reported to the owner as a miss. At CPU ÷4 the C1 comb and the evolute drag reach p95 50 ms, the cubic comb 33.3 ms. The cubic's frames over 25 ms at ÷4 were a median of 68 against 29 in CG-B2-1, varying from 59 to 118 between runs: not established as a regression.

The gate still needs these, in order:

1. **Live region for the readout, fix before gate.** Handler checked this finding. The readout of \(\kappa\), \(R\) and \(E\) exists only as JSXGraph board text (`CurvatureOverlay.ts:144-151`, `EvoluteOverlay.ts:123-131`), so a screen-reader user who moves the t slider hears none of it. Compgeo controls already have the pattern: `<p className="visually-hidden" role="status" aria-live="polite" data-…-live="">` (`BezierHullsControls.tsx:65`, and `FortuneControls.tsx:212` with its `heard` state). Add one to `curve-evolute`, and to `curve-curvature` if it shares the overlay, not updating on every drag frame. Test it through the real graph, in both languages, including the "no evolute point" status. The comb's join readout may need the same: check.
2. **Three test gaps from the audit, one Sonnet worker.**
   - Pin the exported `c1/c2/g1SplineDefaultPreset()` to literal points and assert each route's initial state returns it. `splineContinuity.test.ts:11` keeps its own C2 copy; C1 and G1 have none. This closes two audit rows.
   - A real lesson-session exit test for `curve-comb` and one for `curve-evolute`, like `curveGeometryGuidedLessons.test.ts:247`: close the session and check the element count. This closes L3-A5 and L4-A4.
3. `just check`, then F6: `smoke-lesson` for the four lessons, hosted CI, mark CG-B2-6 done in `docs/tasks/curve-geometry/README.md`, and family 1's Batch 2 status in `curves.md`.

**Carried from the UI review, polish, not gate items.** Step 5, frame 1 at 1280 by 720 is hidden until the panel moves. The evolute colour `#6175ad` is 4.51:1. The reviewer did not open the poster and card images, and ran no keyboard or screen-reader session: the controls were read in code only, so the keyboard check of slider, toggle and select in a browser is still open and belongs with step 1. Also: the comb card is plain, as it is the opening scene with the comb hidden, and the evolute poster's labels E, N, T crowd near the point; turning the frame off in its recipe would fix that with a selective recapture.

## Next steps after the gate

1. Family 1 Batch 3 (L5 offset curves, optional L6) is after Batch 2 in the [spec](../../../specs/curve-geometry-lessons.md). Handoff 49 listed family 5, Batch A (D1, D3) next, without Batch 3. Decide from the spec and the task README which goes first, and record why.
2. Family 5, Batch A. Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
3. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

Delegation records through this session are in `docs/agent-workflow/evaluation-log.md`.

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. This session's ÷4 figures are above.

## Risks and notes

- **`just` under this session's tools.** PATH is too long for cmd. Bash: `export PATH="$(printf %s "$PATH" | tr ':' '\n' | awk '!s[$0]++' | paste -sd:)"`. Give workers that line.
- **Run `just check` from Bash into a log and read its `EXIT=`.** A background task's code is its last command's: this session a failed check reported 0.
- **After new images, clear Vitest's cache** (`npx vitest --clearCache`) before `just check`: the card tests fail on a stale glob otherwise. Worktrees sharing `node_modules` share it.
- A build here takes under 10 s when the tree barely changed. A `smoke-lesson` of 5 s is real: read the log's test lines.
- **A joint capture is needed whenever two streams have pending posters.** The capture is not `POSTER_PENDING`-aware and needs a recipe for every shipped id. `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` asserts no shared change: confirm the recipe diff by hand.
- A large heredoc in the Bash tool can fail; use Write for long content. `sed -i` strips CRLF; `core.autocrlf` is true, so check with Python byte counts. Multi-line replacements need CRLF handling.
- Keep opening reads small. Do not read the manifest, `docs/agent-workflow.md`, `docs/commands.md` or the lesson file whole.
- The lesson panel overlaps the board in every lesson. It can be moved or hidden, and a scene `view` is the only lever from `src/learning`.
- **`python` does nothing under the PowerShell tool here.** Run it from the Bash tool, and confirm an edit landed.
- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits).
- Carried over from handoffs 43 to 45: `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- Tests as their own slice worked: 36 tool calls against 65 turns with no tests when text, scene and tests were one slice.
- Screenshots earned their cost again: step 5 at 1280 by 720 passed every test with the curve under the panel. A scene `view` fixed it.
- A slice that removes `lesson: false` also needs the registration list in handoff 49. Rebasing over another stream's list change conflicts in `familyChapters.test.ts` and `lessonCatalog.test.ts`: keep the other stream's id.
- `applyLessonView` passes the view through `fitBoundingBox`, which adds margins. Tick labels are a pool sized by the widest view, so count board objects without them.
- A reviewer's finding still needs checking, and a reviewer reads the notes it finds: delete or update a stale worker note before dispatching review.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-50.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
