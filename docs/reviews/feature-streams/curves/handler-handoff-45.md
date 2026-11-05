# Curves stream: handler handoff 45

Handler 45 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 44](handler-handoff-44.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with this note. Clean tree. No preview, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `7625eb74` | Card `alt` text no longer exposes LaTeX, all chapters (`mathAltText`) | Resolver and converter mutations each failed the test; 20 cards in the rebuilt app, both languages, clean |
| `be1b4b98` | CG-B2-1: `scripts/comb-browser-perf.cjs`, [measurement](../../curve-geometry/cg-b2-1-comb-measurement.md), [ADR 0041](../../../adr/0041-curvature-comb-drawing.md) | 47 cases × 3 runs, then 7 cases × 7 at CPU ÷4 |
| `34b6173b` | CG-B1-6 closed, **Batch 1 released**, [browser pass](../../curve-geometry/cg-b1-6-criterion-audit.md) recorded | `just check` passed at `be1b4b98` (10 466 tests); the later commits are documents only |

Hosted CI passed on `64d27a5f` and `9f736678`. It was **not** read on `34b6173b`.

## Next steps, in order

1. `just ci` on the pushed head. The alt fix changes shared chapter code, so a red run comes first.
2. CG-B2-2a: `curve-comb` and `curve-evolute` graphs. Read [ADR 0041](../../../adr/0041-curvature-comb-drawing.md), then spec L3 and L4 and `sampleComb`, `combAtJoin`, `splineSpanSource`, `evolutePoint` in `src/bezeg/impl/curve/curvature.ts`. Template: `CurvatureOverlay.ts` and `CurvatureBezierCurveGraph.tsx` (owned overlay, lazy reads, recreated on scene import). `G-CURVE` is open. A spline's spans can be read from the graph directly; `comb-browser-perf.cjs:91` shows only what the board exposes.
3. CG-B2-2b…6: registration, L3 and L4 lessons, chapter sections, media, gate. The gate re-measures the shipped comb, including a C1 or G1 spline: ADR 0041 promises this.
4. After family 1: family 5, Batch A (D1, D3). Geometry's note on D2's `CurvePairGraph` is in `docs/tasks/feature-streams/geometry.md` (handler 52). Family 3's task rows read "planned" but are stale.
5. Low priority: families 2, 3 and 4 have no chapter cards (`b-splines`, `interpolation`, `probability`; the CG-B1-5 commit is the template). Also carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

## Open for the owner

Neither blocks the next steps.

- **Example card images are Slovenian-only**, in every chapter (`capture-guided-example-previews.cjs:578` pins `sl-SI`), so English readers see Slovenian readouts in images such as the L2 card. Per-language capture would double those assets. Recorded in the audit as a known limitation.
- **No performance budget for weak devices.** The plan has no numeric tolerance, so ADR 0041 borrows ADR 0037's desktop budget. At CPU ÷4 any comb lifts the cubic's frame p95 from 16.8 to about 33 ms.

## Risks and notes

- The spec's literal rule ("the largest count within tolerance") gives 256 on the desktop; the ADR explains choosing 64, which is also L3's stated default.
- The harness drags a de Boor point, not a join, because C2 joins are computed. The clipped-tooth marker was not drawn or measured.
- `just build` fails with "Build inputs changed while building" if anyone writes during it. `just check` takes about 17 minutes with its output held back, so an empty log means nothing.
- Carried over from handoffs 43 and 44: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, the blossom and NURBS items, and no real touch device for any measurement.

## Lessons for briefs

- A mutation that passes means a vacuous test or a mutation that never applied. Both happened here. Apply mutations with a helper that exits when the target text is absent; backslashes do not survive `sed` or shell arguments here.
- An exhaustive test must go through the production path. Mine called the converter directly and passed with the fix removed; also assert that the interesting input was reached.
- Three runs do not separate close cases at CPU ÷4. If a result is non-monotonic, rerun the deciding cases before choosing.
- These copy files build `alt` through `copy(...)`, so a search for `alt:` finds nothing. A zero from a scan needs its own check.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-45.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
