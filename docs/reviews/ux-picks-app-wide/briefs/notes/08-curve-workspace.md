# 08 step 2, slice 2: curve workspace (BaseCurveGraph)

## What changed
- `BaseCurveGraph.tsx`: `declaresCurveWorkspace()` (default false) opts in; `declaration()` is then `commonCurveDeclaration()` (legend, actions, marks), else `undefined`.
  `drawnObject` resolves `curve-<i>` and `control-points-<i>`; `performAction` runs `point-labels`, `control-polygon-<i>`, `convex-hull-<i>`, `control-points-<i>`, `weights-<i>` as the learner.
  `curveViewMarks()` is the De Casteljau marks logic over all curves (control points `must`, 25 samples per curve `nice`, memoized).
- `controls/CurveDisplayControls.tsx`: optional `ownedBy(toggle)`; a toggle that is a board puck is wrapped in `PuckOwned` (existing mechanism; it matches action ids too).
- `fragments/curves.ts` (registered): `curve_item_*` keys with `{value0}`, used only when a board holds several curves; one curve reuses `curve`, `control_polygon`, `convex_hull`, `control_points`, `weights`, `point_labels`.
- `BezierCurveGraph.tsx`: `declaresCurveWorkspace() { return true; }`. Test: `BezierCurveGraph.declaration.test.tsx` (7 tests).

## Placement
Lone curve: control polygon and convex hull are board pucks (lessons ask to flip them while moving points). Everything else (point labels, control points, weights, all switches of a multi-curve board) is `tools`, section `display`. Points stay in Orodja as the editor (typed list, count, editing modes): no point rows.

## Findings
- The Demonstration id is `bezier` (collection key `bezier-curve`), so graph-check takes `bezier`.
- **Parity is vacuous for curve graphs without readouts.** Bezier's panel shows no rows, notes, outputs or captions, so the recording test ("every state changes a shown value") fails for any sample; no `bezier.json` exists and `just graph-check bezier` reports `FAIL parity: no recording`. Needs a handler decision (allow "no recording needed" for graphs with no readouts, or skip the rule). The sample was removed; `parity.test.tsx` is unchanged.
- The control polygon and hull elements are private in `AbstractJXGPointControlledCurve`, so they have no legend entry (not in the owned files). Curve and control points are in the legend.
- No lesson file shows `bezier` with a frame helper found by search; no frame `declare` added.

## Recipe: converting one curve subclass
Owned: the graph file, its lesson file(s), its declaration test, its fragment. Example: `BezierCurveGraph`.
1. Add `protected override declaresCurveWorkspace() { return true; }`. That gives legend, marks and display switches.
2. If the graph has readouts, record parity first (`SAMPLES` in `parity.test.tsx`), as in the function recipe. If it has none, expect the vacuous-parity finding above.
3. Look per subclass at: `workspaceGraphDisplay` (an override that does not call super keeps today's switches, so wrap them with `PuckOwned` yourself or call super); `getGraphCommands` overrides (commands are not declared; declare an action and wrap the command only if the graph's lesson flips it); `workspaceEdit` (stays in Orodja); a subclass with its own `declaration()` spreads `...this.commonCurveDeclaration()`; a subclass overriding `drawnObject`/`performAction` must call `super` for the common ids.
4. Hidden curves: `drawnObject` reports `visible` from JSXGraph, so a curve a graph hides shows hidden in the legend.
5. Test: copy `BezierCurveGraph.declaration.test.tsx` (checkDeclaration empty, legend resolves, marks follow the control points over >= 5 states, switches flip `pressed`); break it once.
6. Checks: `just unit src/graphs/base src/graphs/curves src/learning/content/declarationContract`, `just graph-check <id> --base`, `npx tsc --noEmit --pretty false`, `just lint <files>`, screenshot at inspector width.

## Observed
- Red: marks `y` + 1 in `curveViewMarks` fails 5 tests (`log .command-logs/08e-red.log`); restored.
- Green: declaration test 7 passed; `just unit src/graphs/base src/graphs/curves src/learning/content/declarationContract src/localization` passed (`08e-unit.log`); tsc clean; lint passed; `graph-check decasteljau --base`: PASS contract, parity, declaration (browser part listed as skipped in the log).
- Not verified: browser/screenshot of the bezier board; graph-check bezier --base.

## Close-out (curve workspace close worker)

- Parity n/a: showsNoValues in parity.ts, parityApplicable.test.tsx, scripts/graph-check.cjs; guide line added. Red seen: BEZEG_PARITY_NA=patch-coons fails.
- Marks key includes weights (BaseCurveGraph.tsx curveViewMarks); BaseCurveGraph.marksCache.test.ts red seen with weights removed.
- Item 4 cause: PuckStrip.tsx puckItems returned [] when graph.parameters is undefined (BoardCards.tsx:191 passes parameters?.keys()); fixed in puckItems. scripts/bezier-puck-check.cjs confirms pucks, toggle, no duplicate in Orodja.
- GraphControlledControls.test.tsx now reads the puck switch (aria-checked).
- graph-check bezier needs --route bezier/curve (default analysis/bezier is wrong); decasteljau --route bezier/decasteljau. Both PASS.
