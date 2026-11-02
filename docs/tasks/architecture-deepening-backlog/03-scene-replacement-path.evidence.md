# 3. One scene replacement path: evidence

Source task: [03-scene-replacement-path.md](03-scene-replacement-path.md). Inventory: [a3-inventory.md](../../reviews/feature-streams/platform/a3-inventory.md). Recorded 2026-11-02 by platform handler 12 at `efae2fda` (branch rebased onto `origin/master` `03d079e3`).

## Commits

| Slice | Commit | Content |
|---|---|---|
| S1 | `dc071674` | Repeated-replacement contract test: five entries (remount, Preset reload, figure batch, lesson default scene, lesson checkpoint), three times each, on Bézier, derivative and PH cubic; reload ×3 on nine more families. The sweep reports what it removed |
| S2 | `f0bfebd9`, review repair `d1367a9a` | `src/graphs/base/SceneReplacement.ts`: `replaceScene(host, plan)` runs every entry's ordered steps. Curve figure loads dispose once instead of twice. Repair: a checkpoint without Preset data disposes nothing; disposing plans batch the board |
| S3a | `b7469beb` | Each family removes its own scene objects: projective `removeDrawn`, point-set pending and overlay objects, inscribed angle and notable points chip, function graphs own JSXGraph's hidden helper parent points |
| S3b | `6980e53e` | Hermite, interpolation and parametric tear down once per reload (was three `removeScene` calls); parametric rebuilds when the state names another curve; PH offset controls render only once a curve exists, so a used PH graph remounts |
| S4 | `37e10c41` | Sweep removed. JSXGraph infrastructure (default axes, ticks and labels, infobox, sketch curves) is read only in `src/graphs/base/BoardInfrastructure.ts`, by the contract test |

## Deliberate differences kept

Each difference is a field of the replacement plan, not a separate code path; the reasons are in the `SceneReplacement.ts` header and the inventory:

- **Figure path** (Preset reload, figure batch, entry restore) disposes and re-initializes, because it keeps the board and rebuilds the scene. It defers the state replacement so `onStateChange` diffs against the state before the load.
- **Lesson paths** (default scene, fixture scene, checkpoint) never re-initialize, because `initialize()` is not idempotent. They redraw synchronously, so a rollback inside one tick is drawn before the host commits (ADR 0015).
- **Mount** runs on a fresh board and disposes nothing, except curve families, whose importer replaces curves (`disposesBeforeNonFigureImport`).

## Sweep before and after

The sweep removed every board object outside a closure of JSXGraph internals. Its removals, measured by the S1 and S3a contract cases:

| Family | Before (objects swept) | After S3a |
|---|---|---|
| Point set (S1, reload) | 18 | 0 |
| Cross ratio | 43 (reload), 86 (batch) | 0 |
| Pascal | 59 (reload), 118 (batch) | 0 |
| Convex hull (batch) | 36 | 0 |
| Inscribed angle, notable points, function graphs (chips and helper points) | nonzero in the S3a registry-wide case before its fixes | 0 |
| All 69 registered families | — | 0 (registry-wide case) |

After S4 the registry-wide case asserts, for every registered family, that no pre-replacement scene object survives a reload or figure batch and that the scene object count is stable. Mutation: cross ratio without `removeDrawn` fails it with 43 kept objects. Disposal runs once per replacement (contract assertion); Hermite/interpolation/parametric `removeScene` runs once per reload (failed with 3 before S3b).

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| Inventory why each path differs; keep deliberate differences | Inventory file; differences above |
| Repeated-replacement tests per entry: object counts, live axes and infobox, no duplicated callbacks or constructions | S1 contract test, extended in S2–S4 (`src/graphs/base/`) |
| One module, same ordered steps, disposal once | `SceneReplacement.ts`; disposal-count assertions |
| Teardown follows owned objects; infrastructure knowledge in the board adapter | S3a/S3b; `BoardInfrastructure.ts` is the only JSXGraph-internals reader |
| Sweep kept as checked fallback until proven, then removed | S3b dev warning, S4 removal after the zero-sweep case passed on 69 families |
| ADR 0015 transient contract and lesson recovery unchanged | Transient-state contract, `lessonRestoration.part1–4` (124 tests) and scene-content tests pass |

## Verification at `efae2fda`

- `just unit` in chunks covering all of `src/**/*.test.*`: `src/graphs` (base, curves, other families, projective, functions), `src/learning` (runtime incl. the four `lessonRestoration` parts, playground, chapter, content and page tests), and the remaining directories (140 files, 2419 tests). All passed.
- `just typecheck`, `just lint`, `just build`: passed.
- Master's new `BSplineCurve` (curves BS-A-2a1) adds no registered graph family, so the registry-wide case's coverage is unchanged.

- After the review repair `ea1025a8`: the contract file and the hermite, interpolation and parametric tests (9 files, 338 tests), typecheck and lint passed.

## Review

Engineering review of S3b and S4 (`bezeg-reviewer` Sonnet). No high-severity finding. Two low findings:

- **Repaired (`ea1025a8`).** Since S3b, Hermite and interpolation `initialize` build only when no scene stands. A hand-edited stored Preset whose `graphState` lists a different point count than its `data` kept the scene built for the data, and the scene's `sync()` cannot move to another count. `initialize` now also rebuilds when the standing scene's point count differs from the state. The two new contract cases fail with the guard removed (`expected 4 to be 5`). A third case covers S3b's parametric curve-mismatch rebuild. Consistently exported Presets were never affected.
- **Deferred.** `boardInfrastructureObjects` treats everything reachable from a default axis (child elements, ancestors, end points) as infrastructure. So the leak test would miss a leaked object built on a default axis, such as a glider. No code in `src` uses `defaultAxes` outside `BoardInfrastructure.ts`, so no family can produce that leak today. If one ever does, compute the infrastructure set once at mount, before any scene object exists.

The review found nothing in these areas: every `initialize` caller (`replaceScene` is the only one), PH controls and auxiliary-board release on remount, listener disposal, and the leak test's reach (all of `graphFactories`).

## Browser smoke

Delegated `bezeg-smoke` (Sonnet), production preview on port 4311 at `efae2fda`, headless Chromium at 1366×800 and 390×800, about 13 min. No console errors or page errors on any page. Both temporary Presets were deleted.

| Check | Result |
|---|---|
| Baseline: entry and Bézier/rational/spline/PH; point drag and De Casteljau slider; rational weight and PH generating-point drag; Bézier↔PH navigation ×2 | passed; object counts identical across rounds (Bézier 48, PH 73 + 31 on the auxiliary board) |
| Language SL→EN→SL; temporary Preset save, change, reopen, delete | passed; edited points and object count unchanged |
| 390 px and keyboard | passed; no horizontal overflow, language select, tab and checkbox by keyboard with a visible focus ring |
| Preset reload ×2 on 11 routes (Bézier, spline, PH, Hermite, Lagrange, parametric, Taylor, cross ratio, Pascal, pole-polar, convex hull) | passed; JSXGraph object counts identical after each reload. Only the built-in Preset exists, so the check reset it |
| PH remount (full load, catalog navigation, Back/Forward) | passed; board, auxiliary board and `w` controls render, and `w0` drags |
| Figure batch ("Generiraj slike") | passed; `slike.zip` downloaded, board intact (48 objects) and still draggable |
| Lesson enter/exit ×2 | passed; entry count 48 restored after each exit, edited points restored |

**Observation, not caused by A3.** The SVG keeps an orphaned arrowhead `<marker>` def per removed arrowed line on each reload: Hermite +4, Pascal +3, cross ratio, pole-polar and parametric +1. JSXGraph 1.14.1's `removeObject` removes only the element's `rendNode`, never its marker defs, and the removed sweep also deleted through `removeObject`. So this predates A3. The defs are invisible and add no JSXGraph objects.

**Gaps.** No language switch inside a lesson. Lesson graph action coverage stayed shallow (only a scene-adding frame was observed). The smoke ran on the build before `ea1025a8`; that repair changes only the mismatched-Preset branch of `initialize` and is covered by unit tests.
