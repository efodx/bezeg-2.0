import {useLanguage} from "./localization";
import { ErrorPage } from './ErrorPage';
import App from './App';
import { WelcomePage } from './WelcomePage';
import { DemonstrationsPage } from './DemonstrationsPage';
import { BernsteinGraph } from './graphs/bernstein/BernsteinGraph';
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
import { GraphHost } from './graphs/base/GraphHost';
import { RefreshContext } from './graphs/context/react/RefreshContext';
import { useState } from 'react';
import RationalSubdivisionGraph2
  from './graphs/curves/rational/RationalSubdivisionGraph2';
import RationalBezierCurveGraph
  from './graphs/curves/rational/RationalBezierCurveGraph';

import React, {ReactNode} from 'react';
import {DemonstrationId, getDemonstrationCatalog} from './demonstrations';

// The routing adapter owns executable graphs; metadata owns identity and paths.
const graphElements: Record<DemonstrationId, ReactNode> = {
    'bernstein': <GraphHost key="bernstein" create={() => new BernsteinGraph()}/>,
    'bezier': <GraphHost key="bezier" create={() => new BezierCurveGraph()}/>,
    'decasteljau': <GraphHost key="decasteljau" create={() => new DecasteljauGraph()}/>,
    'decasteljau-alternative': <GraphHost key="decasteljau-alternative" create={() => new DecasteljauGraph2()}/>,
    'affine': <GraphHost key="affine" create={() => new AffineTransformBezierCurveGraph()}/>,
    'subdivision': <GraphHost key="subdivision" create={() => new DecasteljauGraph3()}/>,
    'repeated-subdivision': <GraphHost key="repeated-subdivision" create={() => new SubdivisionGraph()}/>,
    'extrapolation': <GraphHost key="extrapolation" create={() => new ExtrapolationGraph()}/>,
    'elevation': <GraphHost key="elevation" create={() => new ElevationGraph()}/>,
    'rational': <GraphHost key="rational" create={() => new RationalBezierCurveGraph()}/>,
    'rational-decasteljau': <GraphHost key="rational-decasteljau" create={() => new RationalDecasteljauGraph()}/>,
    'rational-elevation': <GraphHost key="rational-elevation" create={() => new RationalElevationGraph()}/>,
    'rational-extrapolation': <GraphHost key="rational-extrapolation" create={() => new RationalExtrapolationGraph()}/>,
    'rational-subdivision': <GraphHost key="rational-subdivision" create={() => new RationalSubdivisionGraph2()}/>,
    'farin': <GraphHost key="farin" create={() => new FarinPointsCurveGraph()}/>,
    'circle': <GraphHost key="circle" create={() => new RationalBezierCurveCircleGraphN()}/>,
    'spline-cn': <GraphHost key="spline-cn" create={() => new CnSplineGraph()}/>,
    'spline-c1': <GraphHost key="spline-c1" create={() => new C1SplineGraph()}/>,
    'spline-c2': <GraphHost key="spline-c2" create={() => new C2SplineGraph()}/>,
    'spline-g1': <GraphHost key="spline-g1" create={() => new G1SplineGraph()}/>,
    'spline-g1-symmetric': <GraphHost key="spline-g1-symmetric" create={() => new G1SymmetricSplineGraph()}/>,
    'ph-cubic': <GraphHost key="ph-cubic" create={() => new CubicPhBezierCurveGraph()}/>,
    'ph-quintic': <GraphHost key="ph-quintic" create={() => new QuinticPhBezierCurve()}/>,
    'spline-parameterization': <GraphHost key="spline-parameterization" create={() => new SplineAlphaParametrizationGraph()}/>,
    'weighted-parameterization': <GraphHost key="weighted-parameterization" create={() => new AlphaParamBezierCurveGraph()}/>,
    'uniform-parameterization': <GraphHost key="uniform-parameterization" create={() => new UniformParamBezierCurveGraph()}/>,
    'linear-function': <GraphHost key="linear-function" create={() => new LinearFunctionGraph()}/>,
    'exponential-function': <GraphHost key="exponential-function" create={() => new ExponentialFunctionGraph()}/>,
    'trigonometric-functions': <GraphHost key="trigonometric-functions" create={() => new TrigonometricFunctionsGraph()}/>,
    'continuity': <GraphHost key="continuity" create={() => new ContinuityGraph()}/>,
    'derivative': <GraphHost key="derivative" create={() => new DerivativeGraph()}/>,
    'definite-integral': <GraphHost key="definite-integral" create={() => new DefiniteIntegralGraph()}/>,
    'area-between-curves': <GraphHost key="area-between-curves" create={() => new AreaBetweenCurvesGraph()}/>,
    'arc-length': <GraphHost key="arc-length" create={() => new ArcLengthGraph()}/>,
};

function Refresher({children}: {children: ReactNode}) {
    useLanguage();
    const [key, setKey] = useState(1);
    return <RefreshContext.Provider value={() => {setKey(current => current + 1); return undefined;}}>
        <div key={key}>{children}</div>
    </RefreshContext.Provider>;
}

const routes = [{
    path: '/bezeg-2.0', element: <App/>, errorElement: <ErrorPage/>,
    children: [
        {index: true, element: <Refresher><WelcomePage/></Refresher>},
        {path: '/bezeg-2.0/demonstrations', element: <Refresher><DemonstrationsPage/></Refresher>},
        ...getDemonstrationCatalog().demonstrations.map(({id, path}) => ({
            path, element: <Refresher>{graphElements[id]}</Refresher>,
        })),
    ],
}];

export default routes;
