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
import {bezierPoint, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint, rationalBezierPoint, rationalControlPoints,
    rationalWeightsSecondTwo, sampleCurve, weightedKnotControlPoints, weightedWarp} from './guidedExampleHighlightExpectations';

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
};
