import type {DemonstrationId} from '../demonstrations';
import type {SystemId} from '../dynamics/systems2';
import type {HullAlgorithm} from '../graphs/compgeo/hullTraceRun';
import type {CrossRatioExampleId} from '../graphs/projective/crossRatioModel';
import type {SimsonExampleId, SimsonOffset} from '../compgeo/simsonLineModel';
import type {InversionExampleId} from '../compgeo/inversionModel';
import type {InversionFocus} from '../graphs/compgeo/inversionPresetCollection';
import type {PascalConicId, PascalExampleId, PascalOrderId} from '../graphs/projective/pascalModel';
import type {FivePointExampleId} from '../graphs/projective/fivePointModel';
import type {PolePolarConicId, PolePolarExampleId} from '../graphs/projective/polePolarModel';
import type {ParametricCurveId} from '../graphs/curves/parametric/parametricCatalogue';
import {BISECTION_EXAMPLE_IDS} from '../analysis/bisection';
import {EPICYCLE_EXAMPLE_IDS, EPICYCLE_PARAMETRIZATIONS} from '../analysis/epicycleModel';
import {ROOT_FINDING_EXAMPLE_IDS} from '../analysis/rootFinding';
import {ROOT_FINDING_METHODS} from '../analysis/rootFindingModel';
import {DENSITY_EXAMPLE_IDS} from '../analysis/densityAreaModel';
import {BINOMIAL_CORRECTION_CHOICES, BINOMIAL_NORMAL_EXAMPLE_IDS} from '../analysis/binomialNormalModel';
import {CLT_EXAMPLE_IDS} from '../analysis/cltModel';
import {SUMMARY_EXAMPLE_IDS, SUMMARY_RULES, SUMMARY_SIGMAS} from '../analysis/summaryStatisticsModel';
import {CORRELATION_EXAMPLE_IDS} from '../analysis/correlationModel';
import {QUADRATURE_RULES} from '../analysis/quadratureModel';
import {EULER_EXAMPLE_IDS, STEP_SIZES} from '../analysis/odeEuler';
import {TRANSFORM_BASE_IDS} from '../analysis/functionTransformationModel';
import {INVERSE_RESTRICTION_IDS} from '../analysis/functionInverseModel';
import {POLYNOMIAL_EXAMPLE_IDS} from '../analysis/polynomialZerosModel';
import {SERIES_EXAMPLE_IDS} from '../analysis/geometricSeriesModel';
import {CONIC_EXAMPLE_IDS} from '../analysis/conicFocalModel';
import {RATIONAL_EXAMPLE_IDS} from '../analysis/rationalFunctionModel';
import {FOURIER_SERIES_EXAMPLE_IDS} from '../analysis/fourierSeriesModel';
import {FOURIER_COEFFICIENT_TERMS, FOURIER_COEFFICIENTS_LAYOUTS, FOURIER_COEFFICIENTS_VIEWS, FOURIER_DECAY_SCALES} from '../analysis/fourierCoefficientsModel';
import {FOURIER_EXAMPLE_IDS} from '../analysis/fourierExamples';
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
import {COMPLEX_RECIPROCAL_EXAMPLE_IDS} from '../analysis/complexReciprocalModel';
import {COMPLEX_ROOTS_EXAMPLE_IDS} from '../analysis/complexRootsModel';
import type {LinearMapExampleId, Mat2} from '../linear/matrix2';
import type {LinearMapMode, MatrixSlot} from '../linear/linearMapModel';
import type {PointSetOverlayName} from '../compgeo/pointSetModel';

export type LessonLanguage = 'sl' | 'en';

export type LocalizedText = Readonly<Record<LessonLanguage, string>>;

/** Closed set of function-demonstration parameters; each concept extends it only with the names it owns. */
export const FUNCTION_PARAMETER_NAMES = ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b', 'mvt-a', 'mvt-b', 'mvt-c', 'accum-a', 'accum-x', 'darboux-a', 'darboux-b', 'darboux-n', 'extrema-a', 'extrema-b', 'convexity-a', 'convexity-b', 'convexity-t', 'taylor-center', 'taylor-degree', 'taylor-x', 'sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'fixed-point-x0', 'fixed-point-digits', 'root-x0', 'root-x1', 'quadrature-a', 'quadrature-b', 'quadrature-n', 'euler-x0', 'euler-y0', 'euler-end', 'transform-a', 'transform-b', 'transform-c', 'transform-d', 'transform-u', 'poly-zero-1', 'poly-zero-2', 'poly-zero-3', 'poly-zero-4', 'poly-zero-5', 'rational-numerator-1', 'rational-numerator-2', 'rational-denominator-1', 'rational-denominator-2', 'rational-probe', 'series-a', 'series-q', 'series-n', 'series-tolerance', 'conic-weight', 'inverse-base', 'inverse-x0', 'fourier-n', 'fourier-x', 'fourier-epsilon', 'fourier-handle-0', 'fourier-handle-1', 'fourier-handle-2', 'fourier-handle-3', 'fourier-handle-4', 'fourier-order', 'fourier-harmonic', /* fourier-order below the selected harmonic is rejected: a scene lowers fourier-harmonic first */ 'uniform-r', 'uniform-n', 'uniform-x', 'uniform-epsilon', 'complex-z-re', 'complex-z-im', 'complex-w-re', 'complex-w-im', 'complex-w-modulus', 'complex-w-argument', 'complex-centre-re', 'complex-centre-im', 'complex-radius', 'density-mu', 'density-sigma', 'density-a', 'density-b', 'binomial-n', 'binomial-p', 'binomial-k', 'clt-n', 'epicycle-n', 'epicycle-time', 'epicycle-vertex-0-x', 'epicycle-vertex-0-y', 'epicycle-control-0-1-x', 'epicycle-control-0-1-y', 'epicycle-control-0-2-x', 'epicycle-control-0-2-y', 'epicycle-vertex-1-x', 'epicycle-vertex-1-y', 'epicycle-control-1-1-x', 'epicycle-control-1-1-y', 'epicycle-control-1-2-x', 'epicycle-control-1-2-y', 'epicycle-vertex-2-x', 'epicycle-vertex-2-y', 'epicycle-control-2-1-x', 'epicycle-control-2-1-y', 'epicycle-control-2-2-x', 'epicycle-control-2-2-y', 'epicycle-vertex-3-x', 'epicycle-vertex-3-y', 'epicycle-control-3-1-x', 'epicycle-control-3-1-y', 'epicycle-control-3-2-x', 'epicycle-control-3-2-y', 'epicycle-vertex-4-x', 'epicycle-vertex-4-y', 'epicycle-control-4-1-x', 'epicycle-control-4-1-y', 'epicycle-control-4-2-x', 'epicycle-control-4-2-y', 'epicycle-vertex-5-x', 'epicycle-vertex-5-y', 'epicycle-control-5-1-x', 'epicycle-control-5-1-y', 'epicycle-control-5-2-x', 'epicycle-control-5-2-y', 'epicycle-vertex-6-x', 'epicycle-vertex-6-y', 'epicycle-control-6-1-x', 'epicycle-control-6-1-y', 'epicycle-control-6-2-x', 'epicycle-control-6-2-y', 'epicycle-vertex-7-x', 'epicycle-vertex-7-y', 'epicycle-control-7-1-x', 'epicycle-control-7-1-y', 'epicycle-control-7-2-x', 'epicycle-control-7-2-y'] as const;
export type FunctionParameterName = typeof FUNCTION_PARAMETER_NAMES[number];

/** Closed set of optional function-demonstration elements a lesson can show or hide. */
export const FUNCTION_VISIBILITY_TARGETS = ['mirror', 'reference', 'tangent', 'matching-points', 'accumulation-curve', 'lower-sum', 'upper-sum', 'extrema-classification', 'second-derivative', 'taylor-bound', 'sequence-certificate', 'fixed-point-bound', 'uniform-supremum', 'complex-product', 'complex-arguments', 'complex-reciprocal', 'complex-quotient', 'complex-circle', 'complex-roots', 'complex-polygon', 'complex-test', 'inverse-curve', 'polynomial-derivative', 'poisson-bars', 'clt-cdf', 'summary-box-plot', 'summary-sigma-band', 'correlation-residuals', 'correlation-x-on-y', 'fourier-partial-sum', 'euler-exact', 'conic-bridge'] as const;
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
    'root-finding-example': ROOT_FINDING_EXAMPLE_IDS,
    'root-finding-method': ROOT_FINDING_METHODS,
    'quadrature-function': FUNCTION_IDS,
    'quadrature-rule': QUADRATURE_RULES,
    'euler-example': EULER_EXAMPLE_IDS,
    /** The step h as text (a choice value is a string); the graph reads it back as the number. */
    'euler-step': STEP_SIZES.map(String),
    'density-example': DENSITY_EXAMPLE_IDS,
    'binomial-normal-example': BINOMIAL_NORMAL_EXAMPLE_IDS,
    'binomial-correction': BINOMIAL_CORRECTION_CHOICES,
    'clt-example': CLT_EXAMPLE_IDS,
    'summary-example': SUMMARY_EXAMPLE_IDS,
    'summary-rule': SUMMARY_RULES,
    'summary-sigma': SUMMARY_SIGMAS,
    'correlation-example': CORRELATION_EXAMPLE_IDS,
    'transform-base': TRANSFORM_BASE_IDS,
    'polynomial-example': POLYNOMIAL_EXAMPLE_IDS,
    'rational-example': RATIONAL_EXAMPLE_IDS,
    'series-example': SERIES_EXAMPLE_IDS,
    'conic-example': CONIC_EXAMPLE_IDS,
    'inverse-restriction': INVERSE_RESTRICTION_IDS,
    'fourier-example': FOURIER_SERIES_EXAMPLE_IDS,
    'fourier-view': FOURIER_COEFFICIENTS_VIEWS,
    'fourier-layout': FOURIER_COEFFICIENTS_LAYOUTS,
    'fourier-term': FOURIER_COEFFICIENT_TERMS,
    'fourier-selection-1': FOURIER_EXAMPLE_IDS,
    'fourier-selection-2': FOURIER_EXAMPLE_IDS,
    'fourier-selection-3': FOURIER_EXAMPLE_IDS,
    'fourier-scale': FOURIER_DECAY_SCALES,
    'epicycle-example': EPICYCLE_EXAMPLE_IDS,
    'epicycle-parametrization': EPICYCLE_PARAMETRIZATIONS,
    'uniform-example': UNIFORM_EXAMPLE_IDS,
    'complex-example': COMPLEX_EXAMPLE_IDS,
    'complex-reciprocal-example': COMPLEX_RECIPROCAL_EXAMPLE_IDS,
    'complex-roots-example': COMPLEX_ROOTS_EXAMPLE_IDS,
} satisfies Record<string, readonly string[]>;
export type FunctionChoiceName = keyof typeof functionChoiceValues;
export const FUNCTION_CHOICE_VALUES: Readonly<Record<FunctionChoiceName, readonly string[]>> = functionChoiceValues;
export const FUNCTION_CHOICE_NAMES = Object.keys(functionChoiceValues) as FunctionChoiceName[];

/** How much of the evolute CurveEvoluteGraph draws: nothing, the part for t in [0, parameter], or all of it. */
export const EVOLUTE_TRACE_MODES = ['hidden', 'to-parameter', 'full'] as const;
export type EvoluteTraceMode = typeof EVOLUTE_TRACE_MODES[number];

/** The curve overlays a lesson can show or hide on a curve demonstration. `curvature-frame` (T and N) and `curvature-circle` (the osculating circle or line) belong to CurvatureBezierCurveGraph only; `curvature-comb` (the curvature comb) to CurveCombGraph only; `evolute-normal` (the normal line at the parameter) to CurveEvoluteGraph; `offset-trace` (the sampled offset), `offset-cusps` (its cusp markers) and `offset-speed-plot` (the 1 + d*kappa plot) to CurveOffsetGraph; `envelope-lines` (the family of de Casteljau lines), `envelope-curve` (the Bezier curve itself) and `envelope-touch` (the highlighted line and its touching point) to CurveEnvelopeGraph. Not to be confused with `offset-curve`, which is the PH graph's exact offset. */
export const CURVE_VISIBILITY_TARGETS = ['control-polygon', 'convex-hull', 'decasteljau-scheme', 'decasteljau-full-curve', 'ph-control-polygon', 'offset-curve', 'weights', 'curvature-frame', 'curvature-circle', 'curvature-comb', 'evolute-normal', 'offset-trace', 'offset-cusps', 'offset-speed-plot', 'envelope-lines', 'envelope-curve', 'envelope-touch', 'reduction-quadratic', 'reduction-elevation', 'parametric-trace-full', 'arc-equal-t', 'arc-equal-arc', 'arc-speed-plot'] as const;
export type CurveVisibilityTarget = typeof CURVE_VISIBILITY_TARGETS[number];

/** The visibility switches a lesson can address on a surface (patch) demonstration. */
export const PATCH_VISIBILITY_TARGETS = ['control-net', 'iso-curves', 'boundary-curves', 'decasteljau-scheme', 'tangent-plane', 'normal', 'twist', 'shading'] as const;
export type PatchVisibilityTarget = typeof PATCH_VISIBILITY_TARGETS[number];

/** The named 3D camera views of a surface demonstration. */
export const CAMERA_PRESET_NAMES = ['front', 'top', 'side', 'isometric'] as const;
export type CameraPresetName = typeof CAMERA_PRESET_NAMES[number];

/**
 * Closed set of animations a lesson can drive. `decasteljau` is the frame animation of the De Casteljau parameter;
 * `bisection` is the first iterative playback and `sequence` reveals the terms of a sequence one by one and `fixed-point` the iterates of a fixed-point iteration and `algorithm-trace` the steps of a convex hull algorithm trace. A graph registers only the ids it owns and the commands each supports;
 * the registry rejects the rest with `UnsupportedLessonActionError`.
 */
export const LESSON_ANIMATION_IDS = ['decasteljau', 'bisection', 'sequence', 'fixed-point', 'root-finding', 'patch-u-sweep', 'patch-v-sweep', 'algorithm-trace', 'parametric-roll', 'interp-subdivision-rounds', 'deboor', 'clt-sum'] as const;
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
 * (`points`, one point) with its hodograph points, generic spline degree/continuity, G1 spline junction ratios, or B-spline `knots` (used as given by the B-spline basis and de Boor graphs; the
 * graph's Preset check rejects a non-monotone vector or one that does not fit the point count and degree; the default is the clamped
 * uniform vector; other curve graphs ignore the field).
 * Free-exploration defaults and stored Presets are unaffected; the graph rejects inputs its Preset collection rejects.
 */
export interface LessonCurveFixture {
    readonly points: readonly LessonPoint[];
    readonly weights?: readonly number[];
    readonly hodographs?: readonly LessonPoint[];
    readonly degree?: number;
    readonly continuity?: number;
    readonly splineRatios?: readonly number[];
    readonly knots?: readonly number[];
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
    /** `t` is the De Casteljau parameter (AbstractJXGBezierCurve.setDecasteljauT); `offset-distance` is the PH offset distance (JXGPHBezierCurve.setOffsetCurveDistance). ParametricCurveGraph reads `t` as its parameter (t or theta, inside the curve's domain); CurvatureBezierCurveGraph as the Bezier parameter in [0, 1]. */
    | {readonly kind: 'parameter'; readonly name: 't' | 'offset-distance'; readonly value: number}
    /** CurveEvoluteGraph's trace of the evolute: none, from t = 0 to the parameter, or the whole curve. */
    | {readonly kind: 'evolute-trace'; readonly mode: EvoluteTraceMode}
    /** BernsteinGraph's graph-owned degree action (an integer; BERNSTEIN_MAX_DEGREE bounds it). */
    | {readonly kind: 'bernstein-degree'; readonly degree: number}
    /** BernsteinGraph's graph-owned stacked-area view. */
    | {readonly kind: 'bernstein-stacked-area'; readonly visible: boolean}
    /**
     * BSplineInsertionGraph's scene actions: `insert` adds the knot `value` (Boehm; the previous polygon becomes the ghost) and a
     * value the graph refuses (outside the domain, above multiplicity k + 1, not finite) is a lesson-content error, `set-example`
     * loads the quadratic or the cubic as the Reset target, `set-comb` shows or hides the curvature comb, `reset` returns to the origin.
     */
    | {readonly kind: 'knot-insertion'; readonly operation: 'insert'; readonly value: number}
    | {readonly kind: 'knot-insertion'; readonly operation: 'set-example'; readonly exampleId: 'quadratic' | 'cubic'}
    | {readonly kind: 'knot-insertion'; readonly operation: 'set-comb'; readonly visible: boolean}
    | {readonly kind: 'knot-insertion'; readonly operation: 'reset'}
    /**
     * BSplineExtractionGraph's scene actions: `move-point` puts control point `index` at `to` exactly as a drag does (the points change and
     * `moved` records it, so the affected pieces are marked), `set-example` loads the quadratic or the cubic as the Reset target, `reset`
     * returns to the origin. An invalid index, a non-finite position or an unknown example is a lesson-content error.
     */
    | {readonly kind: 'bezier-extraction'; readonly operation: 'move-point'; readonly index: number; readonly to: readonly [number, number]}
    | {readonly kind: 'bezier-extraction'; readonly operation: 'set-example'; readonly exampleId: 'quadratic' | 'cubic'}
    | {readonly kind: 'bezier-extraction'; readonly operation: 'reset'}
    /**
     * BSplineNurbsGraph's scene actions: `set-example` loads the nurbs circle (weights 1 and √2/2) or the same points with unit weights as the
     * Reset target, `set-t` moves the parameter slider (the value must lie on the domain), `set-weight` types weight `index` (zero-based, a
     * positive finite value), `set-circle` shows or hides the unit-circle overlay and `reset` returns to the example's weights. An index out
     * of range, a nonpositive or non-finite weight, a value off the domain or an unknown example is a lesson-content error.
     */
    | {readonly kind: 'nurbs-circle'; readonly operation: 'set-example'; readonly exampleId: 'circle' | 'unit'}
    | {readonly kind: 'nurbs-circle'; readonly operation: 'set-t'; readonly value: number}
    | {readonly kind: 'nurbs-circle'; readonly operation: 'set-weight'; readonly index: number; readonly value: number}
    | {readonly kind: 'nurbs-circle'; readonly operation: 'set-circle'; readonly visible: boolean}
    | {readonly kind: 'nurbs-circle'; readonly operation: 'reset'}
    /**
     * BSplineBlossomGraph's scene actions: `set-degree` switches between degree 2 and 3 (any other value is refused), `set-segment` picks
     * the segment [u_j, u_{j+1}) by its index j (an empty or unknown span is refused), `set-args` sets the arguments of f (exactly one per
     * degree, each inside the domain), `set-bezier` shows or hides the segment's Bezier points and `reset` returns to the default curve,
     * segment and arguments. Invalid input is a lesson-content error.
     */
    | {readonly kind: 'blossom'; readonly operation: 'set-degree'; readonly degree: number}
    | {readonly kind: 'blossom'; readonly operation: 'set-segment'; readonly segment: number}
    | {readonly kind: 'blossom'; readonly operation: 'set-args'; readonly args: readonly number[]}
    | {readonly kind: 'blossom'; readonly operation: 'set-bezier'; readonly visible: boolean}
    | {readonly kind: 'blossom'; readonly operation: 'reset'}
    /**
     * LinearMapGraph's scene actions (validated by `validateSet*` in `src/linear/linearMapModel.ts`). Kinds are typed; the graph still
     * enforces the domain (grid, ranges): scene data is strict, so an off-grid entry is a lesson-content error, never snapped.
     */
    | {readonly kind: 'linear-map'; readonly operation: 'set-matrix'; readonly matrix: Mat2; readonly target?: MatrixSlot}
    | {readonly kind: 'linear-map'; readonly operation: 'set-mode'; readonly mode: LinearMapMode}
    | {readonly kind: 'linear-map'; readonly operation: 'set-test-vector'; readonly angle: number}
    | {readonly kind: 'linear-map'; readonly operation: 'set-example'; readonly exampleId: LinearMapExampleId}
    /** `set-conic` switches the ellipse mode's conic x^T S x = 1 (symmetric part S) on or off, as the inspector switch does; `visible` must be a boolean. */
    | {readonly kind: 'linear-map'; readonly operation: 'set-conic'; readonly visible: boolean}
    /** Batch D: `set-start` sets the iteration's start vector (grid coordinates); `step` advances the iteration by `count` (1 to 30, default 1, relative to the current step). */
    | {readonly kind: 'linear-map'; readonly operation: 'set-start'; readonly start: readonly [number, number]}
    | {readonly kind: 'linear-map'; readonly operation: 'step'; readonly count?: number}
    /**
     * PointSetGraph's scene actions. `set-points` replaces the model (grid step 0); scene data is strict, so an off-grid,
     * out-of-range or over-limit point is a lesson-content error and never snapped. `set-overlay` accepts only the
     * overlays the target graph owns.
     */
    | {readonly kind: 'point-set'; readonly operation: 'set-points'; readonly points: readonly LessonPoint[]; readonly mode: 'points' | 'polygon' | 'segments' | 'intervals'; readonly closed?: boolean}
    | {readonly kind: 'point-set'; readonly operation: 'set-overlay'; readonly overlay: PointSetOverlayName; readonly visible: boolean}
    /** HullTraceGraph only (any other point-set graph throws `UnsupportedLessonActionError`): picks the algorithm, returns to step 0 and pauses. */
    | {readonly kind: 'point-set'; readonly operation: 'set-algorithm'; readonly algorithm: HullAlgorithm}
    /** Graphs with a trace step (any other point-set graph throws `UnsupportedLessonActionError`): pauses playback and sets the trace step; a number is clamped like a stored Preset step and `'end'` is the last step. */
    | {readonly kind: 'point-set'; readonly operation: 'set-trace-step'; readonly step: number | 'end'}
    /** BezierClippingGraph only (any other point-set graph throws `UnsupportedLessonActionError`): replaces the whole curve pair with `points` in board units on the grid of step 2^`gridStepExponent` (the half-unit offset pair needs exponent -1), returns to step 0 and pauses. An off-grid point, a point outside the coordinate limit or anything that is not a curve pair is a lesson-content error and is never snapped. */
    | {readonly kind: 'point-set'; readonly operation: 'load-model'; readonly points: readonly LessonPoint[]; readonly gridStepExponent: number}
    /** BezierClippingGraph only (any other point-set graph throws `UnsupportedLessonActionError`): sets the clipping tolerance to 10^-`exponent` like the tolerance control, returns to step 0 and pauses. An exponent that is not a whole number from 3 to 10 is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'set-clip-tolerance'; readonly exponent: number}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): replaces the triangulation of the current points with `triangles` (counter-clockwise vertex index triples), checked like a stored Preset's list. An invalid list (wrong indices, overlap, gaps, not a triangulation) is a lesson-content error and is never repaired. */
    | {readonly kind: 'point-set'; readonly operation: 'set-triangulation'; readonly triangles: readonly (readonly [number, number, number])[]}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): the flip button on the edge between two points (selects it, then flips). A pair that is not an edge, or a refused flip, is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'flip-edge'; readonly edge: readonly [number, number]}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): highlights an edge without flipping; `null` clears the selection. A pair that is not an edge is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'select-edge'; readonly edge: readonly [number, number] | null}
    /** DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): selects the triangle at `triangle`, an index into the triangulation shown at the current trace step (the board click or panel list entry); `null` clears the selection. A non-integer or out-of-range index is a lesson-content error. Any later change of the trace step clears the selection. */
    | {readonly kind: 'point-set'; readonly operation: 'select-triangle'; readonly triangle: number | null}
    /** VoronoiGraph only (any other point-set graph, including DelaunayGraph, throws `UnsupportedLessonActionError`; `select-triangle` there picks a triangle of its Delaunay overlay, which must be shown): chooses the site whose cell is constructed (the site button); `null` clears. An index outside the sites is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'select-site'; readonly site: number | null}
    /** VoronoiGraph only: sets how many bisectors of the chosen site are shown, `'end'` being all of them (the Next/Back/Reset buttons). No chosen site, or a count outside 0 to sites - 1, is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'set-construction'; readonly count: number | 'end'}
    /**
     * VoronoiGraph and PointInPolygonGraph only (any other point-set graph throws `UnsupportedLessonActionError`): places the query point at `[x, y]`
     * on the grid a drag snaps to (VoronoiGraph: multiples of 1/4; PointInPolygonGraph: the polygon's grid steps, whole numbers for its examples) within the
     * coordinate limit; `null` returns it to its default (PointInPolygonGraph: that of the current figure, (0, 0) for the pentagram, else (3, 1)).
     * Anything else is a lesson-content error and never snapped.
     */
    | {readonly kind: 'point-set'; readonly operation: 'set-query-point'; readonly point: readonly [number, number] | null}
    /** PointInPolygonGraph only (any other point-set graph throws `UnsupportedLessonActionError`): loads an example polygon with its own query point, as the example buttons do. Any other name is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'set-polygon'; readonly polygon: 'notched' | 'pentagram'}
    /** VoronoiGraph and DegenerateSitesGraph (`sites` or `four-point`) and HullRobustnessGraph (`chain` or `kettner`) only; any other point-set graph throws `UnsupportedLessonActionError`. Switches the mode as the mode control does; the four-point mode needs exactly four sites, else it is a lesson-content error. Sites, overlays, the chosen site and the query point are untouched. A mode the graph does not offer, or any other value, is a lesson-content error. On HullRobustnessGraph it also pauses playback and returns the trace to step 0, and the view follows the mode. */
    | {readonly kind: 'point-set'; readonly operation: 'set-mode'; readonly mode: 'sites' | 'four-point' | 'chain' | 'kettner'}
    /** HullRobustnessGraph only (any other point-set graph throws `UnsupportedLessonActionError`): the pop rule control (`non-left` pops on a left turn or collinear points, `right` only on a right turn). Pauses playback and returns the trace to step 0. Any other rule is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'set-pop-rule'; readonly rule: 'non-left' | 'right'}
    /** HullRobustnessGraph only (any other point-set graph throws `UnsupportedLessonActionError`): the duplicates control (`merge` keeps one of equal points, `keep` keeps them all). Pauses playback and returns the trace to step 0. Any other value is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'set-duplicates'; readonly duplicates: 'merge' | 'keep'}
    | {readonly kind: 'point-set'; readonly operation: 'set-panel'; readonly panel: 'inexact' | 'exact'}
    /** HullRobustnessGraph only (any other point-set graph throws `UnsupportedLessonActionError`): selects Kettner cell `(i, j)`, each an integer from 0 to 63; anything else is a lesson-content error and is never clamped. Pauses playback and returns the trace to step 0. */
    | {readonly kind: 'point-set'; readonly operation: 'select-cell'; readonly i: number; readonly j: number}
    /**
     * Projective graphs' scene actions; the union stays open for the other projective graphs. CrossRatioGraph (K1): `load-example`
     * is the example button; `move-handle` is a drag to the grid point (`handle` 0-3 are A-D on the line y = 0 and take only `x`,
     * 4 is the centre O, 5-6 are M and N and take `x` and `y`). Scene data is strict: a non-integer or out-of-range value is a
     * lesson-content error and is never snapped.
     * PascalGraph (K2) has its own operations, which CrossRatioGraph rejects (and the reverse): `pascal-load-example` is the example
     * button, `pascal-set-conic` and `pascal-set-order` are the conic and hexagon-order buttons (a new conic restarts the six points
     * at its defaults), and `pascal-set-index` puts `handle` 0-5 at a direction-table `index`, the path of the arrow keys. Scene data
     * is strict: an index that is not a reachable position of that handle on the current conic is a lesson-content error, never snapped.
     * PolePolarGraph (K3) has its own `pole-polar-*` operations, which the other projective graphs reject (and the reverse):
     * `pole-polar-load-example` and `pole-polar-set-conic` are the example and conic buttons, `pole-polar-place` puts the finite P at
     * integer numerators `x`, `y` over 5 (each within +-50, a coordinate within +-10), and `pole-polar-set-direction` turns P into the
     * point at infinity of the integer direction `dx`, `dy` (each within +-5, not both 0); with both omitted it returns to the finite P.
     * Scene data is strict: a non-integer or out-of-range value is a lesson-content error, never snapped.
     * FivePointGraph (K4) has its own `five-point-*` operations, which the other projective graphs reject (and the reverse):
     * `five-point-load-example` is the example button, `five-point-set-end` makes point `index` 0-4 the arc end `which` ('a' or 'b';
     * choosing the other end's point swaps the ends), `five-point-set-third` makes point `index` the weight point (not an arc end),
     * `five-point-place` puts point `index` at integer numerators `x`, `y` over 15 (each within +-150, the 1/15 grid of the named
     * examples, not only the 1/5 grid of a drag), and `five-point-set-extrapolation` is the checkbox that continues the arc outside
     * t in [0, 1] (not part of the example, so a scene sets it explicitly). Scene data is strict: a non-integer, off-grid or out-of-range
     * value is a lesson-content error, never snapped.
     * ThreeViewsGraph (K5) has its own `three-views-*` operations, which the other projective graphs reject (and the reverse):
     * `three-views-set-c` is the slider for the height of L, `tenths` an integer from -25 to 25 (c = tenths / 10),
     * `three-views-set-point` is the checkbox for the point P on the circle and its image, and `three-views-set-angle` puts P at `step`,
     * an integer from 0 to 23 (steps of 15 degrees from (1, 0), counter-clockwise). Scene data is strict: a non-integer or out-of-range
     * value is a lesson-content error, never rounded, clamped or wrapped.
     */
    | {readonly kind: 'projective'; readonly operation: 'load-example'; readonly exampleId: CrossRatioExampleId}
    | {readonly kind: 'projective'; readonly operation: 'move-handle'; readonly handle: number; readonly x: number; readonly y?: number}
    | {readonly kind: 'projective'; readonly operation: 'pascal-load-example'; readonly exampleId: PascalExampleId}
    | {readonly kind: 'projective'; readonly operation: 'pascal-set-conic'; readonly conic: PascalConicId}
    | {readonly kind: 'projective'; readonly operation: 'pascal-set-order'; readonly order: PascalOrderId}
    | {readonly kind: 'projective'; readonly operation: 'pascal-set-index'; readonly handle: number; readonly index: number}
    | {readonly kind: 'projective'; readonly operation: 'pole-polar-load-example'; readonly exampleId: PolePolarExampleId}
    | {readonly kind: 'projective'; readonly operation: 'pole-polar-set-conic'; readonly conic: PolePolarConicId}
    | {readonly kind: 'projective'; readonly operation: 'pole-polar-place'; readonly x: number; readonly y: number}
    | {readonly kind: 'projective'; readonly operation: 'pole-polar-set-direction'; readonly dx?: number; readonly dy?: number}
    | {readonly kind: 'projective'; readonly operation: 'five-point-load-example'; readonly exampleId: FivePointExampleId}
    | {readonly kind: 'projective'; readonly operation: 'five-point-set-end'; readonly which: 'a' | 'b'; readonly index: number}
    | {readonly kind: 'projective'; readonly operation: 'five-point-set-third'; readonly index: number}
    | {readonly kind: 'projective'; readonly operation: 'five-point-place'; readonly index: number; readonly x: number; readonly y: number}
    | {readonly kind: 'projective'; readonly operation: 'five-point-set-extrapolation'; readonly on: boolean}
    | {readonly kind: 'projective'; readonly operation: 'three-views-set-c'; readonly tenths: number}
    | {readonly kind: 'projective'; readonly operation: 'three-views-set-point'; readonly on: boolean}
    | {readonly kind: 'projective'; readonly operation: 'three-views-set-angle'; readonly step: number}
    /**
     * The trigonometry graphs' scene actions; UnitCircleGraph (TR1, TR2): `set-angle` is the numeric
     * angle field in degrees (`which` `first` is the point at angle theta and the rotation of the frame, `second` the angle beta of TR2); `degrees`
     * must be a finite multiple of 0.5 in [0, 359.5], anything else is a lesson-content error and is never snapped. `set-overlay` is the switch of
     * the cosine trace, the three symmetric points or the second angle with the rotated frame. The triangle graph has its own kind, `triangle`.
     */
    | {readonly kind: 'trig'; readonly operation: 'set-angle'; readonly which: 'first' | 'second'; readonly degrees: number}
    | {readonly kind: 'trig'; readonly operation: 'set-overlay'; readonly overlay: 'cosine' | 'symmetries' | 'addition'; readonly on: boolean}
    /**
     * TriangleSolverGraph's scene actions (TR3, TR4; TR5 adds `set-data`), a kind of their own so that each graph's switch over its operations stays
     * exhaustive. `set-mode` is the mode select (`sides`, `circle`, `solve`); `set-vertex` is the two coordinate fields of one vertex, each an integer of
     * the field's range (x from -2 to 8, y from -7 to 11); anything else is a lesson-content error and is never snapped or clamped.
     */
    | {readonly kind: 'triangle'; readonly operation: 'set-mode'; readonly mode: 'sides' | 'circle' | 'solve'}
    | {readonly kind: 'triangle'; readonly operation: 'set-vertex'; readonly vertex: 'A' | 'B' | 'C'; readonly x: number; readonly y: number}
    /**
     * LineGeometryGraph's scene actions (analytic-lines L1, L2; later lessons extend the union). `set-mode` is the mode select (`forms`, `normal`,
     * `angle`, `distance`, `intersect`); `set-points` is the coordinate fields of the named handles `P`, `Q`, `R`, `S`, `T`, `O`, `B`, each an integer in
     * [-8, 8]. Anything else is a lesson-content error and is never snapped; the whole action is validated before the first write.
     */
    | {readonly kind: 'lines'; readonly operation: 'set-mode'; readonly mode: 'forms' | 'normal' | 'angle' | 'distance' | 'intersect'}
    | {readonly kind: 'lines'; readonly operation: 'set-points'; readonly points: Readonly<Partial<Record<'P' | 'Q' | 'R' | 'S' | 'T' | 'O' | 'B', {readonly x: number; readonly y: number}>>>}
    /**
     * IsometryGraph's scene actions (isometries L1 to L3; later lessons add `set-frieze`). `set-mode` is the mode select, `set-mirror-count` the
     * number-of-mirrors field of the classify mode (1 to 3) and `set-mirrors` the coordinate fields of whole mirrors `1`, `2`, `3`, each two distinct integer
     * grid points `p`, `q` in [-16, 16]. `set-dilation` writes any of the similarity mode's fields: the centre (an integer grid point in [-16, 16]), the ratio
     * `k` (a multiple of 1/4 with 1/4 <= |k| <= 4) and the `turn` about the centre (one of the model's six turns); at least one is named. Anything else is
     * a lesson-content error and is never snapped; each action is validated before its write.
     */
    | {readonly kind: 'isometry'; readonly operation: 'set-mode'; readonly mode: 'mirrors' | 'classify' | 'similarity' | 'rosette' | 'frieze'}
    | {readonly kind: 'isometry'; readonly operation: 'set-mirror-count'; readonly count: 1 | 2 | 3}
    | {
        readonly kind: 'isometry'; readonly operation: 'set-mirrors';
        readonly mirrors: Readonly<Partial<Record<'1' | '2' | '3', {
            readonly p: {readonly x: number; readonly y: number};
            readonly q: {readonly x: number; readonly y: number};
        }>>>;
    }
    | {
        readonly kind: 'isometry'; readonly operation: 'set-dilation';
        readonly centre?: {readonly x: number; readonly y: number};
        readonly k?: number;
        readonly turn?: 'r0' | 'r90' | 'r180' | 'r270' | 'pythagorean' | 'pythagoreanInverse';
    }
    /**
     * CircleConstructionGraph's scene actions (circle-geometry CG1, CG2; CG3 and CG4 extend the union). `set-mode` is the construction select and loads
     * that construction's example, as the select does; `set-circle` writes the centre and radius of `c1`, `c2` or `c3` (the radical mode always draws
     * three); `set-point` writes the point P of the tangent mode and the probe of the radical mode. Centres and P are integers in [-16, 16], a radius is
     * a multiple of 1/4 in [1/4, 8]. Anything else is a lesson-content error and is never snapped; the whole action is validated before the first write.
     * `set-apollonius` (CG3) writes the named fields of the Apollonius mode in one write: any of the points `a`, `b`, `p` (each an integer pair in
     * [-16, 16], the coordinate fields of A, B, P) and the ratio `k` (a multiple of 1/2 in [1/2, 4], the ratio field); at least one is required.
     * It does not change the mode; A = B is allowed, as the fields allow it (the graph then reports the degenerate case).
     */
    | {readonly kind: 'circle'; readonly operation: 'set-mode'; readonly mode: 'tangents' | 'radical' | 'apollonius' | 'common'}
    | {readonly kind: 'circle'; readonly operation: 'set-circle'; readonly circle: 'c1' | 'c2' | 'c3'; readonly x: number; readonly y: number; readonly r: number}
    | {readonly kind: 'circle'; readonly operation: 'set-point'; readonly x: number; readonly y: number}
    | {readonly kind: 'circle'; readonly operation: 'set-apollonius'; readonly a?: {readonly x: number; readonly y: number}; readonly b?: {readonly x: number; readonly y: number}; readonly p?: {readonly x: number; readonly y: number}; readonly k?: number}
    /**
     * The scene actions of the two combinatorics graphs (CB1 to CB4; `set-row` joins in batch C). LatticePathGraph registers
     * `set-target` (the target (a, b), integers in [0, 20]; the highlighted route restarts at the first one, as when the target is moved),
     * `set-lattice-display` (the view, `paths` or `triangle`, and the switch of the count labels, drawn only while a + b <= 12; the optional `split` is the
     * switch that colours the routes by their last step, absent = unchanged) and `set-expansion` (the view `expansion` with n in [0, 12] and c in [-9, 9]). CountingTreeGraph
     * registers `set-counting-mode`: the view `choices` with n, k (0 to 20, k <= n without repetition) and the two switches of the kind of choice, or the view
     * `multiset` with the numbers of the four kinds of letters (0 to 12). Anything off the model's ranges is a lesson-content error: it is never snapped and
     * the whole action is validated before the first write.
     */
    | {readonly kind: 'combinatorics'; readonly operation: 'set-target'; readonly a: number; readonly b: number}
    | {readonly kind: 'combinatorics'; readonly operation: 'set-lattice-display'; readonly view: 'paths' | 'triangle'; readonly showCounts: boolean; readonly split?: boolean}
    | {readonly kind: 'combinatorics'; readonly operation: 'set-expansion'; readonly n: number; readonly c: number}
    | {readonly kind: 'combinatorics'; readonly operation: 'set-counting-mode'; readonly view: 'choices'; readonly n: number; readonly k: number; readonly ordered: boolean; readonly repetition: boolean}
    | {readonly kind: 'combinatorics'; readonly operation: 'set-counting-mode'; readonly view: 'multiset'; readonly counts: readonly [number, number, number, number]}
    /**
     * KinematicsGraph's scene actions (KN1 to KN5). `set-motion` picks the motion (the catalogue curves, the projectile or the uniform circular
     * motion): the time restarts at 0 and the speed variation b returns to 0 unless the motion is circular. `set-time` is the time slider: seconds in
     * [0, the length of the motion], and it pauses the playback. `set-params` sets any of the stored fields (launch speed and angle, radius, angular velocity,
     * the speed variation b of the circular motion, the four display switches); the merged state must pass the model's strict parser (stepper grid and
     * ranges, b = 0 for any other motion) before the first write, otherwise the action throws and nothing is snapped. Playback is never part of a scene.
     */
    | {readonly kind: 'kinematics'; readonly operation: 'set-motion'; readonly motion: 'cycloid' | 'cardioid' | 'rose' | 'spiral' | 'projectile' | 'circular'}
    | {readonly kind: 'kinematics'; readonly operation: 'set-time'; readonly t: number}
    | {
        readonly kind: 'kinematics'; readonly operation: 'set-params';
        readonly v0?: number; readonly alpha?: number; readonly radius?: number; readonly omega?: number; readonly b?: number;
        readonly showVelocity?: boolean; readonly showAcceleration?: boolean; readonly split?: boolean; readonly trace?: boolean;
    }
    /**
     * DescentGraph's scene actions (MC1 to MC3). `set-mode` picks the experiment (race, track, tautochrone): the elapsed time restarts at 0. `set-time` is the time
     * slider: seconds in [0, the length of the run], and it pauses the playback. `set-params` sets any of the stored fields (the radius, the end point and the two inner
     * control points of the track, the three start parameters, the two switches); the merged state must pass the model's strict parser (quarter and 0,05 grids, ranges)
     * before the first write, otherwise the action throws and nothing is snapped. Playback is never part of a scene.
     */
    | {readonly kind: 'descent'; readonly operation: 'set-mode'; readonly mode: 'race' | 'track' | 'tautochrone'}
    | {readonly kind: 'descent'; readonly operation: 'set-time'; readonly t: number}
    | {
        readonly kind: 'descent'; readonly operation: 'set-params';
        readonly radius?: number; readonly endX?: number; readonly endY?: number;
        readonly p1x?: number; readonly p1y?: number; readonly p2x?: number; readonly p2y?: number;
        readonly theta1?: number; readonly theta2?: number; readonly theta3?: number;
        readonly showCycloid?: boolean; readonly showArc?: boolean;
    }
    /**
     * WavesGraph's scene actions (WV1 to WV5). `set-mode` picks the kind of waves (sum, beats, standing, sampling); the time restarts at 0. `set-components` sets the
     * amplitudes, phases (degrees), integer frequencies, the half-wave count and the two switches of the sum and beats pictures; `set-sampling` sets the sampling rate,
     * the extra sinc samples and the three switches of the sampling picture. `set-time` is the time slider: seconds in [0, the window of the mode]. The merged state
     * must pass the model's strict parser (grids and ranges) before the first write, otherwise the action throws and nothing is snapped; unknown fields are refused.
     * Every write pauses the playback, and playback is never part of a scene.
     */
    | {readonly kind: 'waves'; readonly operation: 'set-mode'; readonly mode: 'sum' | 'beats' | 'standing' | 'sampling'}
    | {
        readonly kind: 'waves'; readonly operation: 'set-components';
        readonly a1?: number; readonly p1?: number; readonly a2?: number; readonly p2?: number; readonly f1?: number; readonly f2?: number;
        readonly halfWaves?: number; readonly showPhasors?: boolean; readonly showEnvelope?: boolean;
    }
    | {
        readonly kind: 'waves'; readonly operation: 'set-sampling';
        readonly fs?: number; readonly extra?: number; readonly showAlias?: boolean; readonly showJoin?: boolean; readonly showSinc?: boolean;
    }
    | {readonly kind: 'waves'; readonly operation: 'set-time'; readonly t: number}
    /**
     * SimulationGraph's scene actions (RS1, RS2; the other modes' fields are added by their batches). `set-mode` picks the mode and shows its default run. `set-run` sets
     * the seed (0 to 999 999), the trial count (everything is shown, as typing it does), the rows of the Galton board and its right-bounce percent (a multiple of 5);
     * `set-overlay` draws the run of `seed2` over the run (modes with a second run only); `set-position` moves the playback position to a stop of the playback. The merged
     * state must pass `parseRandomState` before the first write, otherwise the action throws and nothing is written; unknown fields are refused. A write halts the playback.
     */
    | {readonly kind: 'random'; readonly operation: 'set-mode'; readonly mode: 'galton' | 'frequency' | 'area' | 'walk' | 'markov' | 'interval'}
    | {readonly kind: 'random'; readonly operation: 'set-run'; readonly seed?: number; readonly n?: number; readonly rows?: number; readonly pPercent?: number}
    | {readonly kind: 'random'; readonly operation: 'set-overlay'; readonly overlay: boolean; readonly seed2?: number}
    | {readonly kind: 'random'; readonly operation: 'set-position'; readonly shown: number}
    /**
     * LinearProgramGraph's scene actions (LS5; the contour graph's `set-function`, `set-level`, `set-probe` and `set-step` are added by its batches). `set-objective` sets the
     * integer objective coefficients `p` and `q` (the maximum of `p x + q y`), `set-constraints` replaces the user rows `a x + b y <= c` (x >= 0 and y >= 0 are always added), and
     * `set-sweep` sets the integer `sweep` of the line `p x + q y = sweep`. The merged state must pass `parseLpState` (strict, nothing snapped or clamped) before the write, otherwise
     * the action throws and nothing is written; unknown fields are refused. The walk, the vertices and the status are derived and have no action.
     */
    | {readonly kind: 'levelsets'; readonly operation: 'set-objective'; readonly p: number; readonly q: number}
    | {readonly kind: 'levelsets'; readonly operation: 'set-constraints'; readonly constraints: readonly {readonly a: number; readonly b: number; readonly c: number}[]}
    | {readonly kind: 'levelsets'; readonly operation: 'set-sweep'; readonly sweep: number}
    /**
     * LogisticMapGraph's scene actions (PP4, PP5). The operations are named after the stored
     * fields: `set-r` sets `R` (the integer r times 100, from 250 to 400), `set-seed` the start `X` (the integer x0 times 100, from 1 to 99) and `set-step` the number of drawn cobweb
     * steps (0 to 60). The merged state must pass `parseLogisticState` before the write, otherwise the action throws and nothing is written; unknown fields are refused; a valid
     * action pauses a running playback. The bifurcation window is not scene state, so there is no `set-zoom`.
     * PhasePortraitGraph's scene actions (PP1 to PP3) use five other operations, and each graph refuses the other's:
     * `set-matrix` sets the four stored entries A, B, C, D of ((a, b), (c, d)) (integer quarter units, entry = A/4, from -16 to 16), `set-system` picks `linear`, `pendulum` or
     * `weak-spiral` (the matrix and seeds are kept, the equilibrium falls back to 0 where the system lacks it) and `set-seeds` replaces all seeds (1 to 6, seed = X/20 and Y/20,
     * each from -80 to 80; the angle and angular velocity for the pendulum), `set-zoom` sets the view zoom (integer 0 to 6, half-width 4/2^zoom) and `set-equilibrium` the
     * equilibrium index (0, or 1 for the pendulum only). The merged state must pass `parsePhaseState` first; unknown fields are refused; a valid action
     * pauses a running playback.
     */
    | {readonly kind: 'phase'; readonly operation: 'set-r'; readonly R: number}
    | {readonly kind: 'phase'; readonly operation: 'set-seed'; readonly X: number}
    | {readonly kind: 'phase'; readonly operation: 'set-step'; readonly step: number}
    | {readonly kind: 'phase'; readonly operation: 'set-matrix'; readonly A: number; readonly B: number; readonly C: number; readonly D: number}
    | {readonly kind: 'phase'; readonly operation: 'set-system'; readonly system: SystemId}
    | {readonly kind: 'phase'; readonly operation: 'set-seeds'; readonly seeds: readonly {readonly X: number; readonly Y: number}[]}
    | {readonly kind: 'phase'; readonly operation: 'set-zoom'; readonly zoom: number}
    | {readonly kind: 'phase'; readonly operation: 'set-equilibrium'; readonly equilibrium: number}
    /**
     * SolidsGraph's scene actions (SV1, SV2; `set-shear`, `set-discs`, `set-cursor` and `set-axis` join with the stack and revolve lessons). Each equals the control of the same name:
     * `set-solid` picks a solid id (the mode and axis fall back as the chooser does), `set-mode` a mode (the solid falls back), `set-plane` the plane normal (integers -4 to 4, not all
     * zero) and the offset `offset` in grid units of 1/4 (the plane is n . x = offset / 4), `set-offset` the offset alone, `set-camera` one of the camera presets. The merged state
     * must pass `parseSolidsState` before the write, otherwise the action throws and nothing is written; unknown fields are refused.
     */
    | {readonly kind: 'solids'; readonly operation: 'set-solid'; readonly solid: string}
    | {readonly kind: 'solids'; readonly operation: 'set-mode'; readonly mode: string}
    | {readonly kind: 'solids'; readonly operation: 'set-plane'; readonly normal: readonly [number, number, number]; readonly offset?: number}
    | {readonly kind: 'solids'; readonly operation: 'set-offset'; readonly offset: number}
    | {readonly kind: 'solids'; readonly operation: 'set-camera'; readonly view: CameraPresetName}
    /**
     * GrowthGraph's scene actions (RG1, RG3; the logarithm panel is for RG5). `set-map` picks the panel and the sequence kind. `set-params` sets the sequence fields
     * `a1`, `d`, `q` (stored integer, the ratio times 10) and `n`; `set-interest` the capital, the rate (stored integer, twice the percent), the years and the parts per
     * year. The merged state must pass `parseGrowthState` before the first write, otherwise the action throws and nothing is written; unknown fields are refused.
     */
    | {readonly kind: 'recursion'; readonly operation: 'set-map'; readonly panel?: 'sequence' | 'interest' | 'log'; readonly sequence?: 'arithmetic' | 'geometric'}
    | {readonly kind: 'recursion'; readonly operation: 'set-params'; readonly a1?: number; readonly d?: number; readonly q?: number; readonly n?: number}
    | {
        readonly kind: 'recursion'; readonly operation: 'set-interest';
        readonly capital?: number; readonly rate?: number; readonly years?: number; readonly parts?: number;
    }
    /**
     * SimsonLineGraph's scene actions (the glider angle is the `parameter` action named `t`, in degrees; the overlays are `point-set`
     * `set-overlay`). `load-example` is the example button; `set-offset` is the offset slider and takes only a member of `SIMSON_OFFSETS`.
     * Scene data is strict: another offset or example id is a lesson-content error, never snapped.
     */
    | {readonly kind: 'simson'; readonly operation: 'load-example'; readonly exampleId: SimsonExampleId}
    | {readonly kind: 'simson'; readonly operation: 'set-offset'; readonly epsilon: SimsonOffset}
    /**
     * InversionGraph's scene actions (the overlays are `point-set` `set-overlay`; the centre C is the `point-set` vertex). `load-example` is the
     * example button, `set-focus` the focus switch, `set-x` the point X (whole-number coordinates) and `set-theta` the secant direction in degrees.
     * Scene data is strict: an unknown example or focus, a non-grid X or a non-finite angle is a lesson-content error, never snapped.
     */
    | {readonly kind: 'inversion'; readonly operation: 'load-example'; readonly exampleId: InversionExampleId}
    | {readonly kind: 'inversion'; readonly operation: 'set-focus'; readonly focus: InversionFocus}
    | {readonly kind: 'inversion'; readonly operation: 'set-x'; readonly point: {readonly x: number; readonly y: number}}
    | {readonly kind: 'inversion'; readonly operation: 'set-theta'; readonly degrees: number}
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
    /** CurveCombGraph's curve: replaces the scene with that curve's default (the cubic of L2, or the C1, C2 or G1 spline route's default points). The comb state is kept. */
    | {readonly kind: 'comb-curve'; readonly curve: 'cubic' | 'c1' | 'c2' | 'g1'}
    /** CurveCombGraph's tooth length gain (a positive number within COMB_GAIN_MIN..MAX). */
    | {readonly kind: 'comb-gain'; readonly value: number}
    /** CurveCombGraph's tooth count (an integer within COMB_MIN_COUNT..COMB_MAX_COUNT). */
    | {readonly kind: 'comb-count'; readonly value: number}
    /** CurveOffsetGraph's curve: replaces the scene with the default of that kind (the parabola, or the cubic PH curve). The offset state is kept. */
    | {readonly kind: 'offset-curve'; readonly curve: 'bezier' | 'ph'}
    /** CurveOffsetGraph's signed offset distance d (within OFFSET_DISTANCE_MIN..MAX). */
    | {readonly kind: 'offset-distance'; readonly value: number}
    /** CurveOffsetGraph's sample count of the sampled offset (an integer within OFFSET_SAMPLES_MIN..MAX). */
    | {readonly kind: 'offset-samples'; readonly value: number}
    /** CurveEnvelopeGraph's parameter t of the highlighted line and its touching point (a number within 0..1). */
    | {readonly kind: 'envelope-t'; readonly value: number}
    /** CurveEnvelopeGraph's number of de Casteljau lines (an integer within 1..200). */
    | {readonly kind: 'envelope-lines'; readonly value: number}
    /** DegreeReductionGraph's mode: end points kept (`fixed`) or free (L2-best quadratic in both). The visibility targets `reduction-quadratic` (the reduced curve and its control points) and `reduction-elevation` (its elevated net) belong to this graph only. */
    | {readonly kind: 'reduction-mode'; readonly mode: 'fixed' | 'free'}
    /** DegreeReductionGraph's four cubic control points, set together (exactly four finite pairs). */
    | {readonly kind: 'reduction-points'; readonly points: readonly (readonly [number, number])[]}
    /** ArcLengthParametrizationGraph's curve: replaces the scene with the default of that kind (the cubic Q, or the PH cubic). The arc state is kept. The visibility targets `arc-equal-t` (equal steps in t), `arc-equal-arc` (equal arcs) and `arc-speed-plot` belong to this graph only. */
    | {readonly kind: 'arc-curve'; readonly curve: 'bezier' | 'ph'}
    /** ArcLengthParametrizationGraph's number of pieces N (an integer within 2..64). */
    | {readonly kind: 'arc-pieces'; readonly value: number}
    /** ArcLengthParametrizationGraph's mover: the position is a fraction of the parameter or of the length L. */
    | {readonly kind: 'arc-mover-mode'; readonly mode: 'parameter' | 'arc'}
    /** ArcLengthParametrizationGraph's mover position (a number within 0..1). */
    | {readonly kind: 'arc-mover-position'; readonly value: number}
    /** ArcLengthParametrizationGraph's playback of the mover. */
    | {readonly kind: 'arc-play'}
    | {readonly kind: 'arc-pause'}
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
     * ParametricCurveGraph only: shows a catalogue curve (the parameter returns to the start of its domain) and, for the
     * cycloid, the radius of the rolling circle. The parameter itself is the `parameter` action named `t`.
     */
    | {readonly kind: 'parametric-curve'; readonly curve: ParametricCurveId; readonly radius?: number}
    /**
     * InterpolationGraph only (Lagrange versus Bezier, lesson I1): `set-rule` picks the parameter rule, `set-overlay` shows or hides the
     * convex hull, the Bezier curve or the basis plot, and `add-point` appends a point like the Add button, or exactly at `x`, `y` when
     * both are given (a refused add, including one at the point maximum, throws a `DomainError`: a refused authored action is a content defect). The shared position s is the `parameter` action named `t`, a number from 0 to 1.
     */
    | {readonly kind: 'interpolation'; readonly operation: 'set-rule'; readonly rule: 'uniform' | 'chord'}
    | {readonly kind: 'interpolation'; readonly operation: 'set-overlay'; readonly overlay: 'hull' | 'bezier' | 'basis'; readonly visible: boolean}
    | {readonly kind: 'interpolation'; readonly operation: 'add-point'; readonly x?: number; readonly y?: number}
    /**
     * HermiteGraph only (Hermite and Catmull-Rom, lesson I3): `set-mode` picks the mode (switching to Hermite copies the current
     * Catmull-Rom tangents), `set-rule` the parameter rule, `set-tension` the Catmull-Rom tension (0 to 2; ignored in Hermite mode),
     * `set-overlay` shows or hides the tangent arrows or the Bezier control polygons, and `add-point` appends a point like the Add button, or exactly at `x`, `y` when both are given.
     */
    | {readonly kind: 'hermite'; readonly operation: 'set-mode'; readonly mode: 'catmull-rom' | 'hermite'}
    | {readonly kind: 'hermite'; readonly operation: 'set-rule'; readonly rule: 'uniform' | 'chord'}
    | {readonly kind: 'hermite'; readonly operation: 'set-tension'; readonly value: number}
    | {readonly kind: 'hermite'; readonly operation: 'set-overlay'; readonly overlay: 'tangents' | 'bezier'; readonly visible: boolean}
    | {readonly kind: 'hermite'; readonly operation: 'add-point'; readonly x?: number; readonly y?: number}
    /**
     * RungeInterpolationGraph only (Runge's phenomenon, lesson I2): `set-function` picks the function of the closed list, `set-degree`
     * the degree n (a whole number from 1 to 40, so n + 1 nodes), `set-rule` the node rule, and `set-overlay` shows or hides the error
     * curve or the semicircle (drawn only with Chebyshev nodes). Invalid values are refused with a message, never clamped.
     */
    | {readonly kind: 'runge'; readonly operation: 'set-function'; readonly function: 'runge' | 'abs' | 'sine'}
    | {readonly kind: 'runge'; readonly operation: 'set-degree'; readonly value: number}
    | {readonly kind: 'runge'; readonly operation: 'set-rule'; readonly rule: 'equispaced' | 'chebyshev'}
    | {readonly kind: 'runge'; readonly operation: 'set-overlay'; readonly overlay: 'error' | 'semicircle'; readonly visible: boolean}
    /**
     * LeastSquaresGraph only (least squares, lesson I4): `set-point` puts data point `index` (0-based) at (x, y), `set-degree` picks the
     * fit's degree (a whole number from 1 to min(points - 1, 5)), `set-mode` switches between the best fit and the manual line,
     * `set-line` writes the manual line y = intercept + slope x (kept while the best fit is shown), and `set-overlay` shows or hides the
     * squares of the residuals or the normal equations. Invalid values are refused with a message, never clamped.
     */
    | {readonly kind: 'lsq'; readonly operation: 'set-point'; readonly index: number; readonly x: number; readonly y: number}
    | {readonly kind: 'lsq'; readonly operation: 'set-degree'; readonly value: number}
    | {readonly kind: 'lsq'; readonly operation: 'set-mode'; readonly mode: 'best' | 'manual'}
    | {readonly kind: 'lsq'; readonly operation: 'set-line'; readonly slope: number; readonly intercept: number}
    | {readonly kind: 'lsq'; readonly operation: 'set-overlay'; readonly overlay: 'squares' | 'normal-equations'; readonly visible: boolean}
    /**
     * SummaryStatisticsGraph only (summary statistics, lesson P4): `set-value` moves value `index` (0-based, in the user's order) to
     * `value`, `add-value` appends a value (at `value`, or at the median when it is left out) and `remove-value` removes value `index`.
     * Values are snapped to tenths; a value outside 0..40, a bad index, a 16th value or removing the last value is refused with a
     * message, never clamped. A value outside the visible range refits the view. The example, quartile rule and sigma kind are the
     * function choices `summary-example`, `summary-rule` and `summary-sigma`; the box plot and the sigma band are the function
     * visibility targets `summary-box-plot` and `summary-sigma-band`.
     */
    | {readonly kind: 'summary'; readonly operation: 'set-value'; readonly index: number; readonly value: number}
    | {readonly kind: 'summary'; readonly operation: 'add-value'; readonly value?: number}
    | {readonly kind: 'summary'; readonly operation: 'remove-value'; readonly index: number}
    /**
     * CorrelationGraph only (correlation, lesson P5): `set-point` moves point `index` (0-based, in the user's order) to (`x`, `y`),
     * `add-point` appends a point one step right of the last one (or at `x`, `y` when both are given, snapped like `set-point`) and `remove-point` removes point `index`. Coordinates are snapped to
     * tenths; a coordinate outside the I4 limit, a bad index, a 21st point or removing below two points is refused with a message,
     * never clamped. A point outside the visible view refits it. The example is the function choice `correlation-example`; the
     * residual segments and the x-on-y line are the function visibility targets `correlation-residuals` and `correlation-x-on-y`.
     */
    | {readonly kind: 'correlation'; readonly operation: 'set-point'; readonly index: number; readonly x: number; readonly y: number}
    | {readonly kind: 'correlation'; readonly operation: 'add-point'; readonly x?: number; readonly y?: number}
    | {readonly kind: 'correlation'; readonly operation: 'remove-point'; readonly index: number}
    /**
     * CoonsPatchGraph only (Coons patch, lesson D4): `set-shown` picks the surface the mesh shows (`lc`, `ld`, `b` or the blend `s`),
     * `set-linked-corners` turns corner sharing on (the corner pairs snap to their average) or off, and `move-point` puts control
     * point `index` (0 to 3) of the boundary `name` (`c0`, `c1`, `d0`, `d1`) at `xyz`, like a drag; with linked corners the other end point
     * of a corner moves with it.
     */
    | {readonly kind: 'coons'; readonly operation: 'set-shown'; readonly shown: 'lc' | 'ld' | 'b' | 's'}
    | {readonly kind: 'coons'; readonly operation: 'set-linked-corners'; readonly linked: boolean}
    | {readonly kind: 'coons'; readonly operation: 'move-point'; readonly name: 'c0' | 'c1' | 'd0' | 'd1'; readonly index: number; readonly xyz: readonly [number, number, number]}
    /**
     * SubdivisionCurveGraph only (Chaikin and four-point subdivision, lesson I5): `set-rule` picks the rule (it returns to round 0),
     * `set-closed` opens or closes the polygon (closing needs 3 points) and `set-overlay` shows or hides the Chaikin limit curve.
     * Each pauses playback; the rounds themselves are the `animation` actions of the id `interp-subdivision-rounds`.
     */
    | {readonly kind: 'subdivision'; readonly operation: 'set-rule'; readonly rule: 'chaikin' | 'four-point'}
    | {readonly kind: 'subdivision'; readonly operation: 'set-closed'; readonly closed: boolean}
    | {readonly kind: 'subdivision'; readonly operation: 'set-overlay'; readonly overlay: 'limit'; readonly visible: boolean}
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
    /** Self-check text shown in a closed disclosure on observation frames. */
    readonly expectedObservations?: readonly LocalizedText[];
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
    /** Guided lessons may widen the view after an un-authored default 2D scene is prepared. */
    adjustGuidedLessonView?(cardWidth: number): void;
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
