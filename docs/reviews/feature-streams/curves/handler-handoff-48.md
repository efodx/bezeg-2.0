# Curves stream: handler handoff 48

Handler 48 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 47](handler-handoff-47.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with this note. Clean tree. No preview, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

- Hosted CI passed on `77d6d5f`.
- CG-B2-3: the L3 lesson, chapter section, ownership and smoke row for `curve-comb` (`52f1094b`). `lesson: false` is gone. [Evidence and decisions](../../curve-geometry/cg-b2-3-lesson.md).
- Before the rebase, `just check` passed on the same change. After the rebase onto Geometry's `bezier-hulls` lesson, on `52f1094b` with a clean tree: typecheck, `just unit src/learning src/demonstration`, the build, and `just smoke-lesson curve-comb bezier-hulls` all passed. The full suite was not rerun after the rebase; `src/graphs` was not rerun there. Hosted CI for this push is not yet seen.
- Review: engineering review found nothing blocking. Mathematics was checked by the handler, not by a reviewer: the L3 cubic is the parabola \(y=x^2/3\), so \(\kappa\) falls monotonically to \(t=1\).

## Next steps, in order

1. `just ci` on the pushed head.
2. Browser walk of L3 with `bezeg-smoke` (Sonnet): every step at 1920 by 1080 and 1280 by 720, the observation frames' controls, the comb card's click in the chapter, and the gaps carried from handoff 47: Reset on `curve-comb` and `curve-evolute`, the 390 px view after the evolute's view change. Have it name the 3 curves the smoke row counts at step 2; see [not covered](../../curve-geometry/cg-b2-3-lesson.md#not-covered).
3. CG-B2-4: L4 lesson, same shape as L3, with a chapter section. Actions: `parameter` `t`, `evolute-trace`, `curve-visibility` target `evolute-normal`. Step 4 must set \(t=0.5\) itself; the route opens at 0.75. Give every scene a `view`.
4. CG-B2-5: posters and cards. Capture the chapter card `curve-geometry.curve-comb.curve-comb` and remove its `pending` entry in `guidedExamplePreviews.test.ts`; add the evolute card too. The `curve-comb` poster recipe shows the cubic with the comb on, whose teeth are short and dense. The C1 kind shows the jump far better: add `field('Krivulja', ..., 'select')` before the toggle and check the window. The `curve-evolute` recipe uses the opening scene. `bezier-hulls` is no longer pending: Geometry captured it.
5. CG-B2-6: gate. UI and accessibility review is due with the first routed slice, which L3 now is. The gate re-measures the shipped comb, including a C1 or G1 spline: ADR 0041 promises this. Add a cheap drag check on `curve-evolute`.
6. After family 1: family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
7. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

The delegation evaluation record for this session was not written. Its inputs: two workers on L3, the first stopped at 135k after 65 turns with no tests landed, the second finished in 20 tool calls from the first's note; one Sonnet review.

## For the L4 text

- L4 step 4 teaches the cusp at the vertex. The cycloid evolute still needs a numerical test before any mention.
- Evolute values on the parabola, read in the browser: \(t=0.25\) and \(0.75\) give \(E=(\pm\tfrac12,\tfrac54)\), \(t=0.5\) gives \((0,\tfrac12)\), and \(x=1\) gives \((-4,\tfrac72)\).
- Do not name the evolute in the chapter's earlier sections; `curveGeometryChapter.test.ts` lists unreleased words, so update that list when L4 ships.

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. At CPU ÷4 any comb lifts the cubic's frame p95 from 16.8 to about 33 ms.

## Risks and notes

- The lesson panel overlaps the board centre at 1280 by 720 in every lesson; nothing in `src/learning` keeps it off the curve, so a scene `view` is the only lever. It can be moved or hidden.
- Until CG-B2-5 the comb's chapter card has no image; `ChapterExploration.tsx:32-33` renders it without a figure.
- **`python` does nothing under the PowerShell tool here**: no output, a blank `$LASTEXITCODE`, and later commands carry on. A test run then passes against unedited code, and a mutant "passes". Run Python from the Bash tool, and confirm an edit landed with a `grep -c`.
- `just unit` fails in the Bash tool with "'vitest' is not recognized" (PATH near the cmd limit); run `just` from PowerShell.
- `just check` logs are UTF-16: read them with `Get-Content -Encoding Unicode`. A failing `just check` leaves a following `smoke-lesson` with "Build inputs changed", which says nothing about the lesson.
- `just build` fails with "Build inputs changed while building" if anyone writes during it. `just check` took 16 minutes.
- A compound command's exit code is its last command's, and a background task's reported code is too. Read each step's own result.
- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits).
- Carried over from handoffs 43 to 45: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- A slice that removes `lesson: false` also needs: a smoke row in `tests/guided-lessons.smoke.spec.cjs` with `LESSONS`, the counts in `guidedExamplePreviewCopy.test.ts` and `authoredChapterCoverage.test.ts`, and the list in `lessonMathNotation.test.ts`. Put `lessonSmokeCoverage` and `guidedExamplePreviewCopy` in the focused set; ours missed them and only `just check` found them.
- When two streams add a lesson, identical count bumps merge silently and stay one short: recount after a rebase.
- Write a lesson's text, scene and tests as two slices, as for graphs: the first worker spent its budget on probes and text and landed no tests.
- A scene needs a `view`, and a screenshot of one step shows what a passing test does not.
- `applyLessonView` passes the view through `fitBoundingBox`, which adds margins: compare with that, not the authored box. Tick labels are a pool sized by the widest view, so count board objects without them.
- A reviewer's finding still needs checking: the claim that `pending` could stay after capture was wrong.
- A reviewer reads the notes it finds. Delete or update a stale worker note before dispatching review.
- Multi-line replacements in these files need CRLF handling.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-48.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
