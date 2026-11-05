# Curves stream: handler handoff 46

Handler 46 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 45](handler-handoff-45.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with this note. Clean tree. No preview, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

- Hosted CI passed on `205524d`, which includes the alt fix.
- CG-B2-2a: `curve-comb` and `curve-evolute` graphs built, unregistered. [Evidence and decisions](../../curve-geometry/cg-b2-2a-graphs.md). Mathematics and engineering reviews done, findings settled there.
- Spec L4 step 4 corrected: the parabola's evolute has a cusp at \((0,\tfrac12)\), not "cusp-free".

## Next steps, in order

1. `just ci` on the pushed head.
2. CG-B2-2b: register both Demonstrations (route, catalog, factories, `lesson: false`) and remove `curve-comb` and `curve-evolute` from `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`. Browser-check both routes: nobody has seen these graphs yet. Look at gain on all four curves, the kind selector, the readout and the evolute view. Comb is off by default, so the poster recipe must switch it on.
3. CG-B2-3…6: L3 and L4 lessons, chapter sections, media, gate. UI and accessibility review is due with the first routed slice. The gate re-measures the shipped comb, including a C1 or G1 spline: ADR 0041 promises this.
4. After family 1: family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
5. Low priority, unchanged from handoff 45: chapter cards for families 2, 3 and 4 (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template), P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

## For the L3 and L4 text

- G1 default joins jump by −0.0427 and −0.2625. The first is too small to see at the default gain, so point at the second join or move \(b\) first. C1 default joins: −0.667, −0.194, −0.375.
- L3 acceptance (4): "C2 implies G2" must be labelled for regular curves only.
- L4 step 4 now teaches the cusp at the vertex. The cycloid evolute still needs a numerical test before any mention.

## Open for the owner

Unchanged from handoff 45; neither blocks the next steps.

- **Example card images are Slovenian-only** in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`). Per-language capture would double those assets.
- **No performance budget for weak devices.** ADR 0041 borrows ADR 0037's desktop budget. At CPU ÷4 any comb lifts the cubic's frame p95 from 16.8 to about 33 ms.

## Risks and notes

- Known limits of the graphs are in the [evidence](../../curve-geometry/cg-b2-2a-graphs.md#known-limits). The evolute's 256 samples per update were not measured; the spec's gate names only the comb, but a drag check on `curve-evolute` is cheap to add.
- `just build` fails with "Build inputs changed while building" if anyone writes during it. `just check` takes about 17 minutes with its output held back, so an empty log means nothing. `just unit` prints nothing on success.
- A compound command's exit code is its last command's. Mine reported 0 over two failing tests; read each step's own result.
- Carried over from handoffs 43 to 45: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, no real touch device for any measurement, the clipped-tooth marker unmeasured.

## Lessons for briefs

- Run the wide `src/graphs` suite before accepting a slice that adds a Preset collection: `PresetCatalog.test.tsx` fails for an unregistered collection, and a narrow run never sees it. Name `PENDING_ROUTE_KEYS` in the brief.
- Two workers in one tree worked, but the comb worker hit its budget at 47 turns with its hardest test unrun. A graph plus overlay plus real-board tests is two slices: code first, tests and mutations second.
- A reviewer reads the notes it finds. Delete or update a stale worker note before dispatching review, or it reports the old state.
- Multi-line replacements in these files need CRLF handling; a regex for "the imports" must allow multi-line imports.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-46.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
