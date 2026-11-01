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
import {affineLessonControlPoints, bernsteinValue, bezierPoint, bezierSegmentControls, decasteljauRows, defaultQuarticControlPoints,
    elevationCubicControlPoints, extrapolationCubicControlPoints, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint,
    rationalBezierPoint, rationalControlPoints, rationalWeightsSecondTwo, rotateAboutMean, sampleCurve, subdivisionCubicControlPoints,
    symmetricCubicControlPoints, weightedKnotControlPoints, weightedWarp} from './guidedExampleHighlightExpectations';
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
};
