# Controls stream: effect on test count and time

Read-only research, 2026-11-08. No tests run. Durations come from `node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json`. Its last run was 2026-11-08 10:03 local, which is before the P1-P5 commits (11:12 and 12:14). Per-file durations are summed across workers. They are not wall time.

## The stream

- Spec: `docs/specs/shared-graph-controls.md`. Queue: `docs/tasks/feature-streams/controls.md`, which also holds the parallel plan. State: `docs/reviews/feature-streams/controls/state.md`. Tasks: `docs/tasks/shared-graph-controls/00`-`04`.
- Done: task 0 (inventory), task 1 (foundation: shared inputs, refusal channel, lint rule, shared behaviour test, rendered fixture), and task 2 P1-P5 (shared point controls piloted on Interpolation/Hermite/Correlation, PointSet and the curve workspace). Task 2 waits for UI review, smoke and review follow-ups. Remaining: contracts tasks 2-3, style contracts, task 3 family sweeps (compgeo, projective, functions, curves, patches) and task 4 remaining controls (C9-C30). After that come phone playback and lesson-authoring workstreams 3-5.
- Test strategy (decisions 23 and 25):
  - `src/inputs/sharedControlBehaviour.tsx` (669 lines, test-only) registers about 7-11 checks per control kind: placement, limit, refusal, commit, Escape, keyboard and Reset.
  - The checks run on the bare controls in `src/inputs/sharedControls.behaviour.test.tsx` and on real graphs in `src/graphs/base/sharedControls.graphs.test.tsx`. Every case mounts a fresh graph.
  - The rendered fixture is `fixtures/controls/` with `tests/controls-fixture.spec.cjs` (`just controls-fixture`). It runs 2 languages × 5 views × about 4 tests. It is not in CI.
- Spec acceptance 3 asks for "**two graphs** offering a capability pass the same shared behaviour test". That is bounded by the number of control kinds.
- Task 3 acceptance asks that "its panels pass the shared behaviour test **where they offer a capability**". Read literally, that is one run per panel per control kind, so it grows multiplicatively.
- No spec, task or state file says to delete or merge per-graph control tests on migration. A search for delete/remove/retire near "test" in those docs found nothing.

## 1. Today

- Suite: 643 files, 2,058 s summed.
- 50 test files exercise control widgets: spinbutton, slider, aria-valuenow, count buttons, Escape/Arrow/PageUp keys. They sum to about 202 s. Most of their cases test graph mathematics or scene behaviour, not control mechanics, so they would not become redundant.
- The cases that duplicate the shared behaviour test are a small minority, about 1-3 per file:
  - `src/graphs/compgeo/InversionGraph.host.test.tsx:591` "Shift+ArrowUp/Down steps the theta field by 10 and integer fields by 10". This is the numeric keyboard check.
  - `src/graphs/compgeo/InscribedAngleGraph.host.test.tsx:190` "PageUp steps 10, typed text replaced on reset". These are the slider keyboard and Reset checks. This file takes 21.2 s.
  - `src/graphs/curves/interpolation/InterpolationGraphReal.test.tsx:205` "a typed coordinate beyond 1000 is refused by the field". `pointListBehaviour` on interp-lagrange already covers this.
  - `src/graphs/curves/bspline/BSplineBasisGraph.test.tsx:283` "arrow keys step a knot by 0.01". This checks the keyboard and the step value.
  - `src/graphs/functions/FourierCoefficientsGraph.host.test.tsx:115` "keyboard step 0.05, Shift 0.5". This checks the keyboard and the step value.
  - `src/graphs/compgeo/PointInPolygonGraph.host.test.tsx:210` "arrow keys move q, Escape". This is the point keymap, which `pointKeys.test.ts` covers.
  - `src/graphs/compgeo/PointSetSegments.host.test.tsx:149` and `:200`: arrow nudge and limit refusal.
- Realistic saving from cutting these: about 10-20 cases, which is roughly 5-15 s summed. That is a small fraction of the 2,058 s.

## 2. What the stream added and plans to add

- At least 12 test files added so far, 1 deleted:
  - Added: `src/inputs/sharedControls.behaviour.test.tsx`, `src/graphs/base/sharedControls.graphs.test.tsx`, `src/inputs/PointListInput.props.test.tsx`, `src/graphs/curves/interpolation/SharedPointDecisions.test.tsx`, `src/learning/content/interpolationLessonViews.test.ts`, `src/graphs/compgeo/PointSet.sharedControls.test.tsx`, `src/graphs/base/CurveWorkspacePoints.test.tsx`, and `src/graphs/base/points/{placement,viewPolicy,dragConstraint,pointKeys,pointFactory}.test.ts`.
  - Also added: the Playwright fixture `tests/controls-fixture.spec.cjs` with its config, and the 669-line behaviour helper.
  - Deleted: `src/graphs/base/PointCoordinateEditor.test.tsx`, which took 0.23 s.
- `sharedControls.graphs.test.tsx`:
  - Before P1, it took 22.5 s for 5 behaviour instances (2 numeric, 2 slider, 1 count). That is about 41 cases at about 0.55 s per case, since each case mounts a real graph.
  - P3 and P5 added 7 instances: pointCollection on interp-lagrange, interp-hermite, bezier and curve-curvature, and pointList on interp-lagrange, bezier and curve-curvature. That is about 60 more cases.
  - Estimate, not measured: about 55-60 s. That would make it the slowest unit file. The next slowest is InscribedAngle at 21 s.
- Task 2 asks for "decisions 1, 3, 6, 7 on at least two graphs". In practice decisions 1 and 6 are tested three times:
  - `SharedPointDecisions.test.tsx:44,53,63`
  - `PointSet.sharedControls.test.tsx:77,126`
  - `CurveWorkspacePoints.test.tsx:38,47`
  - These are on top of the pure-rule tests `placement.test.ts` and `viewPolicy.test.ts`.
- Projection for the remaining sweeps:
  - The lint exemptions still list 9 compgeo, 4 projective, 1 patches and 2 learning panel files, plus 5 hand-built steppers. Graph code holds about 380 shared-control usages across about 100 files.
  - If "its panels pass the shared behaviour test" means one real-graph instance per panel and kind, about 100 graphs × about 2 kinds × about 8 cases × 0.55 s comes to about 900 s summed. That is about +40% of the suite.
  - One instance per usage would be about 1,700 s. That is about +80% of the suite.
  - The literal spec acceptance (two graphs per kind, about 7 kinds) caps the cost near 14 instances, about 70 s in total.
- The fixture is O(control kinds), not O(graphs). It is outside CI and adds nothing to unit time.

## 3. Verdict

So far the stream has made the suite **bigger**: about +12 files, about +35-40 s summed in `sharedControls.graphs` alone, and a new Playwright tier. It has removed almost nothing. It lowers future cost only if:

1. **Two graphs per kind is the ceiling.** Amend task 3's acceptance: a migrated panel gets one thin wiring check, meaning the control is mounted with the graph's label, bounds and step, and one value round-trips through the model. It does not get the full behaviour set. Reason: the control code is shared, and the graph only supplies props.
2. **Delete per-graph mechanics cases as each panel migrates**, in the same commit. The candidates listed in section 1 come first: `InversionGraph.host.test.tsx:591`, `InscribedAngleGraph.host.test.tsx:190`, `InterpolationGraphReal.test.tsx:205`, `BSplineBasisGraph.test.tsx:283` (keep only the 0.01 step value as wiring), `FourierCoefficientsGraph.host.test.tsx:115` (same), `PointInPolygonGraph.host.test.tsx:210`, and `PointSetSegments.host.test.tsx:149` and `:200`.
3. **Collapse the triplicated decision tests.**
   - Keep the rules in `src/graphs/base/points/placement.test.ts` and `viewPolicy.test.ts`.
   - Keep one real-graph case per decision.
   - Merge `PointSet.sharedControls.test.tsx` decision 1 and 6 cases and `CurveWorkspacePoints.test.tsx:38,47` into the shared runner's mount specs, or delete them.
   - Keep `SharedPointDecisions.test.tsx` only for the Hermite tangent-tip and decision 7 cases, which are graph-specific.
4. **Make `sharedControls.graphs.test.tsx` cheaper:**
   - Mount once per behaviour group and Reset between cases with `beforeAll` and host Reset, instead of a fresh graph per case. Reset is itself one of the checks.
   - Drop the second curve graph (`curve-curvature`) for pointCollection and pointList, because bezier and Interpolation already give two graphs per kind.
   - Possible saving: about half of that file's time.
5. **Keep the fixture non-blocking.** Run it per sweep or at a checkpoint, not in `check-changed`. If it enters CI, use one language and 2-3 views per push, and the full matrix nightly or at closeout.
6. **Record a test budget** in the spec's Order or Acceptance: each sweep must end with a non-positive change in test file count for its family, and the handoff must report the duration delta.

The net result on the current plan is growth. With items 1-4 the stream can end roughly neutral: about +70 s shared, minus per-graph mechanics cases and duplicate decision tests. The deletable surface is small, so the gain is mainly avoiding the projected +900-1,700 s from per-panel behaviour runs, more than shrinking the suite below today.
