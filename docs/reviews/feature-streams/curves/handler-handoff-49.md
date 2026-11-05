# Curves stream: handler handoff 49

Handler 49 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired at turn 21: the opening reads were large. It replaces [handoff 48](handler-handoff-48.md).

## State

- `origin/master` has this note. The L4 draft is **not** on `master`: it is one commit, `wip: L4 evolute lesson draft (CG-B2-4)`, directly after this note on local `worktree-stream-curves` and on `origin/curves-l4-draft`. The remote `worktree-stream-curves` has diverged at `5ad7c45`; leave it.
- Tests fail on the draft until step 1 below is done. Do not push the draft to `master` alone. When the tests are ready, `git reset --soft HEAD~1` and commit draft and tests together; the draft branch can then stay behind, and nothing needs a force-push.
- No preview, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

- Hosted CI passed on `9afe7c3` (includes L3).
- Browser walk of L3: all six checks passed, with the layout findings [recorded in the evidence](../../curve-geometry/cg-b2-3-lesson.md#browser-walk-handler-49). The gaps carried from handoff 47 are closed: Reset on `curve-comb` and `curve-evolute`, the evolute at 390 px, and the 3 curves at step 2.
- L4 draft written by the handler: `evoluteLesson`, the chapter section `curve-evolute`, ownership, registry, preview copy, `lesson: false` removed. `just typecheck` passed on it. `lessonMathNotation.test.ts`: both prose checks pass, and `scans every lesson module` fails only because its list lacks `curve-evolute`. No other test was run, no browser check.

## L4 scenes (the draft's contract)

All on the parabola \(y=x^2\), \(x=2t-1\), control points \((-1,1),(0,-1),(1,1)\), view `EVOLUTE_PARABOLA_VIEW` `[-5.2, 5, 5.2, -1.2]`, except step 5. The circle is on in every scene. The frame is off except in step 6, as its labels fall on E at the cusp.

| Step | t | Trace | Normal | Values the text quotes |
| --- | --- | --- | --- | --- |
| evolute-predict | 0.75 | hidden | off | \(E=(-\tfrac12,\tfrac54)\); observation: \(E\) at \(t=0, 0.5, 1\) is \((4,\tfrac72), (0,\tfrac12), (-4,\tfrac72)\) |
| evolute-trace | 0.75 | to-parameter | off | starts at \((4,\tfrac72)\), reaches \(E\) above |
| evolute-normals | 0.75 | full | on | worked example \(\kappa=1/\sqrt2\), \(R=\sqrt2\); \(t=0.25\): \(E=(\tfrac12,\tfrac54)\) |
| evolute-cusp | 0.5 | full | on | \(\kappa=2\), \(R=\tfrac12\), \(E=(0,\tfrac12)\) |
| evolute-cubic | 0.19, `CURVATURE_S_CUBIC`, `sCubicView` | full | on | vertices \(t\approx0.1907, 0.8093\), \(|\kappa|\approx2.395\), cusps \((0.6332, 0.1598)\), \((2.3668, -0.1598)\); at \(t=0.19\): \(\kappa=-2.3952\), \(R=0.4175\), \(E\) rounds to the first cusp; at \(t=0.5\): \(\kappa=0\), `evolute_status_none` |
| evolute-explore | 0.75 | full | on, frame on | the route's defaults |

The S-cubic values were computed with a separate `node` script from \(x=3t\), \(y=6t(1-t)(1-2t)\), not read from the graph. No mathematical review yet. The tangent formula is \(\mathrm{d}E/\mathrm{d}s=(1/\kappa)_s\,N\) with \(N_s=-\kappa T\). `teme` (vertex) is new in this chapter; `ost`, `evoluta` come from the spec's term table.

## Next steps, in order

1. **CG-B2-4 tests, one Sonnet worker.** First read the file list of commit `52f1094b`, the L3 template.
   - Registration: `lessonMathNotation.test.ts` list; `authoredChapterCoverage.test.ts` 127 to 128; `guidedExamplePreviewCopy.test.ts` 111 to 112 and 118 to 119; `familyChapters.test.ts` `CHAPTER_LINK_PENDING`; `lessonCatalog.test.ts` opt-out list; `curveGeometryChapter.test.ts` `IDS`, the "three" titles, the expected `demonstrationIds`, the terms, and `evolut`/`evolute` out of the unreleased lists; `guidedExamplePreviews.test.ts` `pending` gains `curve-geometry.curve-evolute.curve-evolute`; a smoke row in `tests/guided-lessons.smoke.spec.cjs` with `LESSONS` (6 steps, `minFrames: 13`). Recount after any rebase.
   - Real-graph tests in `curveGeometryGuidedLessons.test.ts`, one per [L4 acceptance](../../../specs/curve-geometry-lessons.md) item: every scene's t, trace mode, normal, frame, circle and view (compare with `fitBoundingBox`); closed form on the parabola to 1e-9 at several t; the normal line passes through E(t) and is parallel to a finite difference of the trace; at \(t=0.5\) on the S-cubic the readout says none, E is invisible and the trace has a NaN break with no segment across; the two vertices and cusps numerically; every quoted value in both languages; one synchronous multi-action sequence; cycling scenes keeps the board count without tick labels. Report a mutation for each new assertion.
   - Focused set: those files plus `lessonSmokeCoverage`, then `just check` by the handler.
2. Review: mathematical review of the kernel use and quoted values (the text itself stays [one-shot](../../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); screenshots of each L4 step, since a passing test does not show whether E, the circle and the readout are legible under the lesson panel. Then commit, push, `just smoke-lesson curve-evolute`.
3. CG-B2-5: as in handoff 48. Capture `curve-geometry.curve-comb.curve-comb` and the evolute card and remove their `pending` entries. Use the C1 kind for the `curve-comb` poster: add `field('Krivulja', ..., 'select')` before the toggle and check the window. The `curve-evolute` recipe uses the opening scene, which now has the trace hidden: pick a later frame for the card if it looks empty.
4. CG-B2-6 gate. UI and accessibility review is due; give it the [walk's findings](../../curve-geometry/cg-b2-3-lesson.md#browser-walk-handler-49). The gate re-measures the shipped comb, including a C1 or G1 spline (ADR 0041), plus a cheap drag check on `curve-evolute`.
5. After family 1: family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
6. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

The delegation evaluation records for handlers 48 and 49 were not written. Handler 48's inputs are in handoff 48. Handler 49's: one Sonnet smoke worker, 40 tool calls, 60k tokens, 12.6 minutes, all six checks reported with evidence.

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. At CPU ÷4 any comb lifts the cubic's frame p95 from 16.8 to about 33 ms.

## Risks and notes

- **`just` under this session's tools.** PATH is about 8,000 characters and npm's additions pass cmd's limit, so `vite` and `vitest` "are not recognized" in both PowerShell and Bash. Dedupe first. PowerShell: `$env:PATH = (($env:PATH -split ';' | Where-Object {$_} | Select-Object -Unique) -join ';')`. Bash: `export PATH="$(printf %s "$PATH" | tr ':' '\n' | awk '!s[$0]++' | paste -sd:)"`. Both were observed working here. Give workers the Bash line; it replaces handoff 48's "run `just` from PowerShell".
- A large heredoc in the Bash tool failed with "unexpected EOF"; use the Write tool for long content. `sed -i` here strips CRLF from the working copy; `core.autocrlf` is true, so check with Python byte counts, as `grep -c $'\r'` gave 0 on a CRLF file.
- Keep opening reads small: this handler reached 175k in 21 turns, mostly from whole-file output of `docs/agent-workflow.md`, `docs/commands.md` and the lesson file.
- The lesson panel overlaps the board in every lesson; see the walk. It can be moved or hidden, and a scene `view` is the only lever from `src/learning`.
- Until CG-B2-5 the comb's and evolute's chapter cards have no image; `ChapterExploration.tsx:32-33` renders them without a figure.
- **`python` does nothing under the PowerShell tool here.** Run Python from the Bash tool, and confirm an edit landed.
- `just check` logs are UTF-16: read them with `Get-Content -Encoding Unicode`. A failing `just check` leaves a following `smoke-lesson` with "Build inputs changed", which says nothing about the lesson. `just build` fails the same way if anyone writes during it. `just check` took 16 minutes.
- A compound command's exit code is its last command's, and a background task's reported code is too. Read each step's own result.
- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits).
- Carried over from handoffs 43 to 45: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- A slice that removes `lesson: false` also needs the registration list in step 1. When two streams add a lesson, identical count bumps merge silently and stay one short.
- A scene needs a `view`, and a screenshot of one step shows what a passing test does not.
- `applyLessonView` passes the view through `fitBoundingBox`, which adds margins. Tick labels are a pool sized by the widest view, so count board objects without them.
- A reviewer's finding still needs checking, and a reviewer reads the notes it finds: delete or update a stale worker note before dispatching review.
- Multi-line replacements in these files need CRLF handling.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-49.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
