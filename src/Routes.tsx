import { ErrorPage } from './ErrorPage';
import App from './App';
import { WelcomePage } from './WelcomePage';
import { DemonstrationsPage } from './DemonstrationsPage';
import { BernsteinGraph } from './graphs/bernstein/BernsteinGraph';
import { ComplexMultiplicationGraph } from './graphs/complex/ComplexMultiplicationGraph';
import BezierCurveGraph from './graphs/curves/bezier/BezierCurveGraph';
import DecasteljauGraph from './graphs/curves/bezier/DecasteljauGraph';
import DecasteljauGraph2 from './graphs/curves/bezier/DecasteljauGraph2';
import AffineTransformBezierCurveGraph
  from './graphs/curves/bezier/AffineTransformsBezierCurveGraph';
import DecasteljauGraph3 from './graphs/curves/bezier/SubdivisionGraph1';
import ExtrapolationGraph from './graphs/curves/bezier/ExtrapolationGraph';
import ElevationGraph from './graphs/curves/bezier/ElevationGraph';
import UniformParamBezierCurveGraph
  from './graphs/curves/parametrisations/UniformParamBezierCurveGraph';
import AlphaParamBezierCurveGraph
  from './graphs/curves/parametrisations/AlphaParamBezierCurveGraph';
import QuinticPhBezierCurve from './graphs/curves/ph/QuinticPhBezierCurveGraph';
import CubicPhBezierCurveGraph from './graphs/curves/ph/CubicPhBezierCurveGraph';
import G1SymmetricSplineGraph
  from './graphs/curves/spline/G1SymmetricSplineGraph';
import G1SplineGraph from './graphs/curves/spline/G1SplineGraph';
import C2SplineGraph from './graphs/curves/spline/C2SplineGraph';
import C1SplineGraph from './graphs/curves/spline/C1SplineGraph';
import RationalBezierCurveCircleGraphN
  from './graphs/curves/rational/RationalBezierCurveCircleGraphN';
import FarinPointsCurveGraph
  from './graphs/curves/rational/FarinPointsCurveGraph';
import RationalExtrapolationGraph
  from './graphs/curves/rational/RationalExtrapolationGraph';
import RationalElevationGraph
  from './graphs/curves/rational/RationalElevationGraph';
import RationalDecasteljauGraph
  from './graphs/curves/rational/RationalDecasteljauGraph';
import SubdivisionGraph from './graphs/curves/bezier/SubdivisionGraph';
import CnSplineGraph from './graphs/curves/spline/CnSplineGraph';
import SplineAlphaParametrizationGraph
  from './graphs/curves/parametrisations/SplineAlphaParametrizationGraph';
import { LinearFunctionGraph } from './graphs/functions/LinearFunctionGraph';
import { ExponentialFunctionGraph } from './graphs/functions/ExponentialFunctionGraph';
import { TrigonometricFunctionsGraph } from './graphs/functions/TrigonometricFunctionsGraph';
import { ContinuityGraph } from './graphs/functions/ContinuityGraph';
import { DerivativeGraph } from './graphs/functions/DerivativeGraph';
import { DefiniteIntegralGraph } from './graphs/functions/DefiniteIntegralGraph';
import { AreaBetweenCurvesGraph } from './graphs/functions/AreaBetweenCurvesGraph';
import { ArcLengthGraph } from './graphs/functions/ArcLengthGraph';
import { BisectionGraph } from './graphs/functions/BisectionGraph';
import { MeanValueGraph } from './graphs/functions/MeanValueGraph';
import { AccumulationGraph } from './graphs/functions/AccumulationGraph';
import { DarbouxGraph } from './graphs/functions/DarbouxGraph';
import { ExtremaGraph } from './graphs/functions/ExtremaGraph';
import { ConvexityGraph } from './graphs/functions/ConvexityGraph';
import { TaylorGraph } from './graphs/functions/TaylorGraph';
import { SequenceGraph } from './graphs/functions/SequenceGraph';
import { UniformConvergenceGraph } from './graphs/functions/UniformConvergenceGraph';
import { FixedPointGraph } from './graphs/functions/FixedPointGraph';
import { GraphHost } from './graphs/base/GraphHost';
import type BaseGraph from './graphs/base/BaseGraph';
import type { BaseGraphState } from './graphs/base/BaseGraph';
import RationalSubdivisionGraph2
  from './graphs/curves/rational/RationalSubdivisionGraph2';
import RationalBezierCurveGraph
  from './graphs/curves/rational/RationalBezierCurveGraph';

import React, {ReactNode} from 'react';
import {DemonstrationId, getDemonstrationCatalog} from './demonstrations';

// The routing adapter owns executable graphs; metadata owns identity and paths.
export const graphFactories: Record<DemonstrationId, () => BaseGraph<BaseGraphState>> = {
    'bernstein': () => new BernsteinGraph(),
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
};

const graphElements = Object.fromEntries(Object.entries(graphFactories).map(([id, create]) =>
    [id, <GraphHost key={id} create={create}/>])) as Record<DemonstrationId, ReactNode>;

const routes = [{
    path: '/bezeg-2.0', element: <App/>, errorElement: <ErrorPage/>,
    children: [
        {index: true, element: <WelcomePage/>},
        {path: '/bezeg-2.0/demonstrations', element: <DemonstrationsPage/>},
        ...getDemonstrationCatalog().demonstrations.map(({id, path}) => ({
            path, element: graphElements[id],
        })),
    ],
}];

export default routes;
