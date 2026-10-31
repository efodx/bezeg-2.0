import type {DemonstrationId} from '../demonstrations';
import {BISECTION_EXAMPLE_IDS} from '../analysis/bisection';
import {MEAN_VALUE_EXAMPLE_IDS} from '../analysis/meanValue';
import {FUNCTION_IDS} from '../analysis/functions';
import {DARBOUX_EXAMPLE_IDS} from '../analysis/darboux';
import {EXTREMA_EXAMPLE_IDS} from '../analysis/extrema';
import {CONVEXITY_EXAMPLE_IDS} from '../analysis/convexity';
import {TAYLOR_EXAMPLE_IDS} from '../analysis/taylor';
import {SEQUENCE_EXAMPLE_IDS} from '../analysis/sequence';
import {FIXED_POINT_EXAMPLE_IDS} from '../analysis/fixedPoint';
import {UNIFORM_EXAMPLE_IDS} from '../analysis/uniformConvergence';
import {COMPLEX_EXAMPLE_IDS} from '../analysis/complex';

export type LessonLanguage = 'sl' | 'en';

export type LocalizedText = Readonly<Record<LessonLanguage, string>>;

/** Closed set of function-demonstration parameters; each concept extends it only with the names it owns. */
export const FUNCTION_PARAMETER_NAMES = ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b', 'mvt-a', 'mvt-b', 'mvt-c', 'accum-a', 'accum-x', 'darboux-a', 'darboux-b', 'darboux-n', 'extrema-a', 'extrema-b', 'convexity-a', 'convexity-b', 'convexity-t', 'taylor-center', 'taylor-degree', 'taylor-x', 'sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'fixed-point-x0', 'fixed-point-digits', 'uniform-r', 'uniform-n', 'uniform-x', 'uniform-epsilon', 'complex-z-re', 'complex-z-im', 'complex-w-re', 'complex-w-im', 'complex-w-modulus', 'complex-w-argument'] as const;
export type FunctionParameterName = typeof FUNCTION_PARAMETER_NAMES[number];

/** Closed set of optional function-demonstration elements a lesson can show or hide. */
export const FUNCTION_VISIBILITY_TARGETS = ['mirror', 'reference', 'tangent', 'matching-points', 'accumulation-curve', 'lower-sum', 'upper-sum', 'extrema-classification', 'second-derivative', 'taylor-bound', 'sequence-certificate', 'fixed-point-bound', 'uniform-supremum', 'complex-product', 'complex-arguments'] as const;
export type FunctionVisibilityTarget = typeof FUNCTION_VISIBILITY_TARGETS[number];

/** Closed set of named function choices and, per name, the values a lesson may select (the graph decides what each value means). */
const functionChoiceValues = {
    'trig-function': ['sin', 'cos', 'tan'],
    'derivative-function': ['square', 'sin', 'exp'],
    'integral-function': ['square', 'sin', 'exp'],
    'sum-method': ['left', 'right', 'midpoint', 'trapezoid'],
    'area-mode': ['under-f', 'under-g', 'between'],
    'bisection-example': BISECTION_EXAMPLE_IDS,
    'mean-value-example': MEAN_VALUE_EXAMPLE_IDS,
    'accumulation-function': FUNCTION_IDS,
    'darboux-example': DARBOUX_EXAMPLE_IDS,
    'extrema-example': EXTREMA_EXAMPLE_IDS,
    'convexity-example': CONVEXITY_EXAMPLE_IDS,
    'taylor-example': TAYLOR_EXAMPLE_IDS,
    'sequence-example': SEQUENCE_EXAMPLE_IDS,
    'fixed-point-example': FIXED_POINT_EXAMPLE_IDS,
    'uniform-example': UNIFORM_EXAMPLE_IDS,
    'complex-example': COMPLEX_EXAMPLE_IDS,
} satisfies Record<string, readonly string[]>;
export type FunctionChoiceName = keyof typeof functionChoiceValues;
export const FUNCTION_CHOICE_VALUES: Readonly<Record<FunctionChoiceName, readonly string[]>> = functionChoiceValues;
export const FUNCTION_CHOICE_NAMES = Object.keys(functionChoiceValues) as FunctionChoiceName[];

/** The curve overlays a lesson can show or hide on a curve demonstration. */
export const CURVE_VISIBILITY_TARGETS = ['control-polygon', 'convex-hull', 'decasteljau-scheme', 'decasteljau-full-curve', 'ph-control-polygon', 'offset-curve', 'weights'] as const;
export type CurveVisibilityTarget = typeof CURVE_VISIBILITY_TARGETS[number];

/** The visibility switches a lesson can address on a surface (patch) demonstration. */
export const PATCH_VISIBILITY_TARGETS = ['control-net', 'iso-curves', 'boundary-curves', 'decasteljau-scheme', 'tangent-plane', 'normal', 'twist', 'shading'] as const;
export type PatchVisibilityTarget = typeof PATCH_VISIBILITY_TARGETS[number];

/** The named 3D camera views of a surface demonstration. */
export const CAMERA_PRESET_NAMES = ['front', 'top', 'side', 'isometric'] as const;
export type CameraPresetName = typeof CAMERA_PRESET_NAMES[number];

/**
 * Closed set of animations a lesson can drive. `decasteljau` is the frame animation of the De Casteljau parameter;
 * `bisection` is the first iterative playback and `sequence` reveals the terms of a sequence one by one and `fixed-point` the iterates of a fixed-point iteration. A graph registers only the ids it owns and the commands each supports;
 * the registry rejects the rest with `UnsupportedLessonActionError`.
 */
export const LESSON_ANIMATION_IDS = ['decasteljau', 'bisection', 'sequence', 'fixed-point', 'patch-u-sweep', 'patch-v-sweep'] as const;
export type LessonAnimationId = typeof LESSON_ANIMATION_IDS[number];

/**
 * Closed animation command vocabulary. `next-step` runs one iteration transition and `reset` returns an iterative
 * playback to its initial state; frame animations such as `decasteljau` use only `play`, `pause`, `replay` and `stop`.
 */
export const LESSON_ANIMATION_COMMANDS = ['play', 'pause', 'replay', 'stop', 'next-step', 'reset'] as const;
export type LessonAnimationCommand = typeof LESSON_ANIMATION_COMMANDS[number];

export type LessonPoint = readonly [x: number, y: number];

/** A view as JSXGraph bounding box: left, top, right, bottom in user coordinates. */
export type LessonViewBox = readonly [left: number, top: number, right: number, bottom: number];

/**
 * Lesson-specific geometry of a curve demonstration's single curve. The graph keeps its default scene's curve type and
 * display state and replaces only the given inputs: control points, rational weights, the PH generating point
 * (`points`, one point) with its hodograph points, generic spline degree/continuity, or G1 spline junction ratios.
 * Free-exploration defaults and stored Presets are unaffected; the graph rejects inputs its Preset collection rejects.
 */
export interface LessonCurveFixture {
    readonly points: readonly LessonPoint[];
    readonly weights?: readonly number[];
    readonly hodographs?: readonly LessonPoint[];
    readonly degree?: number;
    readonly continuity?: number;
    readonly splineRatios?: readonly number[];
}

/** A point in the 3D scene of a surface (patch) demonstration. */
export interface LessonPoint3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/**
 * The control net of a lesson patch, degrees 1 to 4. Tensor nets are row-major, `(m + 1) * (n + 1)` points with `b_ij`
 * at `i * (n + 1) + j`; triangular nets list `(n + 1)(n + 2) / 2` points in the graph's canonical order. The graph
 * rejects nets its Preset collection rejects, and a fixture of the other kind than the graph's own.
 */
export type LessonPatchFixture =
    | {readonly kind: 'tensor'; readonly m: number; readonly n: number; readonly net: readonly LessonPoint3[]}
    | {readonly kind: 'triangular'; readonly n: number; readonly net: readonly LessonPoint3[]};

/** A surface demonstration's camera (radians); elevation and distance are clamped like the user's own camera. */
export interface LessonView3D {
    readonly az: number;
    readonly el: number;
    readonly distance: number;
    readonly target?: LessonPoint3;
    readonly projection?: 'perspective';
}

/**
 * The one lesson action vocabulary (ADR 0002, ADR 0013). Lesson content authors these values directly in a scene's
 * `actions`, so a misspelled kind or parameter fails typecheck. A graph registers the kinds it supports in its
 * `LessonActionRegistry` and the registry rejects the rest with `UnsupportedLessonActionError`.
 *
 * Value ranges are not stated in the type: the graph that applies an action defines and enforces its limits, and
 * `sceneContentAgainstGraphs.test.tsx` applies every scene and Chapter activity to the real graph of its
 * Demonstration, so out-of-range content fails a test.
 */
export type LessonAction =
    /** Function graphs' synchronous parameter model; the graph enforces its own domain per name. */
    | {readonly kind: 'function-parameter'; readonly name: FunctionParameterName; readonly value: number}
    /** Function graphs' optional elements (mirror, tangent, sums and so on). */
    | {readonly kind: 'function-visibility'; readonly target: FunctionVisibilityTarget; readonly visible: boolean}
    /** Function graphs' named choices; `value` is one of `FUNCTION_CHOICE_VALUES[name]` and the graph maps it. */
    | {readonly kind: 'function-choice'; readonly name: FunctionChoiceName; readonly value: string}
    /** `view` sets the starting view, otherwise the default scene's own view handling applies. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'demonstration-default'; readonly view?: LessonViewBox}
    /** The default scene with the fixture's geometry; `view` sets the starting view, otherwise the current view stays. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'lesson-fixture'; readonly curve: LessonCurveFixture; readonly view?: LessonViewBox}
    /** The patch graph's default scene with the fixture's net; `view3d` sets the camera, otherwise the default camera applies. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'lesson-patch-fixture'; readonly patch: LessonPatchFixture; readonly view3d?: LessonView3D; readonly view?: undefined}
    /**
     * Shows or hides a curve overlay on the curve-owning graph: `control-polygon`, `convex-hull`, `weights` (the rational
     * weights display), `decasteljau-scheme` (the current De Casteljau construction), `decasteljau-full-curve`,
     * `ph-control-polygon` and `offset-curve` (the PH offset curve).
     */
    | {readonly kind: 'curve-visibility'; readonly target: CurveVisibilityTarget; readonly visible: boolean}
    /** Shows the curve-owned evaluation marker at the curve parameter. */
    | {readonly kind: 'curve-evaluation'; readonly parameter: number}
    /** Surface graphs' evaluation point: `u` and `v` in [0, 1] on a tensor patch, barycentric `u`, `v`, `w` on a triangular one. */
    | {readonly kind: 'patch-evaluation'; readonly u: number; readonly v: number; readonly w?: number}
    /** Surface graphs' visibility switches; a graph without that switch reports the action unsupported. */
    | {readonly kind: 'patch-visibility'; readonly target: PatchVisibilityTarget; readonly visible: boolean}
    /** The patch split: `direction` and `value` for a tensor patch, neither for a triangular one (its fixed three-piece preview). */
    | {readonly kind: 'patch-subdivide'; readonly direction?: 'u' | 'v'; readonly value?: number}
    /** Exact patch degree elevation: `direction` for a tensor patch, none for a triangular one. */
    | {readonly kind: 'patch-elevate'; readonly direction?: 'u' | 'v'}
    /** A named 3D camera view. */
    | {readonly kind: 'camera-preset'; readonly view: CameraPresetName}
    | {readonly kind: 'patch-join-scene'; readonly scene: 'join-c1' | 'join-g1' | 'join-c0-kink' | 'join-teapot'; readonly view3d?: LessonView3D}
    | {readonly kind: 'patch-join-mode'; readonly mode: 'c0' | 'c1' | 'g1'; readonly alpha?: number}
    | {readonly kind: 'patch-tensor-comparison'; readonly visible: boolean}
    /** ElevationGraph's graph-owned degree elevation operation. */
    | {readonly kind: 'degree-elevation'}
    /** AffineTransformBezierCurveGraph's graph-owned operations with a numeric amount (a translation, scale factor or angle). */
    | {readonly kind: 'affine-transform'; readonly operation: 'translate-x' | 'translate-y' | 'scale' | 'rotate'; readonly value: number}
    /** AffineTransformBezierCurveGraph's reflections, which take no amount. */
    | {readonly kind: 'affine-transform'; readonly operation: 'reflect-x' | 'reflect-y'}
    /** `t` is the De Casteljau parameter (AbstractJXGBezierCurve.setDecasteljauT); `offset-distance` is the PH offset distance (JXGPHBezierCurve.setOffsetCurveDistance). */
    | {readonly kind: 'parameter'; readonly name: 't' | 'offset-distance'; readonly value: number}
    /** BernsteinGraph's graph-owned degree action (an integer; BERNSTEIN_MAX_DEGREE bounds it). */
    | {readonly kind: 'bernstein-degree'; readonly degree: number}
    /** BernsteinGraph's graph-owned stacked-area view. */
    | {readonly kind: 'bernstein-stacked-area'; readonly visible: boolean}
    /** AlphaParam and UniformParam parameterization: a number alpha (the target graph enforces its bounds). */
    | {readonly kind: 'parameterization-alpha'; readonly value: number}
    /** The parameterization sample count, an integer whose bounds differ by route (the target graph enforces them). */
    | {readonly kind: 'parameterization-samples'; readonly count: number}
    | {readonly kind: 'parameterization-mode'; readonly mode: 'weighted' | 'uniform'}
    /** SubdivisionGraph1 (and rational) parameter t, within SUBDIVISION_T_MIN..MAX. */
    | {readonly kind: 'subdivision-parameter'; readonly value: number}
    /** One split; on repeated-subdivision it is one halving step (at most 5). */
    | {readonly kind: 'subdivide'}
    /** ExtrapolationGraph (and rational) parameter t, within EXTRAPOLATION_T_MIN..MAX. */
    | {readonly kind: 'extrapolation-parameter'; readonly value: number}
    | {readonly kind: 'extrapolate'}
    /** OneSidedCnSplineGraph continuity r (an integer; route bounds are enforced by the graph). */
    | {readonly kind: 'spline-continuity'; readonly value: number}
    /** OneSidedCnSplineGraph degree n (an integer; route bounds are enforced by the graph). */
    | {readonly kind: 'spline-degree'; readonly value: number}
    /** G1 spline graphs' b/beta slider: `index` is a non-negative integer, the range of `value` is enforced by the graph. */
    | {readonly kind: 'spline-beta'; readonly index: number; readonly value: number}
    /** Spline graphs' point-label display switch. */
    | {readonly kind: 'spline-label-points'; readonly visible: boolean}
    /** Spline graphs' fixed-point display switch; `hidden` is true to hide them. */
    | {readonly kind: 'spline-hide-fixed'; readonly hidden: boolean}
    /** FarinPointsCurveGraph's Farin point display. */
    | {readonly kind: 'farin-points'; readonly visible: boolean}
    /** FarinPointsCurveGraph's standard-form switch. */
    | {readonly kind: 'standard-form'; readonly enabled: boolean}
    /** FarinPointsCurveGraph's weight vector: one positive finite weight per control point. */
    | {readonly kind: 'rational-weights'; readonly weights: readonly number[]}
    /** RationalBezierCurveCircleGraphN's piece counter (an integer; route bounds are enforced by the graph). */
    | {readonly kind: 'circle-pieces'; readonly count: number}
    /**
     * Drives a graph-owned animation. `next-step` runs one iteration transition and `reset` returns an iterative
     * playback (`bisection`, `sequence`, `fixed-point`) to its initial state; a scene repeats `next-step` once per step
     * it shows. Play and pause are not scene actions there: playback is initially stopped and under the learner's
     * control. The patch sweeps and `decasteljau` take `play`, `pause`, `replay` and `stop`.
     */
    | {readonly kind: 'animation'; readonly animationId: LessonAnimationId; readonly command: LessonAnimationCommand};

export type LessonFrameKind = 'explanation' | 'calculation' | 'observation';

export interface LessonAnimation {
    readonly animationId: LessonAnimationId;
}

export interface LessonScene {
    readonly actions: readonly LessonAction[];
}

export interface LessonStepAction {
    readonly label: LocalizedText;
    readonly action: LessonAction;
}

export interface LessonWorkedExample {
    readonly title: LocalizedText;
    readonly calculation: LocalizedText;
    readonly result: LocalizedText;
    readonly check: LocalizedText;
}

export interface LessonFrame {
    readonly id: string;
    readonly kind: LessonFrameKind;
    readonly title: LocalizedText;
    readonly body?: LocalizedText;
    readonly notation?: readonly LocalizedText[];
    readonly workedExample?: LessonWorkedExample;
    readonly prompt?: LocalizedText;
    readonly animation?: LessonAnimation;
    readonly action?: LessonStepAction;
}

export interface LessonStep {
    readonly id: string;
    readonly title: LocalizedText;
    readonly body: LocalizedText;
    readonly notation?: readonly LocalizedText[];
    readonly workedExample?: LessonWorkedExample;
    readonly prompt?: LocalizedText;
    readonly frames?: readonly LessonFrame[];
    readonly scene?: LessonScene;
    readonly action?: LessonStepAction;
}

/** Keeps the runtime compatible with small lesson fixtures while pilots use explicit frames. */
export function framesForLessonStep(step: LessonStep): readonly LessonFrame[] {
    if (step.frames && step.frames.length > 0) return step.frames;
    return [{
        id: `${step.id}-content`,
        kind: 'explanation',
        title: step.title,
        body: step.body,
        notation: step.notation,
        workedExample: step.workedExample,
        prompt: step.prompt,
        action: step.action,
    }];
}

export interface LessonDefinition {
    readonly id: string;
    readonly demonstrationId: DemonstrationId;
    readonly title: LocalizedText;
    readonly summary: LocalizedText;
    readonly steps: readonly LessonStep[];
}

/** Opaque graph-owned state. Lesson code must not depend on JSXGraph or Preset DTOs. */
export interface LessonSceneCheckpoint {
    readonly version: 1;
    readonly value: unknown;
}

export interface LessonGraphCapabilities {
    captureState(): LessonSceneCheckpoint;
    restoreState(checkpoint: LessonSceneCheckpoint): void;
    apply(action: LessonAction): void;
    /** Cancels graph-owned transient work before lesson state is restored or replaced. */
    stopAnimations?(): void;
    /** Pauses transient playback at its current value when a settled snapshot is required. */
    pauseAnimations?(): void;
    /** Returns false when the owning graph has already been disposed. */
    isAvailable?(): boolean;
}

export class UnsupportedLessonActionError extends Error {
    constructor(readonly action: LessonAction) {
        super(`This demonstration does not support lesson action “${action.kind}”.`);
        this.name = 'UnsupportedLessonActionError';
    }
}
