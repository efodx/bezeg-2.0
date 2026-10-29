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
export type FunctionParameterName = 'x1' | 'y1' | 'x2' | 'y2' | 'k' | 'n' | 'a' | 'A' | 'omega' | 'phi' | 'B' | 'x0' | 'h' | 'b' | 'bisect-a' | 'bisect-b' | 'mvt-a' | 'mvt-b' | 'mvt-c' | 'accum-a' | 'accum-x' | 'darboux-a' | 'darboux-b' | 'darboux-n' | 'extrema-a' | 'extrema-b' | 'convexity-a' | 'convexity-b' | 'convexity-t' | 'taylor-center' | 'taylor-degree' | 'taylor-x' | 'sequence-epsilon' | 'sequence-limit' | 'sequence-threshold' | 'fixed-point-x0' | 'fixed-point-digits' | 'uniform-r' | 'uniform-n' | 'uniform-x' | 'uniform-epsilon' | 'complex-z-re' | 'complex-z-im' | 'complex-w-re' | 'complex-w-im' | 'complex-w-modulus' | 'complex-w-argument';
export const FUNCTION_PARAMETER_NAMES: readonly FunctionParameterName[] = ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b', 'mvt-a', 'mvt-b', 'mvt-c', 'accum-a', 'accum-x', 'darboux-a', 'darboux-b', 'darboux-n', 'extrema-a', 'extrema-b', 'convexity-a', 'convexity-b', 'convexity-t', 'taylor-center', 'taylor-degree', 'taylor-x', 'sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'fixed-point-x0', 'fixed-point-digits', 'uniform-r', 'uniform-n', 'uniform-x', 'uniform-epsilon', 'complex-z-re', 'complex-z-im', 'complex-w-re', 'complex-w-im', 'complex-w-modulus', 'complex-w-argument'];

/** Closed set of optional function-demonstration elements a lesson can show or hide. */
export type FunctionVisibilityTarget = 'mirror' | 'reference' | 'tangent' | 'matching-points' | 'accumulation-curve' | 'lower-sum' | 'upper-sum' | 'extrema-classification' | 'second-derivative' | 'taylor-bound' | 'sequence-certificate' | 'fixed-point-bound' | 'uniform-supremum' | 'complex-product' | 'complex-arguments';
export const FUNCTION_VISIBILITY_TARGETS: readonly FunctionVisibilityTarget[] = ['mirror', 'reference', 'tangent', 'matching-points', 'accumulation-curve', 'lower-sum', 'upper-sum', 'extrema-classification', 'second-derivative', 'taylor-bound', 'sequence-certificate', 'fixed-point-bound', 'uniform-supremum', 'complex-product', 'complex-arguments'];

/** Closed set of named function choices and, per name, the values a lesson may select (the graph decides what each value means). */
export type FunctionChoiceName = 'trig-function' | 'derivative-function' | 'integral-function' | 'sum-method' | 'area-mode' | 'bisection-example' | 'mean-value-example' | 'accumulation-function' | 'darboux-example' | 'extrema-example' | 'convexity-example' | 'taylor-example' | 'sequence-example' | 'fixed-point-example' | 'uniform-example' | 'complex-example';
export const FUNCTION_CHOICE_VALUES: Readonly<Record<FunctionChoiceName, readonly string[]>> = {
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
};
export const FUNCTION_CHOICE_NAMES = Object.keys(FUNCTION_CHOICE_VALUES) as FunctionChoiceName[];

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

export type LessonAction =
    | {readonly kind: 'function-parameter'; readonly name: FunctionParameterName; readonly value: number}
    | {readonly kind: 'function-visibility'; readonly target: FunctionVisibilityTarget; readonly visible: boolean}
    | {readonly kind: 'function-choice'; readonly name: FunctionChoiceName; readonly value: string}
    /** `view` sets the starting view, otherwise the default scene's own view handling applies. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'demonstration-default'; readonly view?: LessonViewBox}
    /** The default scene with the fixture's geometry; `view` sets the starting view, otherwise the current view stays. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'lesson-fixture'; readonly curve: LessonCurveFixture; readonly view?: LessonViewBox}
    /** The patch graph's default scene with the fixture's net; `view3d` sets the camera, otherwise the default camera applies. */
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'lesson-patch-fixture'; readonly patch: LessonPatchFixture; readonly view3d?: LessonView3D; readonly view?: undefined}
    | {readonly kind: 'curve-visibility'; readonly target: 'control-polygon' | 'convex-hull' | 'decasteljau-scheme' | 'decasteljau-full-curve' | 'ph-control-polygon' | 'offset-curve' | 'weights'; readonly visible: boolean}
    | {readonly kind: 'curve-evaluation'; readonly parameter: number}
    | {readonly kind: 'patch-evaluation'; readonly u: number; readonly v: number; readonly w?: number}
    | {readonly kind: 'patch-visibility'; readonly target: 'control-net' | 'iso-curves' | 'boundary-curves' | 'decasteljau-scheme' | 'tangent-plane' | 'normal' | 'twist' | 'shading'; readonly visible: boolean}
    | {readonly kind: 'patch-subdivide'; readonly direction?: 'u' | 'v'; readonly value?: number}
    | {readonly kind: 'patch-elevate'; readonly direction?: 'u' | 'v'}
    | {readonly kind: 'camera-preset'; readonly view: 'front' | 'top' | 'side' | 'isometric'}

    | {readonly kind: 'degree-elevation'}
    | {readonly kind: 'affine-transform'; readonly operation: 'translate-x' | 'translate-y' | 'scale' | 'rotate'; readonly value: number}
    | {readonly kind: 'affine-transform'; readonly operation: 'reflect-x' | 'reflect-y'}
    | {readonly kind: 'parameter'; readonly name: 't' | 'offset-distance'; readonly value: number}
    | {readonly kind: 'bernstein-degree'; readonly degree: number}
    | {readonly kind: 'bernstein-stacked-area'; readonly visible: boolean}
    | {readonly kind: 'parameterization-alpha'; readonly value: number}
    | {readonly kind: 'parameterization-samples'; readonly count: number}
    | {readonly kind: 'parameterization-mode'; readonly mode: 'weighted' | 'uniform'}
    | {readonly kind: 'subdivision-parameter'; readonly value: number}
    | {readonly kind: 'subdivide'}
    | {readonly kind: 'extrapolation-parameter'; readonly value: number}
    | {readonly kind: 'extrapolate'}
    | {readonly kind: 'spline-continuity'; readonly value: number}
    | {readonly kind: 'spline-degree'; readonly value: number}
    | {readonly kind: 'spline-beta'; readonly index: number; readonly value: number}
    | {readonly kind: 'spline-label-points'; readonly visible: boolean}
    | {readonly kind: 'spline-hide-fixed'; readonly hidden: boolean}
    | {readonly kind: 'farin-points'; readonly visible: boolean}
    | {readonly kind: 'standard-form'; readonly enabled: boolean}
    | {readonly kind: 'rational-weights'; readonly weights: readonly number[]}
    | {readonly kind: 'circle-pieces'; readonly count: number}
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
