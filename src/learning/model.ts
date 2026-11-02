import type {DemonstrationId} from '../demonstrations';
import type {HullAlgorithm} from '../graphs/compgeo/hullTraceRun';
import type {CrossRatioExampleId} from '../graphs/projective/crossRatioModel';
import type {SimsonExampleId, SimsonOffset} from '../compgeo/simsonLineModel';
import type {InversionExampleId} from '../compgeo/inversionModel';
import type {InversionFocus} from '../graphs/compgeo/inversionPresetCollection';
import type {PascalConicId, PascalExampleId, PascalOrderId} from '../graphs/projective/pascalModel';
import type {PolePolarConicId, PolePolarExampleId} from '../graphs/projective/polePolarModel';
import type {ParametricCurveId} from '../graphs/curves/parametric/parametricCatalogue';
import {BISECTION_EXAMPLE_IDS} from '../analysis/bisection';
import {ROOT_FINDING_EXAMPLE_IDS} from '../analysis/rootFinding';
import {ROOT_FINDING_METHODS} from '../analysis/rootFindingModel';
import {QUADRATURE_RULES} from '../analysis/quadratureModel';
import {TRANSFORM_BASE_IDS} from '../analysis/functionTransformationModel';
import {INVERSE_RESTRICTION_IDS} from '../analysis/functionInverseModel';
import {FOURIER_SERIES_EXAMPLE_IDS} from '../analysis/fourierSeriesModel';
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
export const FUNCTION_PARAMETER_NAMES = ['x1', 'y1', 'x2', 'y2', 'k', 'n', 'a', 'A', 'omega', 'phi', 'B', 'x0', 'h', 'b', 'bisect-a', 'bisect-b', 'mvt-a', 'mvt-b', 'mvt-c', 'accum-a', 'accum-x', 'darboux-a', 'darboux-b', 'darboux-n', 'extrema-a', 'extrema-b', 'convexity-a', 'convexity-b', 'convexity-t', 'taylor-center', 'taylor-degree', 'taylor-x', 'sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'fixed-point-x0', 'fixed-point-digits', 'root-x0', 'root-x1', 'quadrature-a', 'quadrature-b', 'quadrature-n', 'transform-a', 'transform-b', 'transform-c', 'transform-d', 'transform-u', 'inverse-base', 'inverse-x0', 'fourier-n', 'fourier-x', 'fourier-epsilon', 'uniform-r', 'uniform-n', 'uniform-x', 'uniform-epsilon', 'complex-z-re', 'complex-z-im', 'complex-w-re', 'complex-w-im', 'complex-w-modulus', 'complex-w-argument', 'complex-centre-re', 'complex-centre-im', 'complex-radius'] as const;
export type FunctionParameterName = typeof FUNCTION_PARAMETER_NAMES[number];

/** Closed set of optional function-demonstration elements a lesson can show or hide. */
export const FUNCTION_VISIBILITY_TARGETS = ['mirror', 'reference', 'tangent', 'matching-points', 'accumulation-curve', 'lower-sum', 'upper-sum', 'extrema-classification', 'second-derivative', 'taylor-bound', 'sequence-certificate', 'fixed-point-bound', 'uniform-supremum', 'complex-product', 'complex-arguments', 'complex-reciprocal', 'complex-quotient', 'complex-circle', 'complex-roots', 'complex-polygon', 'complex-test', 'inverse-curve'] as const;
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
    'transform-base': TRANSFORM_BASE_IDS,
    'inverse-restriction': INVERSE_RESTRICTION_IDS,
    'fourier-example': FOURIER_SERIES_EXAMPLE_IDS,
    'uniform-example': UNIFORM_EXAMPLE_IDS,
    'complex-example': COMPLEX_EXAMPLE_IDS,
    'complex-reciprocal-example': COMPLEX_RECIPROCAL_EXAMPLE_IDS,
    'complex-roots-example': COMPLEX_ROOTS_EXAMPLE_IDS,
} satisfies Record<string, readonly string[]>;
export type FunctionChoiceName = keyof typeof functionChoiceValues;
export const FUNCTION_CHOICE_VALUES: Readonly<Record<FunctionChoiceName, readonly string[]>> = functionChoiceValues;
export const FUNCTION_CHOICE_NAMES = Object.keys(functionChoiceValues) as FunctionChoiceName[];

/** The curve overlays a lesson can show or hide on a curve demonstration. `curvature-frame` (T and N) and `curvature-circle` (the osculating circle or line) belong to CurvatureBezierCurveGraph only. */
export const CURVE_VISIBILITY_TARGETS = ['control-polygon', 'convex-hull', 'decasteljau-scheme', 'decasteljau-full-curve', 'ph-control-polygon', 'offset-curve', 'weights', 'curvature-frame', 'curvature-circle'] as const;
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
export const LESSON_ANIMATION_IDS = ['decasteljau', 'bisection', 'sequence', 'fixed-point', 'root-finding', 'patch-u-sweep', 'patch-v-sweep', 'algorithm-trace', 'parametric-roll', 'interp-subdivision-rounds', 'deboor'] as const;
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
    /** BernsteinGraph's graph-owned degree action (an integer; BERNSTEIN_MAX_DEGREE bounds it). */
    | {readonly kind: 'bernstein-degree'; readonly degree: number}
    /** BernsteinGraph's graph-owned stacked-area view. */
    | {readonly kind: 'bernstein-stacked-area'; readonly visible: boolean}
    /**
     * LinearMapGraph's scene actions (validated by `validateSet*` in `src/linear/linearMapModel.ts`). Kinds are typed; the graph still
     * enforces the domain (grid, ranges): scene data is strict, so an off-grid entry is a lesson-content error, never snapped.
     */
    | {readonly kind: 'linear-map'; readonly operation: 'set-matrix'; readonly matrix: Mat2; readonly target?: MatrixSlot}
    | {readonly kind: 'linear-map'; readonly operation: 'set-mode'; readonly mode: LinearMapMode}
    | {readonly kind: 'linear-map'; readonly operation: 'set-test-vector'; readonly angle: number}
    | {readonly kind: 'linear-map'; readonly operation: 'set-example'; readonly exampleId: LinearMapExampleId}
    /**
     * PointSetGraph's scene actions. `set-points` replaces the model (grid step 0); scene data is strict, so an off-grid,
     * out-of-range or over-limit point is a lesson-content error and never snapped. `set-overlay` accepts only the
     * overlays the target graph owns.
     */
    | {readonly kind: 'point-set'; readonly operation: 'set-points'; readonly points: readonly LessonPoint[]; readonly mode: 'points' | 'polygon' | 'segments' | 'intervals'; readonly closed?: boolean}
    | {readonly kind: 'point-set'; readonly operation: 'set-overlay'; readonly overlay: PointSetOverlayName; readonly visible: boolean}
    /** HullTraceGraph only (any other point-set graph throws `UnsupportedLessonActionError`): picks the algorithm, returns to step 0 and pauses. */
    | {readonly kind: 'point-set'; readonly operation: 'set-algorithm'; readonly algorithm: HullAlgorithm}
    /** EarClippingGraph only (any other point-set graph throws `UnsupportedLessonActionError`): pauses playback and sets the trace step; a number is clamped like a stored Preset step and `'end'` is the last step. */
    | {readonly kind: 'point-set'; readonly operation: 'set-trace-step'; readonly step: number | 'end'}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): replaces the triangulation of the current points with `triangles` (counter-clockwise vertex index triples), checked like a stored Preset's list. An invalid list (wrong indices, overlap, gaps, not a triangulation) is a lesson-content error and is never repaired. */
    | {readonly kind: 'point-set'; readonly operation: 'set-triangulation'; readonly triangles: readonly (readonly [number, number, number])[]}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): the flip button on the edge between two points (selects it, then flips). A pair that is not an edge, or a refused flip, is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'flip-edge'; readonly edge: readonly [number, number]}
    /** TriangulationGraph and DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): highlights an edge without flipping; `null` clears the selection. A pair that is not an edge is a lesson-content error. */
    | {readonly kind: 'point-set'; readonly operation: 'select-edge'; readonly edge: readonly [number, number] | null}
    /** DelaunayGraph only (any other point-set graph throws `UnsupportedLessonActionError`): selects the triangle at `triangle`, an index into the triangulation shown at the current trace step (the board click or panel list entry); `null` clears the selection. A non-integer or out-of-range index is a lesson-content error. Any later change of the trace step clears the selection. */
    | {readonly kind: 'point-set'; readonly operation: 'select-triangle'; readonly triangle: number | null}
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
     * convex hull, the Bezier curve or the basis plot, and `add-point` appends a point like the Add button (a refusal, such as at the
     * point maximum, changes nothing). The shared position s is the `parameter` action named `t`, a number from 0 to 1.
     */
    | {readonly kind: 'interpolation'; readonly operation: 'set-rule'; readonly rule: 'uniform' | 'chord'}
    | {readonly kind: 'interpolation'; readonly operation: 'set-overlay'; readonly overlay: 'hull' | 'bezier' | 'basis'; readonly visible: boolean}
    | {readonly kind: 'interpolation'; readonly operation: 'add-point'}
    /**
     * HermiteGraph only (Hermite and Catmull-Rom, lesson I3): `set-mode` picks the mode (switching to Hermite copies the current
     * Catmull-Rom tangents), `set-rule` the parameter rule, `set-tension` the Catmull-Rom tension (0 to 2; ignored in Hermite mode),
     * `set-overlay` shows or hides the tangent arrows or the Bezier control polygons, and `add-point` appends a point like the Add button.
     */
    | {readonly kind: 'hermite'; readonly operation: 'set-mode'; readonly mode: 'catmull-rom' | 'hermite'}
    | {readonly kind: 'hermite'; readonly operation: 'set-rule'; readonly rule: 'uniform' | 'chord'}
    | {readonly kind: 'hermite'; readonly operation: 'set-tension'; readonly value: number}
    | {readonly kind: 'hermite'; readonly operation: 'set-overlay'; readonly overlay: 'tangents' | 'bezier'; readonly visible: boolean}
    | {readonly kind: 'hermite'; readonly operation: 'add-point'}
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
