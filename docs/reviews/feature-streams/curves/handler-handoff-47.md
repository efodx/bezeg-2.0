# Curves stream: handler handoff 47

Handler 47 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 46](handler-handoff-46.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with this note. Clean tree. No preview, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

- Hosted CI passed on `6049cb0`.
- CG-B2-2b: `curve-comb` and `curve-evolute` registered (`b38b4a93`, `lesson: false`, in `POSTER_PENDING` and `CHAPTER_LINK_PENDING`). [Evidence and decisions](../../curve-geometry/cg-b2-2b-registration.md).
- Registration exposed a real defect: the evolute opened with no trace and no E readout. Fixed in `545c1310` with a first-paint test.
- The evolute now opens at \(t=0.75\) with a wider view. Both graphs were looked at in a browser for the first time.
- `just check` passed on `b38b4a93`, clean tree. Hosted CI for this push is not yet seen.

## Next steps, in order

1. `just ci` on the pushed head.
2. CG-B2-3: L3 lesson. Add it to `curveGeometryGuidedLessons.ts`, following L2's `curvatureScene` and its test file; remove `lesson: false` from `curve-comb` and take the id out of the opt-out list in `lessonCatalog.test.ts`. The lesson owner table is `guidedLessonOwnership.ts`, and the section table is `curveGeometryChapterRegistry.ts`. So a lesson needs a chapter section in the same slice or just after it (`CHAPTER_LINK_PENDING` in `familyChapters.test.ts`). Lesson actions: `curve-visibility` target `curvature-comb`, `comb-curve`, `comb-gain`, `comb-count`.
3. CG-B2-4: L4 lesson, same shape. Actions: `parameter` `t`, `evolute-trace`, `curve-visibility` target `evolute-normal`. Step 4 must set \(t=0.5\) itself; the route now opens at 0.75.
4. CG-B2-5: posters. The `curve-comb` recipe shows the cubic with the comb on, whose teeth are short and dense. The C1 kind shows the jump far better: add `field('Krivulja', ..., 'select')` before the toggle and check the window. The `curve-evolute` recipe uses the opening scene. Remember `bezier-hulls` is pending too; coordinate with Geometry.
5. CG-B2-6: gate. UI and accessibility review is due with the first routed slice. The gate re-measures the shipped comb, including a C1 or G1 spline: ADR 0041 promises this. Add a cheap drag check on `curve-evolute`.
6. After family 1: family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
7. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

## For the L3 and L4 text

- G1 default joins jump by −0.0427 and −0.2625. The first is too small to see at the default gain, so point at the second join or move \(b\) first. The readout shows the largest join: "Stik 2". C1 default joins: −0.667, −0.194, −0.375. The readout shows "Stik 1", the largest, and the jump is plain at gain 1.4 at \((1,3)\) and near \((-1,0)\): check which join is which against the board.
- L3 acceptance (4): "C2 implies G2" must be labelled for regular curves only.
- L4 step 4 teaches the cusp at the vertex. The cycloid evolute still needs a numerical test before any mention.
- Evolute values on the parabola, read in the browser: \(t=0.25\) and \(0.75\) give \(E=(\pm\tfrac12,\tfrac54)\), \(t=0.5\) gives \((0,\tfrac12)\), and \(x=1\) gives \((-4,\tfrac72)\).

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. At CPU ÷4 any comb lifts the cubic's frame p95 from 16.8 to about 33 ms.

## Risks and notes

- Not covered in the browser: Reset on either route, the comb card's click, the 390 px view after the evolute's view change. See [not covered](../../curve-geometry/cg-b2-2b-registration.md#not-covered). Route the next smoke over them.
- The worker's smoke predates the evolute's new default; the handler rechecked only both opening scenes.
- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits).
- `just build` fails with "Build inputs changed while building" if anyone writes during it. `just check` took 21 minutes with its output held back, so an empty log means nothing. `just unit` with path filters can still take 11 minutes when `src/graphs/base` is included.
- `npx tsc` is not on the path in this shell; use `just typecheck`. The bash heredoc rejected a long Python script with apostrophes: write scripts with the Write tool.
- A compound command's exit code is its last command's, and a background task's reported code is too. Read each step's own result.
- Carried over from handoffs 43 to 45: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- Registration is itself a test: the shared Preset contracts in `GraphTransientState` and `PresetCatalog` run only for registered ids. Expect them to find first-paint and reset differences, and run them before the browser check.
- Assert computed visibility and readout text at first paint, not just data arrays; `dataX` was full while nothing was drawn.
- Run the wide `src/graphs` suite before accepting a slice that adds a Preset collection. Name `PENDING_ROUTE_KEYS` in the brief.
- A graph plus overlay plus real-board tests is two slices: code first, tests and mutations second.
- A reviewer reads the notes it finds. Delete or update a stale worker note before dispatching review.
- Multi-line replacements in these files need CRLF handling; a regex for "the imports" must allow multi-line imports.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-47.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
