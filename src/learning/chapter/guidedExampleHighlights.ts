/**
 * Authored highlight recipes for guided-example card media (docs/specs/guided-example-highlights.md H2-H4).
 *
 * This is the single source of truth for how a card image is reached beyond the example's start scene. It is
 * keyed by the guided example id (`retainedExampleHomes` key or a patch example id) and read by
 * `scripts/generate-guided-example-inventory.cjs`, which resolves frame ids against the example's own lesson,
 * copies the recipe into the capture inventory, and fingerprints it. An example with no entry here is captured
 * at its start scene; the generator writes that choice into the inventory as an explicit `{kind: 'start'}` recipe.
 *
 * Steps reuse what the guided lesson already offers a learner, applied in order after the example prepared its
 * scene, so a recipe cannot reach a state a learner could not reach:
 * - `goto-frame` moves to a frame of the same lesson with the previous/next navigation (forward or back).
 * - `frame-action` presses the authored action button of the current frame (`LessonFrame.action`, or the step
 *   action it inherits); the lesson session applies that frame's scene and action exactly as for a learner.
 * - `explore` presses the lesson's hide ("Skrij") or observe ("Opazuj na grafu") button so the workspace enters explore mode and the inspector unlocks; required before
 *   any `select-tab`/`set-control`, and no frame navigation or action may follow it.
 * - `select-tab` opens an inspector tab (`edit`, `display` or `save`: Uredi, Prikaz, Shrani) by clicking its button.
 * - `set-control` sets a visible control of the open tab through the UI (clicks a checkbox, fills a range slider or a
 *   number field) and verifies that it shows the value; it fails for a missing or ambiguous label or a value the
 *   control does not accept. `label` is the control's Slovenian accessible name (capture language is sl-SI).
 *   There is no production-side hook: the app sees an ordinary learner interaction.
 */

/** Pure data: the recipe never holds functions, so it can be fingerprinted and stored in the manifest. */
import {affineLessonControlPoints, bernsteinValue, bezierPoint, bezierSegmentControls, c1QuadraticPieces, c1SplineFreePoints, c2CubicPieces,
    c2SplineFreePoints, cnSplineFreePoints, decasteljauRows, defaultQuarticControlPoints, elevationCubicControlPoints, extrapolatedQuadraticPieces,
    g1QuadraticPieces, g1SplineFreePoints, g1SymmetricPieces, g1SymmetricSplineFreePoints, splinePoint, extrapolationCubicControlPoints, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint,
    rationalBezierPoint, rationalControlPoints, rationalDecasteljauRows, rationalElevatedControls, rationalSegmentControls, rationalWeightsSecondTwo, rotateAboutMean, sampleCurve, subdivisionCubicControlPoints,
    stackedBernsteinRegionSamples, symmetricCubicControlPoints, weightedKnotControlPoints, weightedWarp,
    alphaC2SplineJoints, alphaC2SplinePoint, alphaC2SplineSamples, phControlPointsOf, phPointOf, splineParameterizationPoints, uniformArcLengthParameters,
    uniformParameterizationFixture, phCubicFixture, phQuinticFixture, phOffsetPointOf,
    areaLessonF, areaLessonG, trigValue} from './guidedExampleHighlightExpectations';
import type {Vec} from './guidedExampleHighlightExpectations';

export type HighlightStep =
    | {readonly kind: 'goto-frame'; readonly frame: string}
    | {readonly kind: 'frame-action'}
    | {readonly kind: 'explore'}
    | {readonly kind: 'select-tab'; readonly tab: 'edit' | 'display' | 'save'}
    | {readonly kind: 'set-control'; readonly control: 'checkbox'; readonly label: string; readonly value: boolean}
    | {readonly kind: 'set-control'; readonly control: 'slider' | 'number'; readonly label: string; readonly value: number};

/** Expected geometry of the highlight state, in the vocabulary of the inventory `expected` checks. */
export interface HighlightChecks {
    /** Exact visible element count per JSXGraph element type, for example `{curve: 2, point: 6}`. */
    readonly types?: Readonly<Record<string, number>>;
    /** Visible curve plus function-graph count. */
    readonly curveCount?: number;
    /** Points that must be visible, as `[x, y]`. */
    readonly points?: readonly (readonly [number, number])[];
    /** Curves that must be visible, each as samples at parameter 0, 0.5 and 1 in `[x, y]`. */
    readonly curves?: readonly (readonly [readonly [number, number], readonly [number, number], readonly [number, number]])[];
}

export type HighlightRecipe =
    /** Explicitly keep the start scene (first frame, nothing applied). */
    | {readonly kind: 'start'}
    | {
        readonly kind: 'highlight';
        /** Target frame id of the example's lesson, reached before `steps` run. */
        readonly frame: string;
        /** Ordered steps applied after reaching `frame`; may be empty when the frame itself is the highlight. */
        readonly steps: readonly HighlightStep[];
        /** `true`: the board must differ from the start scene (capture fails otherwise); `false`: it must be unchanged. */
        readonly expectChange: boolean;
        /** Required, nonempty: geometry that must hold on the board in the highlight state. */
        readonly checks: HighlightChecks;
    };

/** Offset distance the quintic PH lesson frame prepares (`set-offset-distance`), positive = right of the direction of travel. */
const PH_OFFSET_DISTANCE = 0.5;
/** Weighted-parameterization value the quarter frame prepares, and the number of sample points it keeps. */
const WP_ALPHA = 0.25, WP_SAMPLES = 3;
const MIDPOINT = 0.5;

/** parametrization chapter (batch 04a): the uniform lesson draws 10 samples at equal arc length; the spline lesson uses alpha=1 with 10 samples. */
const UNIFORM_SAMPLES = 10, SPLINE_SAMPLES = 10, SPLINE_ALPHA = 1;
const uniformSamplePoints = uniformArcLengthParameters(uniformParameterizationFixture, UNIFORM_SAMPLES).map(t => phPointOf(uniformParameterizationFixture, t));
const chordalSplineJoints = alphaC2SplineJoints(splineParameterizationPoints, SPLINE_ALPHA);
const chordalSplineSamples = alphaC2SplineSamples(splineParameterizationPoints, SPLINE_ALPHA, SPLINE_SAMPLES);

const rationalMarked = rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, MIDPOINT);
const wpCurve = sampleCurve(t => bezierPoint(weightedKnotControlPoints, t));
const wpMarkers = Array.from({length: WP_SAMPLES}, (_, i) => bezierPoint(weightedKnotControlPoints, weightedWarp(WP_ALPHA, (i + 1) / (WP_SAMPLES + 1))));

// bezier-curves chapter (batch 03a): values from the lesson fixtures, never from the board.
const rotatedAffineControls = rotateAboutMean(affineLessonControlPoints, Math.PI / 2);
const BERNSTEIN_DEGREE = 3;
/** Pieces of the curve cut at the dyadic parameters k/2^steps: the repeated-subdivision pieces after `steps` halvings. */
const dyadicPieces = (steps: number) => Array.from({length: 2 ** steps}, (_, k) => bezierSegmentControls(subdivisionCubicControlPoints, k / 2 ** steps, (k + 1) / 2 ** steps));
const rsPieces = dyadicPieces(3);
const sdLeft = bezierSegmentControls(subdivisionCubicControlPoints, 0, MIDPOINT), sdRight = bezierSegmentControls(subdivisionCubicControlPoints, MIDPOINT, 1);
const EXTRAPOLATION_T = 1.2;
const extrapolatedControls = bezierSegmentControls(extrapolationCubicControlPoints, 0, EXTRAPOLATION_T);
/** Degree elevation: Q_i = (i/4) P_{i-1} + (1 - i/4) P_i for i = 0..4 (the weight of an index outside P is zero). */
const elevatedControls: Vec[] = [0, 1, 2, 3, 4].map(i => {
    const P = elevationCubicControlPoints, previous = P[Math.max(i - 1, 0)], own = P[Math.min(i, 3)];
    return [i / 4 * previous[0] + (1 - i / 4) * own[0], i / 4 * previous[1] + (1 - i / 4) * own[1]] as Vec;
});
const helperPoint = (from: number) => bezierPoint(defaultQuarticControlPoints.slice(from, from + 4), 0.25);
const cubicRows = decasteljauRows(symmetricCubicControlPoints, MIDPOINT);

// foundations and rational-curves chapters (batch 03b-A): values from the lesson fixtures and the graph presets, never from the board.
/** The stacked-area frame draws the degree-3 functions (BernsteinGraph `bernstein-degree` 3 gives four regions). */
const STACKED_REGIONS = BERNSTEIN_DEGREE + 1;
/** Rational de Casteljau quadratic fixture (additionalGuidedLessons.ts `quadraticFixture([1, 2, 1])`) at t = 1/2. */
const rationalQuadraticPoints: readonly Vec[] = [[-4, -3], [0, 3], [4, -3]];
const rationalQuadraticWeights = [1, 2, 1];
const rationalQuadraticRows = rationalDecasteljauRows(rationalQuadraticPoints, rationalQuadraticWeights, MIDPOINT);
/** constructionGuidedLessons.ts `rationalExtrapolationFixture`: the extrapolation demonstration's end point is (4, -1). */
const rationalExtrapolationPoints: readonly Vec[] = [[-4, -3], [-3, 3], [3, 3], [4, -1]];
const rationalExtrapolated = rationalSegmentControls(rationalExtrapolationPoints, rationalWeightsSecondTwo, 0, EXTRAPOLATION_T);
/** Rational elevation, subdivision and Farin demonstrations all start from the rational lesson curve (1,2,1,1). */
const rationalElevated = rationalElevatedControls(rationalControlPoints, rationalWeightsSecondTwo);
const rationalLeft = rationalSegmentControls(rationalControlPoints, rationalWeightsSecondTwo, 0, MIDPOINT);
const rationalRight = rationalSegmentControls(rationalControlPoints, rationalWeightsSecondTwo, MIDPOINT, 1);
const rationalCurveAt = (t: number) => rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, t);

// splines chapter (batch 03b-B): pieces built from the lesson's construction formulas, never from the board. Each spline is one
// JSXGraph curve (sampled at the global parameters 0, 1/2, 1); the control polygon is made of segments, which the curve count ignores.
/** Free points followed by the computed (derived, joint) control points of the pieces, without duplicates. */
const splineVisiblePoints = (free: readonly Vec[], pieces: readonly (readonly Vec[])[]): Vec[] => {
    const seen = new Set<string>();
    return [...free, ...pieces.flat()].filter(point => { const key = point.map(v => v.toFixed(6)).join(','); return !seen.has(key) && !!seen.add(key); });
};
const splineCurve = (pieces: readonly (readonly Vec[])[]) => sampleCurve(t => splinePoint(pieces, t));
const c1Pieces = c1QuadraticPieces(c1SplineFreePoints);
const cnPieces = extrapolatedQuadraticPieces(cnSplineFreePoints);
const c2Pieces = c2CubicPieces(c2SplineFreePoints);
/** g1-condition-step: the scene sets b = 1 (the ratio slider's default); g1s-quarter sets beta_1 = 1/4. */
const g1Pieces = g1QuadraticPieces(g1SplineFreePoints, 1);
const g1SymmetricQuarterPieces = g1SymmetricPieces(g1SymmetricSplineFreePoints, 1 / 4);

/** PH offset cards (batch 04a-3): default offset distance of the PH graphs (ph-bezier-curve.ts) and the quintic distance with a self-intersection. */
const PH_DEFAULT_OFFSET = 0.2, PH_QUINTIC_SELF_INTERSECTION = -2.5;
/** The learner route to the offset: hide the lesson text, the Prikaz tab shows the offset checkbox, the Uredi tab holds the distance slider. */
const phOffsetOn: readonly HighlightStep[] = [
    {kind: 'explore'}, {kind: 'select-tab', tab: 'display'}, {kind: 'set-control', control: 'checkbox', label: 'Odmiki krivulje', value: true},
];
const phOffsetAt = (d: number): readonly HighlightStep[] => [...phOffsetOn, {kind: 'select-tab', tab: 'edit'}, {kind: 'set-control', control: 'slider', label: 'Razdalja odmika d', value: d}];
const phCubicControls = phControlPointsOf(phCubicFixture), phQuinticControls = phControlPointsOf(phQuinticFixture);
const phCubicWithOffset = (d: number): HighlightChecks => ({
    curveCount: 2, points: phCubicControls, curves: [sampleCurve(t => phPointOf(phCubicFixture, t)), sampleCurve(t => phOffsetPointOf(phCubicFixture, d, t))],
});
const phQuinticWithOffset = (d: number): HighlightChecks => ({
    curveCount: 2, points: phQuinticControls, curves: [sampleCurve(t => phPointOf(phQuinticFixture, t)), sampleCurve(t => phOffsetPointOf(phQuinticFixture, d, t))],
});

// ---- Functions and calculus (batch 04b). Samples of a function graph are [t, f(t)] at t = 0, 1/2, 1 (JSXGraph function graphs have X(t) = t).
// Curves drawn from data arrays (continuity pieces, polylines, rectangles, shaded regions) are counted in `curveCount` but not sampled.
const graphSamples = (f: (x: number) => number) => sampleCurve(t => [t, f(t)]);
const exponentialBaseTwo = (x: number) => 2 ** x;
const trigWorked = {A: 2, omega: 2, phi: Math.PI / 2, B: 1};

/**
 * Recipes by guided example id. Frame ids are the example lesson's own; expected values come from
 * guidedExampleHighlightExpectations.ts, computed from fixtures and formulas, never from the board.
 */
export const guidedExampleHighlightRecipes: Readonly<Record<string, HighlightRecipe>> = {
    // S1: quintic PH curve with its offset at d=0.5 (frame action sequence already part of the prepared step scene):
    // the offset curve is r + d n with n = (y', -x')/|r'|, so |O - r| = d and (O - r).r' = 0 at every t; sampled at 0, 1/2, 1.
    'ph-curves.offsets.ph-quintic-offsets': {
        kind: 'highlight', frame: 'ph-quintic-offset-positive-observation', steps: [], expectChange: true,
        checks: {
            types: {curve: 2, point: 6}, curveCount: 2, points: phQuinticControlPoints,
            curves: [sampleCurve(t => phQuinticPoint(t)), sampleCurve(t => phQuinticOffsetPoint(t, PH_OFFSET_DISTANCE))],
        },
    },
    // S2: weights (1,2,1,1) at t=1/2: marked point R(1/2)=(-9/11, 21/11); the end points do not depend on the weights.
    'rational-curves.why-rational.rational-weight': {
        kind: 'highlight', frame: 'rational-base-evaluation-calculation', steps: [], expectChange: true,
        checks: {
            types: {curve: 1, point: 5}, curveCount: 1, points: [...rationalControlPoints, rationalMarked],
            curves: [sampleCurve(t => rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, t))],
        },
    },
    // S3: alpha=1/4 with three sample points: the control points and the drawn curve equal the alpha=1/2 start scene, only the
    // markers move, to B(phi_alpha(k/4)) for k=1,2,3 (1/2, 3/4, 9/10). The alpha=1/4 frame prepares the slider value itself,
    // so no set-control step is recorded: it would change nothing.
    'parametrization.weighted-knot.weighted-parameterization': {
        kind: 'highlight', frame: 'wp-quarter-calculation-calculation', steps: [], expectChange: true,
        checks: {
            types: {curve: 1, point: 4 + WP_SAMPLES}, curveCount: 1, points: [...weightedKnotControlPoints, ...wpMarkers], curves: [wpCurve],
        },
    },
    // Uniform mode with 10 samples on the quintic PH demonstration curve: the samples are at equal arc length (each of the 11 arcs is L/11),
    // so the markers sit at r(t_k) with s(t_k) = k L / 11. The start scene is weighted mode with 3 samples, so the board changes.
    'parametrization.uniform-timing.uniform-parameterization': {
        kind: 'highlight', frame: 'up-uniform-twenty-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...phControlPointsOf(uniformParameterizationFixture), ...uniformSamplePoints],
            curves: [sampleCurve(t => phPointOf(uniformParameterizationFixture, t))],
        },
    },
    // Chordal spline (alpha=1, knot intervals |chord|^alpha) of the 8 lesson points with 10 samples at t = i/11; the frame sets alpha and the
    // samples itself. The joints differ from the alpha=0 spline (J3 = (-3.325, 0.385) instead of (-2.133, 0)).
    'parametrization.weighted-knot.spline-parameterization': {
        kind: 'highlight', frame: 'sp-chordal-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...splineParameterizationPoints, ...chordalSplineJoints, ...chordalSplineSamples],
            curves: [sampleCurve(t => alphaC2SplinePoint(splineParameterizationPoints, SPLINE_ALPHA, t))],
        },
    },
    // bezier-curves, batch 03a. Rotating the four controls by 90 degrees about their mean (3,1) gives (4,-1),(1,0),(2,2),(5,3); the Bézier
    // point at t=1/2 is the rotated old point, so the marker is B_T(1/2) = (9/4, 1), computed from the rotated controls.
    'bezier-curves.affine-transformations.affine': {
        kind: 'highlight', frame: 'affine-quarter-turn-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...rotatedAffineControls, bezierPoint(rotatedAffineControls, MIDPOINT)],
            curves: [sampleCurve(t => bezierPoint(rotatedAffineControls, t))],
        },
    },
    // Degree-3 Bernstein functions b_i^3(t) = C(3,i) t^i (1-t)^(3-i); the board draws them as (t, b_i(t)), sampled at t = 0, 1/2, 1
    // (heights 1/8, 3/8, 3/8, 1/8 at the middle). The scene has no t=1/2 marker, so only the curves are checked.
    'bezier-curves.bernstein-form.bernstein': {
        kind: 'highlight', frame: 'bernstein-calculation-observation', steps: [], expectChange: true,
        checks: {
            curveCount: BERNSTEIN_DEGREE + 1,
            curves: Array.from({length: BERNSTEIN_DEGREE + 1}, (_, i) => sampleCurve(t => [t, bernsteinValue(BERNSTEIN_DEGREE, i, t)] as Vec)),
        },
    },
    // Symmetric cubic at t=1/2: B(1/2) = ((-3,-2) + 3(-3,2) + 3(3,2) + (3,-2)) / 8 = (0,1).
    'bezier-curves.control-points.bezier': {
        kind: 'highlight', frame: 'bezier-evaluation-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...symmetricCubicControlPoints, bezierPoint(symmetricCubicControlPoints, MIDPOINT)],
            curves: [sampleCurve(t => bezierPoint(symmetricCubicControlPoints, t))],
        },
    },
    // The activity card shows the default cubic with polygon and hull, which is the start scene; the prompt's drag is free-form.
    'bezier-curves.geometric-properties.convex-hull': {kind: 'start'},
    // Default quartic at t=1/4: the helper cubics C1 (p0..p3) and C2 (p1..p4) at 1/4, and B(1/4) = 3/4 C1 + 1/4 C2.
    'bezier-curves.interpolation.alternative-recursion': {
        kind: 'highlight', frame: 'da-recursion-quarter-observation', steps: [], expectChange: true,
        checks: {
            points: [...defaultQuarticControlPoints, helperPoint(0), helperPoint(1), bezierPoint(defaultQuarticControlPoints, 0.25)],
            curves: [sampleCurve(t => bezierPoint(defaultQuarticControlPoints, t))],
        },
    },
    // Symmetric cubic at t=1/2: rows (-3,0),(0,2),(3,0); (-3/2,1),(3/2,1); (0,1).
    'bezier-curves.interpolation.decasteljau': {
        kind: 'highlight', frame: 'decasteljau-cubic-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...symmetricCubicControlPoints, ...cubicRows.flat()],
            curves: [sampleCurve(t => bezierPoint(symmetricCubicControlPoints, t))],
        },
    },
    // The activity card is prepared with scheme and full curve at t=1/2, which is the start scene.
    'bezier-curves.interpolation.quartic-interpolation': {kind: 'start'},
    // Activity card: the lesson behind it is a single synthetic step without frames or explore access, so t=1/4 is not reachable
    // with the existing step kinds; the start scene (t=1/2) stays.
    'bezier-curves.parameter.decasteljau-parameter': {kind: 'start'},
    // Elevated curve: five controls Q_i, the same curve (samples B(0), B(1/2), B(1)), and the marker B(3/4).
    'bezier-curves.next-ideas.elevation': {
        kind: 'highlight', frame: 'elevation-analysis-observation', steps: [], expectChange: true,
        checks: {
            points: [...elevatedControls, bezierPoint(elevationCubicControlPoints, 0.75)],
            curves: [sampleCurve(t => bezierPoint(elevationCubicControlPoints, t))],
        },
    },
    // Extrapolated at t=6/5: E(u) = B(6u/5), controls are the blossoms b(0,0,0), b(0,0,6/5), b(0,6/5,6/5), b(6/5,6/5,6/5).
    'bezier-curves.next-ideas.extrapolation': {
        kind: 'highlight', frame: 'ex-extend-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: extrapolatedControls,
            curves: [sampleCurve(t => bezierPoint(extrapolationCubicControlPoints, EXTRAPOLATION_T * t))],
        },
    },
    // Three halvings: 2^3 = 8 pieces; piece k is B on [k/8, (k+1)/8] with its own four controls; the joins B(k/8) are checked as points.
    'bezier-curves.next-ideas.repeated-subdivision': {
        kind: 'highlight', frame: 'rs-eight-pieces-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 8, points: [...rsPieces.map(piece => piece[0]), rsPieces[7][3]],
            curves: rsPieces.map((_, k) => sampleCurve(t => bezierPoint(subdivisionCubicControlPoints, (k + t) / 8))),
        },
    },
    // Cut at t=1/2: L(u) = B(u/2) and R(u) = B((1+u)/2), sharing (0, 3/2). The third visible curve is the graph's orange
    // remainder overlay, rebound to the first piece after the cut: L on [1/2, 1] = B on [1/4, 1/2], so it lies on the curve.
    'bezier-curves.next-ideas.subdivision': {
        kind: 'highlight', frame: 'sd-split-half-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 3, points: [...sdLeft, ...sdRight],
            curves: [sampleCurve(t => bezierPoint(subdivisionCubicControlPoints, t / 2)), sampleCurve(t => bezierPoint(subdivisionCubicControlPoints, (1 + t) / 2))],
        },
    },
    // foundations and rational-curves, batch 03b-A.
    // Stacked areas: four filled outline curves (degree 3), no t marker; each outline is sampled at its parameters 0, 1/2, 1.
    'foundations.reading-bernstein.bernstein': {
        kind: 'highlight', frame: 'bernstein-stacked-area-observation', steps: [], expectChange: true,
        checks: {
            curveCount: STACKED_REGIONS,
            curves: Array.from({length: STACKED_REGIONS}, (_, i) => stackedBernsteinRegionSamples(STACKED_REGIONS, i)),
        },
    },
    // The complex-multiplication card needs the Show product button, which no recipe step can press; the start scene stays.
    'foundations.complex-plane.complex-multiplication': {kind: 'start'},
    // The degree-comparison card is the family card prepared at degree 2 without stacking, which is the start scene.
    'foundations.worked-weight.bernstein.degree-comparison': {kind: 'start'},
    // The circle lesson's first step is the default circle, which is the start scene; no later frame is a better card image.
    'rational-curves.worked-conic.circle': {kind: 'start'},
    // Quadratic (1,2,1) at t=1/2: lifted rows (-2,3/2,3/2),(2,3/2,3/2) project to (-4/3,1),(4/3,1); the end of the scheme is (0,1).
    'rational-curves.homogeneous.rational-decasteljau': {
        kind: 'highlight', frame: 'rational-decasteljau-projection-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: [...rationalQuadraticPoints, ...rationalQuadraticRows.flat()],
            curves: [sampleCurve(t => rationalBezierPoint(rationalQuadraticPoints, rationalQuadraticWeights, t))],
        },
    },
    // Extrapolated at t=6/5: new weights 1, 11/5, 13/25, 143/125; E(u) = R(6u/5), so its last point is R(6/5).
    'rational-curves.investigate-rational.rational-extrapolation': {
        kind: 'highlight', frame: 'rex-example-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: rationalExtrapolated.points,
            curves: [sampleCurve(t => rationalBezierPoint(rationalExtrapolationPoints, rationalWeightsSecondTwo, EXTRAPOLATION_T * t))],
        },
    },
    // Farin points are JSXGraph sliders along the three edges; their positions are not readable from the board, so only the
    // slider count, the four control points and the unchanged curve are checked.
    'rational-curves.operations.farin': {
        kind: 'highlight', frame: 'farin-show-points-observation', steps: [], expectChange: true,
        checks: {
            types: {slider: 3}, curveCount: 1, points: rationalControlPoints,
            curves: [sampleCurve(rationalCurveAt)],
        },
    },
    // One rational elevation: five points with weights 1, 7/4, 3/2, 1, 1; the curve is the same rational curve.
    'rational-curves.operations.rational-elevation': {
        kind: 'highlight', frame: 'rational-elevation-once-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 1, points: rationalElevated.points,
            curves: [sampleCurve(rationalCurveAt)],
        },
    },
    // Cut at t=1/2: left (1,3/2,3/2,11/8), right (11/8,5/4,1,1) sharing R(1/2). Curve count 3 as in the polynomial subdivision:
    // two parts plus the graph's remainder overlay (SubdivisionGraph1).
    'rational-curves.operations.rational-subdivision': {
        kind: 'highlight', frame: 'rsd-half-example-observation', steps: [], expectChange: true,
        checks: {
            curveCount: 3, points: [...rationalLeft.points, ...rationalRight.points],
            curves: [sampleCurve(t => rationalCurveAt(t / 2)), sampleCurve(t => rationalCurveAt((1 + t) / 2))],
        },
    },
    // splines, batch 03b-B. Every frame shows labels and the control polygon; the ratio sliders are React inputs, so `types` is not set.
    // C1: joint J=(0,2) is the midpoint of p1p2; both pieces have derivative (8,0) at J (equal first derivatives), checked in the helper tests.
    'splines.continuity-levels.spline-c1': {
        kind: 'highlight', frame: 'c1-tangent-step-observation', steps: [], expectChange: true,
        checks: {curveCount: 1, points: splineVisiblePoints(c1SplineFreePoints, c1Pieces), curves: [splineCurve(c1Pieces)]},
    },
    // C2: three cubic pieces, joints (-5/2,-1) and (5/2,0); the curve passes through the middle piece's centre (0,-5/4) at t=1/2.
    'splines.continuity-levels.spline-c2': {
        kind: 'highlight', frame: 'c2-joint-step-observation', steps: [], expectChange: true,
        checks: {curveCount: 1, points: splineVisiblePoints(c2SplineFreePoints, c2Pieces), curves: [splineCurve(c2Pieces)]},
    },
    // G1 with b=1: derived point (2,-2) = p2 + b (p2 - p1); both tangents at (0,0) are along (1,-1) with a positive factor.
    'splines.geometric-vs-parametric.spline-g1': {
        kind: 'highlight', frame: 'g1-condition-step-observation', steps: [], expectChange: true,
        checks: {curveCount: 1, points: splineVisiblePoints(g1SplineFreePoints, g1Pieces), curves: [splineCurve(g1Pieces)]},
    },
    // Symmetric G1 at beta_1=1/4: J = 3/4 p1 + 1/4 p2 = (-1,3/2); the tangents are along (2,-1) and the right derivative is 3 times the left.
    'splines.geometric-vs-parametric.spline-g1-symmetric': {
        kind: 'highlight', frame: 'g1s-quarter-observation', steps: [], expectChange: true,
        checks: {curveCount: 1, points: splineVisiblePoints(g1SymmetricSplineFreePoints, g1SymmetricQuarterPieces), curves: [splineCurve(g1SymmetricQuarterPieces)]},
    },
    // Cn (n=2, r=1): derived point q1 = 2 p2 - p1 = (2,-4), the joint p2=(0,-3) is the midpoint of p1 and q1.
    'splines.piecewise.spline-cn': {
        kind: 'highlight', frame: 'cn-extrapolate-observation', steps: [], expectChange: true,
        checks: {curveCount: 1, points: splineVisiblePoints(cnSplineFreePoints, cnPieces), curves: [splineCurve(cnPieces)]},
    },
    // PH cards (batch 04a-3). O(t) = r(t) + d n(t): |O - r| = |d| and (O - r).r' = 0, sampled at 0, 1/2, 1.
    // ph-offsets-observation sets the cubic offset to d=1 itself (r'(1)=(3,4), normal (4,-3)/5).
    'ph-curves.arc-length-problem.ph-cubic-speed': {
        kind: 'highlight', frame: 'ph-offsets-observation', steps: [], expectChange: true, checks: phCubicWithOffset(1),
    },
    // Quintic start scene with its offset switched on at the default distance d=0.2.
    'ph-curves.arc-length-problem.ph-quintic-comparison': {
        kind: 'highlight', frame: 'observe', steps: phOffsetOn, expectChange: true, checks: phQuinticWithOffset(PH_DEFAULT_OFFSET),
    },
    // The kept start scene: no step, board unchanged; the cubic curve and its control points.
    'ph-curves.complex-hodograph.ph-cubic-generator': {
        kind: 'highlight', frame: 'instruction', steps: [], expectChange: false,
        checks: {curveCount: 1, points: phCubicControls, curves: [sampleCurve(t => phPointOf(phCubicFixture, t))]},
    },
    // Cubic offset at d=1 for the length card: the source-length readout belongs to the curve, not to the offset.
    'ph-curves.worked-length.ph-cubic-offset-length': {
        kind: 'highlight', frame: 'observe', steps: phOffsetAt(1), expectChange: true, checks: phCubicWithOffset(1),
    },
    // D10 fallback (ph-singularity-distance.md): no robust self-intersection for the cubic, so start plus the offset at the default distance.
    'ph-curves.investigate-ph.ph-cubic-singularity': {
        kind: 'highlight', frame: 'observe', steps: phOffsetOn, expectChange: true, checks: phCubicWithOffset(PH_DEFAULT_OFFSET),
    },
    // Quintic offset at d=-2.5 (slider range -3..3, step 0.01): the offset crosses itself near t=0.13 and 0.72.
    'ph-curves.investigate-ph.ph-quintic-singularity': {
        kind: 'highlight', frame: 'observe', steps: phOffsetAt(PH_QUINTIC_SELF_INTERSECTION), expectChange: true, checks: phQuinticWithOffset(PH_QUINTIC_SELF_INTERSECTION),
    },
    // arc-more-observation sets n = 10 on sin over [0, pi]: sin graph, polyline and its vertex markers; A = (0, 0) and B = (pi, 0). Chord sum 3,8153 vs arc 3,8202 in the helper tests.
    'functions-and-calculus.applications.arc-length': {
        kind: 'highlight', frame: 'arc-more-observation', steps: [], expectChange: true,
        checks: {curveCount: 3, points: [[0, 0], [Math.PI, 0]], curves: [graphSamples(Math.sin)]},
    },
    // area-difference-observation sets mode between, a = 1, b = 3: f, g and the shaded region; bound points (1, 0), (3, 0). g is not below f there; area 14/3 in the helper tests.
    'functions-and-calculus.applications.area-between-curves': {
        kind: 'highlight', frame: 'area-difference-observation', steps: [], expectChange: false,
        checks: {curveCount: 3, points: [[1, 0], [3, 0]], curves: [graphSamples(areaLessonF), graphSamples(areaLessonG)]},
    },
    // The default scene a = 1 is the first frame (and the one-sided frame): two pieces, hollow point (1, 2) and filled point (1, 1).
    'functions-and-calculus.continuity.continuity': {
        kind: 'highlight', frame: 'continuity-piecewise-explanation', steps: [], expectChange: false,
        checks: {curveCount: 2, points: [[1, 1], [1, 2]]},
    },
    // Secant of x^2 through P = (1, 1) and Q = (2, 4) with the tangent switched on in the Prikaz tab: the tangent y = 2x - 1 joins the parabola.
    'functions-and-calculus.derivatives.derivative': {
        kind: 'highlight', frame: 'derivative-secant-observation', expectChange: true,
        steps: [{kind: 'explore'}, {kind: 'select-tab', tab: 'display'}, {kind: 'set-control', control: 'checkbox', label: 'Prikaži tangento (natančna mejna premica)', value: true}],
        checks: {curveCount: 2, points: [[1, 1], [2, 4]], curves: [graphSamples(x => x * x), graphSamples(x => 2 * x - 1)]},
    },
    // The default base a = 2 is the first frame: the graph of 2^x through (0, 1) and (1, 2); the mirror is off.
    'functions-and-calculus.function-rules.exponential-function': {
        kind: 'highlight', frame: 'exponential-fixed-points-explanation', steps: [], expectChange: false,
        checks: {curveCount: 1, points: [[0, 1], [1, 2]], curves: [graphSamples(exponentialBaseTwo)]},
    },
    // The default points (0, 1) and (2, 5) are the first frame: the line y = 2x + 1, the point (0, n) on P1, and the two legs of the slope triangle.
    'functions-and-calculus.function-rules.linear-function': {
        kind: 'highlight', frame: 'linear-line-through-points-explanation', steps: [], expectChange: false,
        checks: {types: {point: 3, line: 1, segment: 2}, points: [[0, 1], [2, 5]]},
    },
    // trig-period-shift-observation sets A = 2, omega = 2, phi = pi/2, B = 1: the midline y = 1 and 2 sin(2x + pi/2) + 1.
    'functions-and-calculus.function-rules.trigonometric-functions': {
        kind: 'highlight', frame: 'trig-period-shift-observation', steps: [], expectChange: true,
        checks: {curveCount: 2, curves: [graphSamples(() => trigWorked.B), graphSamples(x => trigValue(trigWorked, x))]},
    },
    // accumulation-reveal-observation shows A for sin from a = 0 to x = 2: f, A, the tangent to A, the shaded region; f(2), A(2), a and x are points.
    'functions-and-calculus.integrals.accumulation': {
        kind: 'highlight', frame: 'accumulation-reveal-observation', steps: [], expectChange: true,
        checks: {curveCount: 4, points: [[0, 0], [2, 0], [2, Math.sin(2)], [2, 1 - Math.cos(2)]], curves: [graphSamples(Math.sin), graphSamples(x => 1 - Math.cos(x))]},
    },
    // The default x^2 on [0, 2] with four left rectangles is the first frame: the parabola and the rectangle outline; bound points (0, 0), (2, 0).
    'functions-and-calculus.integrals.definite-integral': {
        kind: 'highlight', frame: 'integral-area-explanation', steps: [], expectChange: false,
        checks: {curveCount: 2, points: [[0, 0], [2, 0]], curves: [graphSamples(x => x * x)]},
    },
    // The worked-join family card is the prepared parabola join scene ('worked-parabola-join'); it has no lesson frame, so it stays the start scene.
    'splines.worked-join.spline-c1.parabola-derivatives': {kind: 'start'},
};
