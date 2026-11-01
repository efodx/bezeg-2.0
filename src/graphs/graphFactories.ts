import {OrientationGraph} from './compgeo/OrientationGraph';
import {PolygonAreaGraph} from './compgeo/PolygonAreaGraph';
import {HullTraceGraph} from './compgeo/HullTraceGraph';
import {EarClippingGraph} from './compgeo/EarClippingGraph';
import {IntervalSweepGraph} from './compgeo/IntervalSweepGraph';
import {BentleyOttmannGraph} from './compgeo/BentleyOttmannGraph';
import { BernsteinGraph } from './bernstein/BernsteinGraph';
import { ComplexMultiplicationGraph } from './complex/ComplexMultiplicationGraph';
import BezierCurveGraph from './curves/bezier/BezierCurveGraph';
import DecasteljauGraph from './curves/bezier/DecasteljauGraph';
import DecasteljauGraph2 from './curves/bezier/DecasteljauGraph2';
import AffineTransformBezierCurveGraph from './curves/bezier/AffineTransformsBezierCurveGraph';
import DecasteljauGraph3 from './curves/bezier/SubdivisionGraph1';
import ExtrapolationGraph from './curves/bezier/ExtrapolationGraph';
import ElevationGraph from './curves/bezier/ElevationGraph';
import UniformParamBezierCurveGraph from './curves/parametrisations/UniformParamBezierCurveGraph';
import AlphaParamBezierCurveGraph from './curves/parametrisations/AlphaParamBezierCurveGraph';
import QuinticPhBezierCurve from './curves/ph/QuinticPhBezierCurveGraph';
import CubicPhBezierCurveGraph from './curves/ph/CubicPhBezierCurveGraph';
import G1SymmetricSplineGraph from './curves/spline/G1SymmetricSplineGraph';
import G1SplineGraph from './curves/spline/G1SplineGraph';
import C2SplineGraph from './curves/spline/C2SplineGraph';
import C1SplineGraph from './curves/spline/C1SplineGraph';
import RationalBezierCurveCircleGraphN from './curves/rational/RationalBezierCurveCircleGraphN';
import FarinPointsCurveGraph from './curves/rational/FarinPointsCurveGraph';
import RationalExtrapolationGraph from './curves/rational/RationalExtrapolationGraph';
import RationalElevationGraph from './curves/rational/RationalElevationGraph';
import RationalDecasteljauGraph from './curves/rational/RationalDecasteljauGraph';
import SubdivisionGraph from './curves/bezier/SubdivisionGraph';
import CnSplineGraph from './curves/spline/CnSplineGraph';
import SplineAlphaParametrizationGraph from './curves/parametrisations/SplineAlphaParametrizationGraph';
import TensorDeCasteljauGraph from './patches/TensorDeCasteljauGraph';
import TensorDerivativesGraph from './patches/TensorDerivativesGraph';
import TensorSubdivisionGraph from './patches/TensorSubdivisionGraph';
import TensorJoinGraph from './patches/TensorJoinGraph';
import TensorPatchGraph from './patches/TensorPatchGraph';
import TriangularPatchGraph from './patches/TriangularPatchGraph';
import { LinearFunctionGraph } from './functions/LinearFunctionGraph';
import { ExponentialFunctionGraph } from './functions/ExponentialFunctionGraph';
import { TrigonometricFunctionsGraph } from './functions/TrigonometricFunctionsGraph';
import { ContinuityGraph } from './functions/ContinuityGraph';
import { DerivativeGraph } from './functions/DerivativeGraph';
import { DefiniteIntegralGraph } from './functions/DefiniteIntegralGraph';
import { AreaBetweenCurvesGraph } from './functions/AreaBetweenCurvesGraph';
import { ArcLengthGraph } from './functions/ArcLengthGraph';
import { BisectionGraph } from './functions/BisectionGraph';
import { MeanValueGraph } from './functions/MeanValueGraph';
import { AccumulationGraph } from './functions/AccumulationGraph';
import { DarbouxGraph } from './functions/DarbouxGraph';
import { ExtremaGraph } from './functions/ExtremaGraph';
import { ConvexityGraph } from './functions/ConvexityGraph';
import { TaylorGraph } from './functions/TaylorGraph';
import { SequenceGraph } from './functions/SequenceGraph';
import { UniformConvergenceGraph } from './functions/UniformConvergenceGraph';
import { ComplexReciprocalGraph } from './complex/ComplexReciprocalGraph';
import { ComplexRootsGraph } from './complex/ComplexRootsGraph';
import { NotablePointsGraph } from './compgeo/NotablePointsGraph';
import { InscribedAngleGraph } from './compgeo/InscribedAngleGraph';
import { LinearMapGraph } from './linear/LinearMapGraph';
import { FixedPointGraph } from './functions/FixedPointGraph';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import RationalSubdivisionGraph2 from './curves/rational/RationalSubdivisionGraph2';
import RationalBezierCurveGraph from './curves/rational/RationalBezierCurveGraph';
import ParametricCurveGraph from './curves/parametric/ParametricCurveGraph';
import CurvatureBezierCurveGraph from './curves/bezier/CurvatureBezierCurveGraph';
import InterpolationGraph from './curves/interpolation/InterpolationGraph';
import HermiteGraph from './curves/hermite/HermiteGraph';
import SubdivisionCurveGraph from './curves/subdivisionCurves/SubdivisionCurveGraph';
import CoonsPatchGraph from './patches/CoonsPatchGraph';
import type {DemonstrationId} from '../demonstrations';

/** Executable graph constructors live behind graph-route lazy imports. */
export const graphFactories: Record<DemonstrationId, () => BaseGraph<BaseGraphState>> = {
    'bernstein': () => new BernsteinGraph(),
    'patch-tensor': () => new TensorPatchGraph(),
    'patch-decasteljau': () => new TensorDeCasteljauGraph(),
    'patch-derivatives': () => new TensorDerivativesGraph(),
    'patch-subdivision': () => new TensorSubdivisionGraph(),
    'patch-joins': () => new TensorJoinGraph(),
    'patch-triangular': () => new TriangularPatchGraph(),
    'complex-multiplication': () => new ComplexMultiplicationGraph(),
    'bezier': () => new BezierCurveGraph(),
    'decasteljau': () => new DecasteljauGraph(),
    'decasteljau-alternative': () => new DecasteljauGraph2(),
    'affine': () => new AffineTransformBezierCurveGraph(),
    'subdivision': () => new DecasteljauGraph3(),
    'repeated-subdivision': () => new SubdivisionGraph(),
    'extrapolation': () => new ExtrapolationGraph(),
    'elevation': () => new ElevationGraph(),
    'rational': () => new RationalBezierCurveGraph(),
    'rational-decasteljau': () => new RationalDecasteljauGraph(),
    'rational-elevation': () => new RationalElevationGraph(),
    'rational-extrapolation': () => new RationalExtrapolationGraph(),
    'rational-subdivision': () => new RationalSubdivisionGraph2(),
    'farin': () => new FarinPointsCurveGraph(),
    'circle': () => new RationalBezierCurveCircleGraphN(),
    'spline-cn': () => new CnSplineGraph(),
    'spline-c1': () => new C1SplineGraph(),
    'spline-c2': () => new C2SplineGraph(),
    'spline-g1': () => new G1SplineGraph(),
    'spline-g1-symmetric': () => new G1SymmetricSplineGraph(),
    'ph-cubic': () => new CubicPhBezierCurveGraph(),
    'ph-quintic': () => new QuinticPhBezierCurve(),
    'spline-parameterization': () => new SplineAlphaParametrizationGraph(),
    'weighted-parameterization': () => new AlphaParamBezierCurveGraph(),
    'uniform-parameterization': () => new UniformParamBezierCurveGraph(),
    'curve-parametric': () => new ParametricCurveGraph(),
    'curve-curvature': () => new CurvatureBezierCurveGraph(),
    'interp-lagrange': () => new InterpolationGraph(),
    'interp-hermite': () => new HermiteGraph(),
    'interp-subdivision': () => new SubdivisionCurveGraph(),
    'patch-coons': () => new CoonsPatchGraph(),
    'linear-function': () => new LinearFunctionGraph(),
    'exponential-function': () => new ExponentialFunctionGraph(),
    'trigonometric-functions': () => new TrigonometricFunctionsGraph(),
    'continuity': () => new ContinuityGraph(),
    'derivative': () => new DerivativeGraph(),
    'definite-integral': () => new DefiniteIntegralGraph(),
    'area-between-curves': () => new AreaBetweenCurvesGraph(),
    'arc-length': () => new ArcLengthGraph(),
    'bisection': () => new BisectionGraph(),
    'mean-value': () => new MeanValueGraph(),
    'accumulation': () => new AccumulationGraph(),
    'darboux': () => new DarbouxGraph(),
    'extrema': () => new ExtremaGraph(),
    'convexity': () => new ConvexityGraph(),
    'taylor': () => new TaylorGraph(),
    'sequence': () => new SequenceGraph(),
    'uniform-convergence': () => new UniformConvergenceGraph(),
    'fixed-point': () => new FixedPointGraph(),
    'linear-map': () => new LinearMapGraph(),
    'complex-reciprocal': () => new ComplexReciprocalGraph(),
    'complex-roots': () => new ComplexRootsGraph(),
    'triangle-centres': () => new NotablePointsGraph(),
    'inscribed-angle': () => new InscribedAngleGraph(),
    'orientation': () => new OrientationGraph(),
    'polygon-area': () => new PolygonAreaGraph(),
    'convex-hull': () => new HullTraceGraph(),
    'ear-clipping': () => new EarClippingGraph(),
    'interval-sweep': () => new IntervalSweepGraph(),
    'segment-intersections': () => new BentleyOttmannGraph(),
};
