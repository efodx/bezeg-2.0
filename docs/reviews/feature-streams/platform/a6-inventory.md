# A6 inventory (read-only, HEAD 51e2e54b)

## 1. Gesture code (src/graphs/curves/object/AbstractJXGPointControlledCurve.ts, "A.ts")
- move A.ts:174-177: dx,dy = newCoords.usrCoords[1,2] - this.coords.usrCoords[1,2]; model.moveFor(dx,dy). Incremental (delta vs previous pointer).
- resize A.ts:179-190: box = model.getBoundingBox(); dx,dy *= getResizingDir() (A.ts:259-270; corner via boundBoxPoints.hasPoint -> [-1,-1],[-1,1],[1,1], else [1,-1]); xScale=(2*dx+maxX-minX)/(maxX-minX); yScale likewise; model.scale(xScale,yScale). Pivot = projected bbox centre (model scale, abstract-point-controlled-curve.ts:57-62).
- rotate A.ts:192-199: k1=(yc-new.y)/(xc-new.x); k2=(yc-old.y)/(xc-old.x); theta=Math.atan((k1-k2)/(1+k1*k2)); model.rotate(theta). Incremental.
- pivot A.ts:290-295 startRotating: rotationCenter = mean of jxgPoints X,Y (equals model getPointsCenter, abstract:120, which rotate() uses by default, abstract:76-79).
- select/hit: processMouseDown A.ts:236-247 (resize if on boundBoxPoints; rotate if outside bbox but inside padded bbox 0.3; else drag); isMouseInsideBoundingBox ~A.ts:420.
- mouse move/up A.ts:209-232 / 249-258 (up applies move/resize/rotate once more).
- Stays in adapter: flags dragging/resizing/rotating (A.ts:86-94), coords, resizingStart, rotationCenter storage, getMouseCoords (~A.ts:678), bbox handles+segments addBoundingBox (A.ts:661-690), show/hideBoundingBox, hit tests, board.update.
- graphs/base/CurveEditingFeature.ts has NO gesture math (selection/mode state and host interface only; grep rotate/scale/resiz = 0 hits). Task entry list is stale there.

## 2. Suspected bugs (predicted from reading, unrun)
a) Pointer vertically aligned with centre (new.x == xc): k1 = (yc-y)/0 = +-Infinity (NaN if also y==yc). k1-k2 = Inf; 1+k1*k2 = +-Inf (NaN if k2==0, Inf*0) -> Inf/Inf = NaN -> theta NaN -> cos/sin NaN -> every control point NaN. Same when old.x == xc. Test: old=(xc+1,yc+1), new=(xc,yc+2): expect finite theta (+pi/4); currently NaN.
b) Across +-90: atan of the tangent of a slope difference only returns (-pi/2, pi/2), the angle between lines mod pi. A step wider than 90 deg, or the pointer crossing over the centre (true step ~180), is off by pi (true 100 deg -> -80 deg). At exactly 90 deg 1+k1k2 = 0 -> +-Inf -> +-pi/2 with sign depending on sign of zero (sign flip when straddling). Correct: a=old-c, b=new-c, theta=Math.atan2(ax*by-ay*bx, ax*bx+ay*by); |a|==0 or |b|==0 -> 0.
c) Degenerate box: w=maxX-minX==0 -> xScale=(2dx+0)/0 = +-Infinity (NaN if dx==0); same for h. scale then writes Infinity/NaN into points. Also non-degenerate: dx*xDir <= -w/2 gives xScale <= 0: 0 collapses to w=0 (then next event NaN, permanent), negative mirrors the curve. A horizontal collinear polygon (all y equal) is degenerate immediately. Test: points (0,0),(1,0),(2,0): vertical resize must give finite points, y unchanged (factor 1 on degenerate axis).

## 3. Model (src/bezeg/impl/curve/abstract-point-controlled-curve.ts)
- scale(xScale, yScale?) :55-62 -> transform([[sx,0],[0,sy]],[0,0],projectedBboxCentre); moveFor(x,y) :64 -> transform(I,[x,y]); flip :68; rotate(theta) :76 -> transform(R,[0,0]) about points centroid; transform(A,b?,center?) :108 touches cache.
- Tests found: bezier-evaluation.test.ts:125 (moveFor), geometry-versions.test.ts:122,291-293 (version stamps only), bezier-3d.test.ts, ph-bezier-curve.test.ts (hits), interpolationExamples.test.ts (rotate/scale/moveFor vs hand-written affine, PolynomialBezierCurve), AffineTransformsBezierCurveGraph.test.ts (mocks, call args only). No direct numeric test of translate/scale/rotate on the abstract class for rational/spline/3D; no adapter pointer-gesture test.

## 4. Degree elevation
- AbstractJXGBezierCurve.ts:20-30 `elevatedControlPoints(points)`: pure, 2D only, P'_i=(i/(n+1))P_{i-1}+(1-i/(n+1))P_i. Callers: AbstractJXGBezierCurve.ts:210, ElevationGraph.test.ts:34,69,71, interpolationExamples.test.ts:13,336.
- polynomial-bezier-curve.ts:20-25 `elevate()` via kernel `elevate` (bezier-kernels, imported :7), handles z, returns new curve. Callers: JXGBezierCurve.ts:98, BezierCurveControls.tsx:139, CurveWorkspaceControls.tsx:88, ElevationGraph.tsx:93, ph-bezier-curve.ts:243, kernel tests (bezier-kernels.test.ts:181-215).
- Mathematically identical in 2D (same formula); the helper is a 2D duplicate for the overlay. interpolationExamples.test.ts:328-345 compares hand formula, elevatedControlPoints and curve.elevate() on ELEVATION_CUBIC, then checks equality at 21 parameters. Collapse: make elevatedControlPoints delegate to the kernel (or curve.elevate().getPoints()); keep the hand-formula comparison.

## 5. Performance
- performance-plan.md: measure before optimizing; protocol :24-26 (commit, production build, browser/device, viewport, input method; short repeatable gesture, repeated; median and tail; input-to-update delay, frame durations, board update counts); scenes table :13-15 lists control-point drag, not curve rotate/resize.
- scripts/playground-perf.cjs measures only the drawing playground (/learn/bezier-curves handle drag, seeded storage key); cannot do curve drag/rotate. scripts/bezier-benchmark/ (browser.tsx, scenes.json, check-frames.cjs) not verified to cover whole-curve gestures. A new small Playwright script in the PERF_* style is needed.
- Routes (src/demonstrations.ts:34-53): polynomial /bezeg-2.0/bezier/curve (and /bezier/affine); rational /bezeg-2.0/rational/base; splines /bezeg-2.0/spline/spline, /c1spline, /c2spline, /g1spline.

## 6. Slice plan (file-disjoint from functions/analysis/complex)
S1 (~20 turns) Reproduce + math module. New src/bezeg/impl/curve/gesture-transforms.ts (pure: rotationAngle(center, from, to) by atan2 with zero-radius guard; resizeScale(box, delta, dir) guarding zero extent and non-finite -> factor 1) + gesture-transforms.test.ts, failing-first for the three bugs plus properties (step angles sum to total, rotation preserves distance to centroid, scale keeps bbox centre). Wire A.ts rotate()/resize() only. Checks: just unit on new test and AbstractJXG* tests, tsc. 
S2 (~15 turns) Direct model tests (abstract-point-controlled-curve.test.ts): translate/scale/rotate on polynomial, rational (weights untouched), spline, 3D (z untouched), pivot centroid vs bbox centre, flip. Unify elevation: elevatedControlPoints delegates to kernel; keep interpolationExamples.test.ts:328. Checks: just unit on these plus ElevationGraph.test and bezier-kernels.test, tsc, just build.
S3 (~15 turns, handler/browser) New scripts/curve-gesture-perf.cjs; measure before (HEAD) and after on the four route kinds; smoke select/drag/resize/rotate with mouse and touch; record in bezier-performance-results.md and task status.
No change: CurveEditingFeature.ts (no gesture math); move/drag math (pure delta, no bug), only pin with a test.
Open policy question: zero/negative scale (collapse/mirror). Recommend guarding only non-finite and zero extent, flag to owner.
