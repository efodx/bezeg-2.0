# 03b handoff (partial)

## Done (prose + figure removal only; NO recipes/copy/expectations/inventory yet; NO checks run)
- src/learning/content/familyChapters.ts: removed consts + uses of bernsteinFigure, complexMultiplicationFigure, rationalFigure, circleFigure, splineC1Figure, splineG1Figure (both `figures:` and `{kind:'figure'}` items). previewPoster import still used elsewhere. Added prose: reading-bernstein last paragraph (SL+EN, in paragraphs and orderedContent) says card shows cubic weights, next section uses quadratic 1/4,1/2,1/4; complex-plane paragraph before "Množenje z neničelnim" / "Multiplication by a nonzero" now carries (1+i)i=-1+i, rotation pi/2, |i|=1.
- src/learning/content/familyChapterSequences.ts: removed 'fig0' from why-rational, worked-conic, continuity-levels, geometric-vs-parametric; added/extended inline items (card shows cubic w=1,2,1,1 not the quadratic arc; card = 3-arc circle radius 3 vs quarter-arc proof; c1 card illustrates not proves; g1 card shows aligned tangents, unequal legs, no proof).
- Not yet verified: tsc, familyChapters/sequences tests (a test may assert figure counts).

## Remaining
1. Recipes in src/learning/chapter/guidedExampleHighlights.ts (frame id = `<stepId>-observation`; generator validates frame ids):
 - foundations.reading-bernstein.bernstein: frame bernstein-stacked-area-observation; curveCount 4; stacked regions are filled `curve`s (connectCurves, joins at .25/.5); derived samples: regions 0..n-1 [(0,1),(1,0),(0,1)], top region [(1,0),(0,1),(1,0)] (unverified vs board).
 - foundations.complex-plane.complex-multiplication: {kind:'start'} (Show product is a button, not expressible); foundations.worked-weight...degree-comparison: start (family card prepared at degree 2); rational-curves.worked-conic.circle: start (step 1 circle-default).
 - rational-decasteljau: rational-decasteljau-projection-observation; controls (-4,-3),(0,3),(4,-3) w 1,2,1; rows (-4/3,1),(4/3,1); final (0,1); curveCount 1.
 - rational-extrapolation: rex-example-observation; P=(-4,-3),(-3,3),(3,3),(4,-1) w 1,2,1,1, t=1.2; new weights 1,2.2,.52,1.144; homogeneous blossom via bezierSegmentControls on (wx,wy) and (w,0), project; curve R(1.2u).
 - farin: farin-show-points-observation; curveCount 1, control points (-4,-3),(-3,3),(3,3),(4,-3), types {slider:3} (sliders elType 'slider', Farin positions not board-checkable).
 - rational-elevation: rational-elevation-once-observation; weights 1,7/4,3/2,1,1; homogeneous elevation Q_i; curve same as R; curveCount 1.
 - rational-subdivision: rsd-half-example-observation; curveCount 3 (orange remainder overlay as in 03a); pieces L(u)=R(u/2), R((1+u)/2) with projected blossom controls.
 - splines (not yet read): c1-tangent-step-observation (pieces (-4,-2),(-2,2),(0,2) and (0,2),(2,2),(3,-1); spline is ONE jsx curve with eval domain still to check in GenericBezierSpline), c2-joint-polygon, g1-condition-polygon (default b, not 0.65), g1s-quarter (beta1=0.25; maybe slider), cn-extrapolate (polygon on), parabola-derivatives = start (family card, 'worked-parabola-join' fixture in guidedExamples.ts).
2. Add helpers + tests (with one deliberate-mutation failure shown) in guidedExampleHighlightExpectations(.test).ts.
3. SL+EN alt/caption for each highlight in guidedExampleHighlightCopy.ts.
4. node scripts/generate-guided-example-inventory.cjs; run the checks listed in the brief (logs 03b-*.log).
